import * as THREE from 'three';
import { buildSpriteSheet, BillboardSprite } from './sprites.js';
import { PickupManager } from './pickups.js';
import {
  CorruptionCrawler,
  RansomwareWraith,
  HardwareGremlin,
  NetworkPhantom,
  LatencyLeech,
  ConfigDriftSpecter,
  CascadeFailureTitan,
} from './enemies.js';
import { AI_STATE } from './entity.js';
import { EnemySounds } from '../audio/enemies.js';

const TILE = 4;

function pulseOverlay(steps) {
  const overlay = document.getElementById('damage-overlay');
  if (!overlay) return;

  steps.forEach(({ delay, background = '', boxShadow = '' }) => {
    setTimeout(() => {
      overlay.style.background = background;
      overlay.style.boxShadow = boxShadow;
    }, delay);
  });
}

// Spawn definitions scattered across all 6 rooms.
// `patrol` is an array of [col, row] waypoints. Enemies with ≥2 waypoints start
// in PATROL state and walk the loop at half-speed; they switch to CHASE on sight.
const SPAWN_DEFS = [
  // Main Server Floor — crawlers and wraiths
  { type: 'corruption_crawler', col: 4,  row: 4, encounter: 'server-floor',
    patrol: [[2,1],[6,5],[2,9],[6,9]] },
  { type: 'corruption_crawler', col: 8,  row: 7, encounter: 'server-floor',
    patrol: [[6,5],[11,1],[11,9],[6,9]] },
  { type: 'corruption_crawler', col: 10, row: 3, encounter: 'server-floor',
    patrol: [[11,1],[8,2],[8,5],[11,5]] },
  { type: 'ransomware_wraith',  col: 7,  row: 5, encounter: 'server-floor',
    patrol: [[6,2],[11,2],[11,8],[6,8],[2,5]] },
  { type: 'ransomware_wraith',  col: 3,  row: 9, encounter: 'server-floor',
    patrol: [[2,9],[2,5],[2,1],[6,1],[6,9]] },

  // Storage Vault — gremlins and leeches
  { type: 'hardware_gremlin',   col: 17, row: 4, encounter: 'storage-vault',
    patrol: [[15,2],[19,2],[19,8],[15,8]] },
  { type: 'hardware_gremlin',   col: 22, row: 7, encounter: 'storage-vault',
    patrol: [[22,2],[26,5],[22,9],[18,5]] },
  { type: 'latency_leech',      col: 19, row: 9, encounter: 'storage-vault',
    patrol: [[15,9],[15,5],[19,5],[23,9]] },
  { type: 'latency_leech',      col: 25, row: 3, encounter: 'storage-vault',
    patrol: [[26,1],[26,9],[22,5],[19,1]] },

  // Network Core — phantoms and specters
  { type: 'network_phantom',    col: 3,  row: 15, encounter: 'network-core',
    patrol: [[2,13],[2,19],[7,19],[7,13]] },
  { type: 'network_phantom',    col: 7,  row: 18, encounter: 'network-core',
    patrol: [[9,13],[9,20],[1,20],[1,14]] },
  { type: 'config_drift_specter', col: 5, row: 17, encounter: 'network-core',
    patrol: [[2,14],[5,14],[9,18],[5,20],[2,19]] },
  { type: 'config_drift_specter', col: 9, row: 14, encounter: 'network-core',
    patrol: [[10,13],[10,20],[4,20],[4,14],[1,17]] },

  // Cold Aisle — mixed
  { type: 'corruption_crawler', col: 14, row: 15, encounter: 'cold-aisle',
    patrol: [[14,13],[18,13],[18,19],[14,19]] },
  { type: 'ransomware_wraith',  col: 16, row: 18, encounter: 'cold-aisle',
    patrol: [[14,14],[18,14],[18,19],[14,19]] },
  { type: 'latency_leech',      col: 15, row: 16, encounter: 'cold-aisle',
    patrol: [[13,15],[18,15],[18,18],[13,18]] },

  // Management Console Room — specters and wraiths
  { type: 'config_drift_specter', col: 22, row: 15, encounter: 'management',
    patrol: [[22,13],[26,13],[26,19],[22,19]] },
  { type: 'config_drift_specter', col: 25, row: 18, encounter: 'management',
    patrol: [[21,14],[26,14],[26,20],[21,20]] },
  { type: 'ransomware_wraith',  col: 23, row: 17, encounter: 'management',
    patrol: [[22,13],[26,13],[26,19],[22,19],[21,16]] },

  // Emergency Exit Corridor — titan guarding the exit
  { type: 'cascade_titan',      col: 13, row: 27, encounter: 'exit-corridor',
    patrol: [[10,25],[16,25],[16,29],[10,29]] },
  { type: 'hardware_gremlin',   col: 11, row: 25, encounter: 'exit-corridor',
    patrol: [[9,24],[13,24],[10,28],[9,26]] },
  { type: 'corruption_crawler', col: 15, row: 26, encounter: 'exit-corridor',
    patrol: [[16,24],[17,26],[16,29],[13,27]] },
];

// Sprite sheets cached by type
const _sheetCache = {};

function getSheet(type) {
  if (!_sheetCache[type]) {
    _sheetCache[type] = buildSpriteSheet(type);
  }
  return _sheetCache[type];
}

function makeEnemy(type, position) {
  switch (type) {
    case 'corruption_crawler':   return new CorruptionCrawler(position);
    case 'ransomware_wraith':    return new RansomwareWraith(position);
    case 'hardware_gremlin':     return new HardwareGremlin(position);
    case 'network_phantom':      return new NetworkPhantom(position);
    case 'latency_leech':        return new LatencyLeech(position);
    case 'config_drift_specter':       return new ConfigDriftSpecter(position);
    case 'config_drift_specter_clone': return new ConfigDriftSpecter(position, true);
    case 'cascade_titan':              return new CascadeFailureTitan(position);
    default: return null;
  }
}

// Non-boss spawn types eligible for wave respawns
const WAVE_POOL = SPAWN_DEFS.filter(d => d.type !== 'cascade_titan');

// Convert a spawn def's patrol [[col,row],...] into THREE.Vector3 world positions.
function _defPatrol(def) {
  if (!def.patrol || def.patrol.length < 2) return [];
  return def.patrol.map(([c, r]) =>
    new THREE.Vector3(c * TILE + TILE / 2, 0.01, r * TILE + TILE / 2)
  );
}

export class EnemyManager {
  constructor(scene, weaponSystem) {
    this.scene         = scene;
    this.weaponSystem  = weaponSystem;
    this.enemies       = []; // { entity, sprite, group, deathTimer }
    this.pickups       = new PickupManager(scene);

    this._encryptionBolts   = []; // projectile-like objects from wraiths
    this._corruptionPatches = []; // floor DOT zones
    this._explosions        = []; // death-explosion VFX updated by the game loop
    this._weaponLockTimer   = 0;  // game-time countdown for weapon lock
    this._ambientWavesEnabled = false;
    this._spawnedEncounters = new Set();

    // Wave system
    this._waveNum       = 1;   // current wave (1 = initial spawn)
    this._waveTimer     = -1;  // countdown to next wave (-1 = not counting)
    this._waveDelay     = 10;  // seconds between wave-clear and respawn
    this._bossActive    = false; // suppresses waves during boss fights

    // Preload all sprite sheets
    const types = [...new Set(SPAWN_DEFS.map(d => d.type))];
    types.forEach(t => getSheet(t));
  }

  spawnAll() {
    SPAWN_DEFS.forEach(def => {
      const pos = new THREE.Vector3(
        def.col * TILE + TILE / 2,
        0.01,
        def.row * TILE + TILE / 2
      );
      const patrol = _defPatrol(def);
      this._spawnEnemy(def.type, pos, {}, patrol, def.encounter ?? 'free-roam');
    });
  }

  spawnEncounter(encounterId, options = {}) {
    if (this._spawnedEncounters.has(encounterId)) return false;

    const defs = SPAWN_DEFS.filter(def => def.encounter === encounterId);
    if (defs.length === 0) return false;

    defs.forEach(def => {
      const pos = new THREE.Vector3(
        def.col * TILE + TILE / 2,
        0.01,
        def.row * TILE + TILE / 2,
      );
      this._spawnEnemy(def.type, pos, {}, _defPatrol(def), encounterId);
    });

    this._spawnedEncounters.add(encounterId);
    if (options.message) this._showWaveToast(options.message);
    return true;
  }

  _spawnEnemy(type, position, mults = {}, patrolPts = [], encounterId = 'free-roam') {
    const entity = makeEnemy(type, position);
    if (!entity) return;

    if (mults.speedMult)  entity.speed  *= mults.speedMult;
    if (mults.damageMult) entity.damage *= mults.damageMult;

    // Assign patrol route and start entity in PATROL state so it moves
    // immediately rather than standing frozen until the player enters range.
    if (patrolPts.length >= 2) {
      entity._patrolPoints = patrolPts;
      entity._patrolIndex  = Math.floor(Math.random() * patrolPts.length);
      entity.state         = AI_STATE.PATROL;
    }

    const isBoss = type === 'cascade_titan';
    const sheet  = getSheet(type);
    const sprite = new BillboardSprite(sheet, isBoss);

    const group = new THREE.Group();
    group.position.copy(position);
    group.add(sprite.mesh);

    // Wire mesh userData for hitscan weapon targeting
    sprite.mesh.userData.enemy = entity;
    // Also tag child meshes
    sprite.mesh.traverse(c => { c.userData.enemy = entity; });

    this.scene.add(group);

    this.enemies.push({ entity, sprite, group, deathTimer: -1, encounterId });
  }

  update(dt, player, level) {
    const camera = player.camera ?? null;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const { entity, sprite, group } = e;

      // Dead — show death sprite then remove
      if (entity.isDead) {
        if (e.deathTimer < 0) {
          // First frame of death
          e.deathTimer = 1.2;
          sprite.setFrame(8); // death frame

          // Handle explosion (Hardware Gremlin)
          if (entity.pendingExplosion) {
            entity.pendingExplosion = false;
            this._spawnExplosion(entity.position.clone());
            // Damage player if nearby
            if (player.position.distanceTo(entity.position) < 3) {
              player.takeDamage(30, 'electrical');
            }
          }

          // Spawn drops
          this._spawnDrops(entity);
        }

        e.deathTimer -= dt;
        if (e.deathTimer <= 0) {
          this.scene.remove(group);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Update AI
      entity.update(dt, player, level);

      // Handle Wraith encryption bolts
      if (entity.pendingBolts?.length > 0) {
        entity.pendingBolts.forEach(bolt => {
          this._spawnEncryptionBolt(bolt.from, bolt.target, player, bolt.damage);
        });
        entity.pendingBolts = [];
      }

      // Handle Config Drift clones — validate position before spawning
      if (entity.pendingClones?.length > 0) {
        entity.pendingClones.forEach(pos => {
          const clear = this._findClearPos(pos, level);
          if (clear) this._spawnEnemy('config_drift_specter_clone', clear);
        });
        entity.pendingClones = [];
      }

      // Handle cascade titan level events
      if (entity.pendingLevelEvents?.length > 0) {
        entity.pendingLevelEvents.forEach(evt => this._handleLevelEvent(evt));
        entity.pendingLevelEvents = [];
      }

      // Update position
      group.position.copy(entity.position);

      // Billboard facing
      if (camera) {
        const frame = sprite.getDirectionalFrame(entity.yaw, camera.position, entity.position);
        sprite.setFrame(frame);
        sprite.faceCamera(camera);
      }

      // Network Phantom visibility
      if (entity.type === 'network_phantom') {
        sprite.mesh.material.opacity = entity.getVisibility?.() ?? 1.0;
      }

      // Sprite colour: hit flash takes priority, then enemy-specific tints.
      if (entity._hitFlash > 0) {
        entity._hitFlash = Math.max(0, entity._hitFlash - dt);
        // Interpolate white → red as the flash fades
        const t = entity._hitFlash / 0.12;
        sprite.mesh.material.color.setRGB(1, t * 0.5, t * 0.5);
      } else if (entity.type === 'config_drift_specter') {
        const m = entity.getMorphT?.() ?? 0;
        sprite.mesh.material.color.setRGB(1, 1 - m * 0.5, 1 - m * 0.8);
      } else {
        sprite.mesh.material.color.setRGB(1, 1, 1);
      }
    }

    // Weapon lock timer (game-time, pauses correctly)
    if (this._weaponLockTimer > 0) {
      this._weaponLockTimer -= dt;
      if (this._weaponLockTimer <= 0) {
        player.weaponSystem?.unlock();
      }
    }

    // Update encryption bolts
    this._updateBolts(dt, player);

    // Update corruption patches
    this._updatePatches(dt, player);

    // Update explosion VFX
    this._updateExplosions(dt);

    // Update pickups
    this.pickups.update(dt, player);

    // Wave respawn
    if (this._ambientWavesEnabled && !this._bossActive) {
      const living = this.enemies.filter(e => !e.entity.isDead).length;
      if (living === 0 && this._waveTimer < 0 && this._waveNum > 0) {
        // All enemies cleared — start countdown
        this._waveTimer = this._waveDelay;
        this._showWaveToast(`WAVE ${this._waveNum} CLEARED — NEXT WAVE IN ${this._waveDelay}s`);
      }
      if (this._waveTimer >= 0) {
        this._waveTimer -= dt;
        if (this._waveTimer <= 0) {
          this._waveTimer = -1;
          this._waveNum++;
          this._spawnWave();
        }
      }
    }
  }

  // Returns the requested position if it's clear, otherwise tries up to 12 random
  // offsets within 3 units. Returns null if no clear spot is found (clone skipped).
  _findClearPos(pos, level) {
    if (!level.collidesAABB(pos, 0.35, 1.8)) return pos;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const r = 1.5 + (i % 3) * 0.75; // spiral outward: 1.5, 2.25, 3 units
      const candidate = new THREE.Vector3(
        pos.x + Math.cos(angle) * r,
        pos.y,
        pos.z + Math.sin(angle) * r,
      );
      if (!level.collidesAABB(candidate, 0.35, 1.8)) return candidate;
    }
    return null;
  }

  _spawnDrops(entity) {
    const diff = this._diffConfig ?? { healthDropMult: 1, armorDropMult: 1 };

    entity.dropTable.forEach(drop => {
      const chanceMult =
        drop.type === 'health' ? diff.healthDropMult :
        drop.type === 'armor'  ? diff.armorDropMult  : 1;
      const finalChance = Math.max(0, Math.min(1, drop.chance * chanceMult));

      if (Math.random() > finalChance) return;
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0,
        (Math.random() - 0.5) * 1.5
      );
      this.pickups.spawn(drop.type, entity.position.clone().add(offset), {
        amount: drop.amount,
        ammoType: drop.ammoType,
      });
    });
  }

  _spawnExplosion(pos) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.8 });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(pos);
    sphere.position.y = 0.8;
    this.scene.add(sphere);

    const light = new THREE.PointLight(0xff4400, 6, 6, 2);
    light.position.copy(sphere.position);
    this.scene.add(light);

    // Tracked by the game loop via _updateExplosions — no separate rAF needed.
    this._explosions.push({ sphere, light, geo, mat, life: 0.5 });
  }

  _updateExplosions(dt) {
    for (let i = this._explosions.length - 1; i >= 0; i--) {
      const ex = this._explosions[i];
      ex.life -= dt;
      ex.sphere.scale.setScalar(1 + (1 - ex.life / 0.5) * 30);
      ex.sphere.material.opacity = Math.max(0, ex.life / 0.5 * 0.8);
      ex.light.intensity = Math.max(0, ex.life / 0.5 * 6);
      if (ex.life <= 0) {
        this.scene.remove(ex.sphere);
        this.scene.remove(ex.light);
        ex.geo.dispose();
        ex.mat.dispose();
        this._explosions.splice(i, 1);
      }
    }
  }

  _spawnEncryptionBolt(from, target, player, damage = 12) {
    const geo = new THREE.SphereGeometry(0.1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    mesh.position.y = 1.0;
    this.scene.add(mesh);

    const dir = target.clone().sub(from).normalize();
    dir.y = 0;

    const bolt = { mesh, dir, speed: 9, life: 3.0, player, damage };
    this._encryptionBolts.push(bolt);
  }

  _updateBolts(dt, player) {
    for (let i = this._encryptionBolts.length - 1; i >= 0; i--) {
      const b = this._encryptionBolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.dir, b.speed * dt);
      b.mesh.rotation.y += dt * 5;

      const dist = b.mesh.position.distanceTo(player.position);
      if (dist < 0.8) {
        // Hit — deal damage then lock the player's weapon temporarily
        player.takeDamage(b.damage, 'encryption');
        const ws = player.weaponSystem;
        if (ws) {
          ws.lock();
          this._weaponLockTimer = 2.0;
          EnemySounds.weaponLock();
        }
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.scene.remove(b.mesh);
        this._encryptionBolts.splice(i, 1);
        continue;
      }

      if (b.life <= 0) {
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.scene.remove(b.mesh);
        this._encryptionBolts.splice(i, 1);
      }
    }
  }

  _updatePatches(dt, player) {
    // Transfer patches from living crawlers into the central array so patches
    // outlive crawlers that die or get removed from the enemies list.
    this.enemies.forEach(e => {
      if (e.entity.type !== 'corruption_crawler') return;
      if (e.entity._corruptionPatches?.length > 0) {
        this._corruptionPatches.push(...e.entity._corruptionPatches);
        e.entity._corruptionPatches = [];
      }
    });

    // Tick all central patches — DOT zones
    for (let i = this._corruptionPatches.length - 1; i >= 0; i--) {
      const patch = this._corruptionPatches[i];
      patch.life -= dt;
      if (patch.life <= 0) {
        this._corruptionPatches.splice(i, 1);
        continue;
      }
      const dx = player.position.x - patch.position.x;
      const dz = player.position.z - patch.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
        player.takeDamage(5 * dt, 'corruption');
      }
    }
  }

  _handleLevelEvent(evt) {
    const ov = document.getElementById('damage-overlay');

    if (evt === 'lights_flicker') {
      pulseOverlay([
        { delay: 0,   background: 'rgba(0,0,0,0.32)' },
        { delay: 160, background: '' },
        { delay: 260, background: 'rgba(0,0,0,0.18)' },
        { delay: 420, background: '' },
      ]);

    } else if (evt === 'alarm') {
      if (ov) {
        ov.style.boxShadow = 'inset 0 0 40px #ff220066';
        setTimeout(() => { ov.style.boxShadow = ''; }, 500);
      }

    } else if (evt === 'phase2') {
      this._showWaveToast('CASCADE PHASE 2 — THREAT ESCALATING');
      if (ov) {
        ov.style.boxShadow = 'inset 0 0 60px #ff880099';
        setTimeout(() => { ov.style.boxShadow = ''; }, 700);
      }
      pulseOverlay([
        { delay: 0, background: 'rgba(255,170,80,0.12)' },
        { delay: 220, background: '' },
      ]);

    } else if (evt === 'phase3') {
      this._showWaveToast('CASCADE PHASE 3 — CRITICAL FAILURE IMMINENT');
      if (ov) {
        ov.style.boxShadow = 'inset 0 0 90px #ff000099';
        setTimeout(() => { ov.style.boxShadow = ''; },                        600);
        setTimeout(() => { ov.style.boxShadow = 'inset 0 0 90px #ff000099'; }, 750);
        setTimeout(() => { ov.style.boxShadow = ''; },                       1000);
      }
      pulseOverlay([
        { delay: 0,   background: 'rgba(255,80,80,0.14)' },
        { delay: 160, background: '' },
        { delay: 260, background: 'rgba(255,120,80,0.08)' },
        { delay: 420, background: '' },
      ]);
    }
  }

  suppressWaves() { this._bossActive = true;  this._waveTimer = -1; }
  resumeWaves()   { this._bossActive = false; }
  setAmbientWavesEnabled(enabled) {
    this._ambientWavesEnabled = enabled;
    if (!enabled) this._waveTimer = -1;
  }

  _spawnWave() {
    // Scale wave size and difficulty with wave number
    // Wave 2 = 60% of pool, wave 3+ = 80%, capped at full pool
    const fraction = Math.min(0.4 + this._waveNum * 0.2, 1.0);
    const count    = Math.ceil(WAVE_POOL.length * fraction);
    const speedMult  = 1 + (this._waveNum - 1) * 0.15;
    const damageMult = 1 + (this._waveNum - 1) * 0.10;

    // Shuffle pool and take `count` defs
    const shuffled = [...WAVE_POOL].sort(() => Math.random() - 0.5).slice(0, count);

    // Combine wave escalation with base difficulty config
    const baseDiff   = this._diffConfig ?? { enemySpeedMult: 1, enemyDamageMult: 1 };
    const finalSpeed  = speedMult  * baseDiff.enemySpeedMult;
    const finalDamage = damageMult * baseDiff.enemyDamageMult;

    shuffled.forEach(def => {
      const pos = new THREE.Vector3(
        def.col * TILE + TILE / 2,
        0.01,
        def.row * TILE + TILE / 2
      );
      const patrol = _defPatrol(def);
      this._spawnEnemy(def.type, pos, { speedMult: finalSpeed, damageMult: finalDamage }, patrol);
    });

    this._showWaveToast(`WAVE ${this._waveNum} INCOMING — ${count} THREATS DETECTED`);
  }

  spawnScriptedWave(spawns, options = {}) {
    const baseDiff = options.ignoreDifficulty
      ? { enemySpeedMult: 1, enemyDamageMult: 1 }
      : (this._diffConfig ?? { enemySpeedMult: 1, enemyDamageMult: 1 });

    const finalSpeed = (options.speedMult ?? 1) * baseDiff.enemySpeedMult;
    const finalDamage = (options.damageMult ?? 1) * baseDiff.enemyDamageMult;

    spawns.forEach(spawn => {
      const pos = spawn.position?.clone
        ? spawn.position.clone()
        : new THREE.Vector3(spawn.position.x, spawn.position.y, spawn.position.z);
      this._spawnEnemy(
        spawn.type,
        pos,
        { speedMult: finalSpeed, damageMult: finalDamage },
        spawn.patrol ?? [],
        options.encounterId ?? 'scripted'
      );
    });

    if (options.message) {
      this._showWaveToast(options.message);
    }
  }

  _showWaveToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:30%;left:50%;transform:translateX(-50%);
      font-family:'Courier New',monospace;font-size:13px;
      letter-spacing:3px;color:#ff4400;
      text-shadow:0 0 12px #ff440088;pointer-events:none;
      animation:toastFade 3s forwards;white-space:nowrap;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Wire weapon system for pickup ammo delivery
  setPlayerWeaponRef(player, weaponSystem) {
    player.weaponSystem = weaponSystem;
  }

  getEnemyCount() {
    return this.enemies.filter(e => !e.entity.isDead).length;
  }

  isEncounterSpawned(encounterId) {
    return this._spawnedEncounters.has(encounterId);
  }

  getAllEnemyEntities() {
    return this.enemies.map(e => e.entity);
  }

  // Returns the current wave number and, when the respawn countdown is running,
  // the seconds remaining (null when enemies are still alive).
  getWaveState() {
    if (!this._ambientWavesEnabled) return null;
    return {
      num:      this._waveNum,
      countdown: this._waveTimer >= 0 ? this._waveTimer : null,
    };
  }
}
