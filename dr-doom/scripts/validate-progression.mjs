import process from 'node:process';
import * as THREE from 'three';

import { LEVEL_MAP, TILE } from '../src/world/level.js';
import { BOSS_ARENA_LAYOUTS } from '../src/world/boss-arenas.js';
import { LEVEL1_OBJECTIVES, OBJ_TYPE } from '../src/world/objectives.js';
import { RansomwareKing, CascadeFailureTitanFull, TheAudit } from '../src/entities/bosses.js';
import { DAMAGE_TYPES } from '../src/entities/entity.js';

const errors = [];

function ensure(condition, message) {
  if (!condition) errors.push(message);
}

function addRectCells(target, rect) {
  for (let row = rect.minRow; row <= rect.maxRow; row++) {
    for (let col = rect.minCol; col <= rect.maxCol; col++) {
      target.add(`${col},${row}`);
    }
  }
}

function buildBaseWalkableCells() {
  const cells = new Set();
  for (let row = 0; row < LEVEL_MAP.length; row++) {
    for (let col = 0; col < LEVEL_MAP[row].length; col++) {
      if (LEVEL_MAP[row][col] === 0) {
        cells.add(`${col},${row}`);
      }
    }
  }
  return cells;
}

function cellFromWorld(position) {
  return {
    col: Math.floor(position.x / TILE),
    row: Math.floor(position.z / TILE),
  };
}

function hasPath(cells, from, to) {
  const start = `${from.col},${from.row}`;
  const goal = `${to.col},${to.row}`;
  if (!cells.has(start) || !cells.has(goal)) return false;

  const queue = [start];
  const visited = new Set(queue);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const key = queue.shift();
    if (key === goal) return true;
    const [col, row] = key.split(',').map(Number);
    dirs.forEach(([dc, dr]) => {
      const next = `${col + dc},${row + dr}`;
      if (!visited.has(next) && cells.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    });
  }
  return false;
}

function validateArenaReachability() {
  const spawn = { col: 5, row: 2 };

  Object.entries(BOSS_ARENA_LAYOUTS).forEach(([arenaId, layout]) => {
    const cells = buildBaseWalkableCells();
    addRectCells(cells, layout.corridor);
    addRectCells(cells, layout.room);

    const corridorAnchor = {
      col: layout.corridor.minCol,
      row: layout.corridor.minRow,
    };

    ensure(
      hasPath(cells, spawn, corridorAnchor),
      `${arenaId}: no path from spawn to the arena corridor.`,
    );

    ensure(
      hasPath(cells, spawn, layout.bossCell),
      `${arenaId}: no path from spawn to the boss arena interior.`,
    );

    const checkpointCell = cellFromWorld(layout.checkpoint);
    ensure(
      hasPath(cells, checkpointCell, layout.bossCell),
      `${arenaId}: checkpoint is not connected to the boss arena.`,
    );
  });

  // Explicitly validate the level edge openings that bridge into the appended arenas.
  ensure(LEVEL_MAP[5][27] === 0 && LEVEL_MAP[6][27] === 0, 'Ransomware King corridor is still sealed on the main map edge.');
  ensure(LEVEL_MAP[16][27] === 0 && LEVEL_MAP[17][27] === 0, 'Audit corridor is still sealed on the management wing edge.');
  ensure(
    LEVEL_MAP[30][13] === 0 && LEVEL_MAP[30][14] === 0 && LEVEL_MAP[31][13] === 0 && LEVEL_MAP[31][14] === 0,
    'Cascade Titan corridor is still sealed on the southern exit route.',
  );
}

function validateObjectives() {
  const exitObjective = LEVEL1_OBJECTIVES.find(objective => objective.id === 'obj-exit');
  ensure(!!exitObjective, 'Missing exit objective.');
  ensure(exitObjective?.type === OBJ_TYPE.ACTIVATE_CONSOLE, 'Exit objective must be tied to the exit console.');
  ensure(exitObjective?.consoleId === 'console-exit-gate', 'Exit objective must target console-exit-gate.');
  ensure(exitObjective?.requiresActiveAccess === true, 'Exit objective must require an active console access to prevent premature boss triggers.');

  const networkObjective = LEVEL1_OBJECTIVES.find(objective => objective.id === 'obj-restore-network');
  const coldAisleObjective = LEVEL1_OBJECTIVES.find(objective => objective.id === 'obj-check-env');
  const architectObjective = LEVEL1_OBJECTIVES.find(objective => objective.id === 'obj-architect-kb');
  ensure(networkObjective?.prereqs.includes('obj-check-hardened'), 'Network restore should follow the hardened repository pass.');
  ensure(coldAisleObjective?.prereqs.includes('obj-restore-network'), 'Cold aisle pass should follow the network restore.');
  ensure(architectObjective?.prereqs.includes('obj-check-env'), 'Management sync should follow the cold aisle pass.');
}

function validateBossKillability() {
  const rk = new RansomwareKing(new THREE.Vector3(0, 0, 0));
  const rkStartHealth = rk.health;
  rk.hitNode(0);
  rk.hitNode(1);
  rk.hitNode(2);
  ensure(rk.isVulnerable(), 'Ransomware King never becomes vulnerable after all nodes are hit.');
  rk.takeDamage(150, DAMAGE_TYPES.IMMUTABLE);
  ensure(rk.health < rkStartHealth, 'Ransomware King does not take damage during the vulnerability window.');

  const titan = new CascadeFailureTitanFull(new THREE.Vector3(0, 0, 0));
  const titanStartHealth = titan.health;
  titan.takeDamage(250, DAMAGE_TYPES.FAILOVER);
  ensure(titan.health < titanStartHealth, 'Cascade Titan does not take damage from intended heavy weapons.');
  for (let index = 0; index < 6 && !titan.isDead; index++) {
    titan.takeDamage(9999, DAMAGE_TYPES.FAILOVER);
  }
  ensure(titan.isDead, 'Cascade Titan cannot be reduced to zero health in the validator combat pass.');

  const audit = new TheAudit(new THREE.Vector3(0, 0, 0));
  audit.activate();
  while (!audit.auditComplete) {
    audit.completeCurrentTask();
  }
  ensure(audit.auditComplete && audit.isDead, 'The Audit cannot complete through the task sequence.');
}

validateArenaReachability();
validateObjectives();
validateBossKillability();

if (errors.length > 0) {
  console.error('Progression validation failed:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Progression validation passed.');
console.log('- boss arena openings are connected to the main map');
console.log('- checkpoint spawns route into their boss rooms');
console.log('- exit objective requires the live gate console interaction');
console.log('- all bosses can reach a terminal win/defeat state');
