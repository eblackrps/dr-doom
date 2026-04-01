import * as THREE from 'three';
import { RansomwareKing, CascadeFailureTitanFull, TheAudit, AUDIT_TASKS } from '../entities/bosses.js';
import { buildSpriteSheet, BillboardSprite } from '../entities/sprites.js';
import { PickupManager } from '../entities/pickups.js';
import { EnemySounds } from '../audio/enemies.js';

const TILE   = 4;
const WALL_H = 4;

export const WORLD_COLS = 43;
export const WORLD_ROWS = 47;

export const BOSS_ARENA_LAYOUTS = {
  'ransomware-king': {
    room: { minCol: 29, maxCol: 42, minRow: 0, maxRow: 11 },
    corridor: { minCol: 27, maxCol: 28, minRow: 5, maxRow: 6 },
    entrance: {
      side: 'west',
      start: 5 * TILE,
      end: 7 * TILE,
    },
    checkpoint: { x: 112, y: 1.65, z: 24 },
    bossCell: { col: 36, row: 4 },
  },
  'cascade-titan': {
    room: { minCol: 0, maxCol: 27, minRow: 33, maxRow: 46 },
    corridor: { minCol: 13, maxCol: 14, minRow: 30, maxRow: 32 },
    entrance: {
      side: 'north',
      start: 13 * TILE,
      end: 15 * TILE,
    },
    checkpoint: { x: 56, y: 1.65, z: 136 },
    bossCell: { col: 14, row: 38 },
  },
  'the-audit': {
    room: { minCol: 29, maxCol: 42, minRow: 14, maxRow: 29 },
    corridor: { minCol: 28, maxCol: 28, minRow: 16, maxRow: 17 },
    entrance: {
      side: 'west',
      start: 8,
      end: 16,
    },
    checkpoint: { x: 124, y: 1.65, z: 88 },
    bossCell: { col: 36, row: 18 },
  },
};

function buildSegments(totalLength, openings = []) {
  const normalized = [...openings]
    .map(opening => ({
      start: Math.max(0, Math.min(totalLength, opening.start ?? 0)),
      end: Math.max(0, Math.min(totalLength, opening.end ?? 0)),
    }))
    .filter(opening => opening.end > opening.start)
    .sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;
  normalized.forEach(opening => {
    if (opening.start > cursor) {
      segments.push({ start: cursor, end: opening.start });
    }
    cursor = Math.max(cursor, opening.end);
  });
  if (cursor < totalLength) {
    segments.push({ start: cursor, end: totalLength });
  }
  return segments.filter(segment => segment.end - segment.start > 0.05);
}

// ---- Arena geometry helper ----

function buildArenaRoom(scene, originX, originZ, width, depth, wallColor, floorColor, openings = {}) {
  const wallMat  = new THREE.MeshBasicMaterial({ color: wallColor });
  const floorMat = new THREE.MeshBasicMaterial({ color: floorColor });
  const ceilMat  = new THREE.MeshBasicMaterial({ color: 0x151820 });

  const W = width * TILE;
  const D = depth * TILE;
  const cx = originX + W / 2;
  const cz = originZ + D / 2;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0, cz);
  scene.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, WALL_H, cz);
  scene.add(ceil);

  const wallCells = [];
  const thickness = 0.3;

  buildSegments(W, openings.north ?? []).forEach(segment => {
    const len = segment.end - segment.start;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, thickness), wallMat);
    wall.position.set(originX + segment.start + len / 2, WALL_H / 2, originZ);
    scene.add(wall);
    wallCells.push({
      minX: originX + segment.start,
      maxX: originX + segment.end,
      minY: 0,
      maxY: WALL_H,
      minZ: originZ - thickness,
      maxZ: originZ,
    });
  });

  buildSegments(W, openings.south ?? []).forEach(segment => {
    const len = segment.end - segment.start;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, thickness), wallMat);
    wall.position.set(originX + segment.start + len / 2, WALL_H / 2, originZ + D);
    scene.add(wall);
    wallCells.push({
      minX: originX + segment.start,
      maxX: originX + segment.end,
      minY: 0,
      maxY: WALL_H,
      minZ: originZ + D,
      maxZ: originZ + D + thickness,
    });
  });

  buildSegments(D, openings.west ?? []).forEach(segment => {
    const len = segment.end - segment.start;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(thickness, WALL_H, len), wallMat);
    wall.position.set(originX, WALL_H / 2, originZ + segment.start + len / 2);
    scene.add(wall);
    wallCells.push({
      minX: originX - thickness,
      maxX: originX,
      minY: 0,
      maxY: WALL_H,
      minZ: originZ + segment.start,
      maxZ: originZ + segment.end,
    });
  });

  buildSegments(D, openings.east ?? []).forEach(segment => {
    const len = segment.end - segment.start;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(thickness, WALL_H, len), wallMat);
    wall.position.set(originX + W, WALL_H / 2, originZ + segment.start + len / 2);
    scene.add(wall);
    wallCells.push({
      minX: originX + W,
      maxX: originX + W + thickness,
      minY: 0,
      maxY: WALL_H,
      minZ: originZ + segment.start,
      maxZ: originZ + segment.end,
    });
  });

  return { cx, cz, W, D, originX, originZ, wallCells };
}

function buildCorridor(scene, x, z, width, depth, floorColor, ceilingColor, accentColor = 0x334455) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color: floorColor }),
  );
  floor.rotation.x = -Math.PI / 2;
  // Keep corridor surfaces slightly offset from the main level planes so the
  // transition strips do not z-fight and flicker when they overlap the base map.
  floor.position.set(x + width / 2, 0.03, z + depth / 2);
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color: ceilingColor }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(x + width / 2, WALL_H - 0.03, z + depth / 2);
  scene.add(ceil);

  const stripMat = new THREE.MeshBasicMaterial({ color: accentColor });
  const guideWidth = Math.max(0.18, Math.min(width, depth) * 0.06);
  const depthRunsAlongZ = depth >= width;
  const guideLength = depthRunsAlongZ ? depth - 0.2 : width - 0.2;
  const guideGeo = new THREE.BoxGeometry(
    depthRunsAlongZ ? guideWidth : guideLength,
    0.04,
    depthRunsAlongZ ? guideLength : guideWidth,
  );

  [-1, 1].forEach((side) => {
    const guide = new THREE.Mesh(guideGeo, stripMat);
    if (depthRunsAlongZ) {
      guide.position.set(x + width / 2 + side * Math.max(0.35, width * 0.24), 0.05, z + depth / 2);
    } else {
      guide.position.set(x + width / 2, 0.05, z + depth / 2 + side * Math.max(0.35, depth * 0.24));
    }
    scene.add(guide);
  });

  const ribCount = Math.max(2, Math.floor((depthRunsAlongZ ? depth : width) / (TILE * 0.8)));
  for (let index = 0; index < ribCount; index++) {
    const t = (index + 1) / (ribCount + 1);
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(depthRunsAlongZ ? width - 0.25 : 0.08, 0.08, depthRunsAlongZ ? 0.08 : depth - 0.25),
      new THREE.MeshBasicMaterial({ color: 0x11161d }),
    );
    if (depthRunsAlongZ) {
      rib.position.set(x + width / 2, WALL_H - 0.12, z + depth * t);
    } else {
      rib.position.set(x + width * t, WALL_H - 0.12, z + depth / 2);
    }
    scene.add(rib);
  }
}

function buildSign(scene, text, x, y, z, color = 0xff2200) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 48;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 320, 48);
  ctx.strokeStyle = `#${color.toString(16).padStart(6,'0')}`;
  ctx.strokeRect(1,1,318,46);
  ctx.fillStyle = `#${color.toString(16).padStart(6,'0')}`;
  ctx.font = 'bold 16px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(text, 160, 31);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 0.52),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
  );
  sign.position.set(x, y, z);
  scene.add(sign);
}

function pulseScreenOverlay(steps) {
  const overlay = document.getElementById('damage-overlay');
  if (!overlay) return;

  steps.forEach(({ delay, background = '', boxShadow = '' }) => {
    setTimeout(() => {
      overlay.style.background = background;
      overlay.style.boxShadow = boxShadow;
    }, delay);
  });
}

// Solid cell list shared with main level
let arenaCells = [];
export function getArenaCells() { return arenaCells; }


// ================================================================
// ARENA 1 — Ransomware King (appended east of level, row 1-10)
// Entrance: col 28, row 5-6 (east wall of Storage Vault)
// ================================================================

export class RansomwareKingArena {
  constructor(scene, interaction, solidCellsRef) {
    this.scene       = scene;
    this.interaction = interaction;
    this._solid      = solidCellsRef;

    // Arena origin: col 29, row 0 — 14 wide, 12 deep
    this.ORIGIN_X = 29 * TILE;
    this.ORIGIN_Z = 0  * TILE;
    this.WIDTH    = 14;
    this.DEPTH    = 12;

    this.boss       = null;
    this.sprite     = null;
    this.group      = null;
    this.pickups    = new PickupManager(scene);
    this._nodes     = []; // decryption node meshes
    this._panels    = []; // floor panels (can be encrypted)
    this._active    = false;
    this._bossDefeated = false;
    this._onDefeat  = null;
    this._bossBolts = []; // game-loop-managed boss bolts
    this._bossWeaponLockTimer = 0;

    this._build();
  }

  _build() {
    const layout = BOSS_ARENA_LAYOUTS['ransomware-king'];
    const { cx, cz, originX, originZ, wallCells } = buildArenaRoom(
      this.scene,
      this.ORIGIN_X, this.ORIGIN_Z,
      this.WIDTH, this.DEPTH,
      0x330011, 0x110008,
      { west: [layout.entrance] }
    );

    buildSign(this.scene, '⚠ ENCRYPTION ZONE — RANSOMWARE KING', cx, WALL_H - 0.4, originZ + 0.2, 0xff0066);

    // Register arena walls as solid
    const W = this.WIDTH * TILE, D = this.DEPTH * TILE;
    const ox = this.ORIGIN_X, oz = this.ORIGIN_Z;
    wallCells.forEach(c => {
      this._solid.push({ ...c, minY: 0, maxY: WALL_H });
      arenaCells.push({ ...c, minY: 0, maxY: WALL_H });
    });

    // Entrance corridor (col 28, rows 5-6) — no wall on west side
    this._buildEntrance(cx, originZ);

    // Floor panels (8x10 grid inside arena)
    this._buildFloorPanels(ox, oz);

    // Atmospheric lighting
    const redLight = new THREE.PointLight(0xff0033, 4, 30, 2);
    redLight.position.set(cx, WALL_H - 0.3, oz + D/2);
    this.scene.add(redLight);
    this._ambientLight = redLight;

    // Spawn boss
    const bossPos = new THREE.Vector3(cx, 0.01, oz + D * 0.4);
    this.boss = new RansomwareKing(bossPos);

    // Boss sprite — extra large
    const sheet = buildSpriteSheet('ransomware_wraith'); // reuse wraith sheet, scaled up
    this.sprite = new BillboardSprite(sheet, true);
    this.sprite.mesh.scale.setScalar(2.5);

    this.group = new THREE.Group();
    this.group.position.copy(bossPos);
    this.group.add(this.sprite.mesh);
    this.scene.add(this.group);

    // Tag for hitscan
    this.sprite.mesh.userData.boss = this.boss;
    this.sprite.mesh.traverse(c => { c.userData.boss = this.boss; });

    // Decryption nodes — 3 glowing orbs arranged on boss
    this._buildNodes(bossPos);
  }

  _buildEntrance(cx, originZ) {
    // Corridor connecting Storage Vault east wall to arena west wall
    // cols 27-28, rows 5-6
    const corrW = 2 * TILE, corrH = 2 * TILE;
    const corrX = 27 * TILE, corrZ = 5 * TILE;

    buildCorridor(this.scene, corrX, corrZ, corrW, corrH, 0x220008, 0x110005, 0x662233);

    // Danger sign at entrance
    buildSign(this.scene, 'RANSOMWARE CONTAINMENT ZONE — ENTER AT OWN RISK',
      corrX + corrW/2, WALL_H - 0.5, corrZ + 0.2, 0xff0066);
  }

  _buildFloorPanels(ox, oz) {
    const COLS = this.WIDTH - 2, ROWS = this.DEPTH - 2;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const px = ox + (c + 1) * TILE + TILE/2;
        const pz = oz + (r + 1) * TILE + TILE/2;

        const geo = new THREE.BoxGeometry(TILE - 0.15, 0.04, TILE - 0.15);
        const mat = new THREE.MeshBasicMaterial({ color: 0x1a000a });
        const panel = new THREE.Mesh(geo, mat);
        panel.position.set(px, 0.02, pz);
        this.scene.add(panel);

        this._panels.push({
          mesh: panel,
          col: c, row: r,
          encrypted: false,
          worldX: px, worldZ: pz,
        });
      }
    }
  }

  _buildNodes(bossPos) {
    const offsets = [
      new THREE.Vector3(-0.6, 1.4, 0.3),
      new THREE.Vector3( 0.0, 2.2, 0.3),
      new THREE.Vector3( 0.6, 1.4, 0.3),
    ];

    offsets.forEach((offset, i) => {
      const geo = new THREE.SphereGeometry(0.18, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
      const node = new THREE.Mesh(geo, mat);
      node.position.copy(bossPos).add(offset);
      this.scene.add(node);

      const light = new THREE.PointLight(0x00ffaa, 1.5, 2, 2);
      node.add(light);

      node.userData.bossNode = this.boss;
      node.userData.nodeIndex = i;

      this._nodes.push({ mesh: node, offset, hit: false });
    });
  }

  activate() { this._active = true; }

  onDefeat(fn) { this._onDefeat = fn; }

  getNavigationTarget() {
    return this.boss?.position?.clone?.() ?? null;
  }

  update(dt, player, camera, level) {
    if (!this._active || this._bossDefeated) {
      this.pickups.update(dt, player);
      return;
    }

    this.boss.update(dt, player, level);

    // Update group position
    this.group.position.copy(this.boss.position);

    // Billboard
    if (camera) {
      this.sprite.faceCamera(camera);
      const frame = this.boss._isCharging ? 4 : Math.floor(performance.now() / 200) % 8;
      this.sprite.setFrame(this.boss.isDead ? 8 : frame);
    }

    // Update decryption node positions
    this._nodes.forEach((n, i) => {
      n.mesh.position.copy(this.boss.position).add(n.offset);
      n.mesh.rotation.y += dt * 2;
    });

    // Handle boss events
    while (this.boss.pendingEvents.length > 0) {
      const evt = this.boss.pendingEvents.shift();
      this._handleBossEvent(evt, player);
    }

    // Handle pending encryption
    if (this.boss.pendingEncrypt) {
      this.boss.pendingEncrypt = false;
      this._encryptRandomPanels();
    }

    // Damage player on encrypted panels
    const px = player.position.x;
    const pz = player.position.z;
    this._panels.forEach(p => {
      if (!p.encrypted) return;
      if (Math.abs(px - p.worldX) < TILE/2 && Math.abs(pz - p.worldZ) < TILE/2) {
        player.takeDamage(20 * dt, 'encryption');
      }
    });

    // Encryption bolts — spawn
    if (this.boss.pendingBolts.length > 0) {
      this.boss.pendingBolts.forEach(b => this._spawnBolt(b.from, b.target, player));
      this.boss.pendingBolts = [];
    }

    // Update boss bolts (game-loop managed)
    for (let i = this._bossBolts.length - 1; i >= 0; i--) {
      const b = this._bossBolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.dir, b.speed * dt);
      b.mesh.rotation.y += dt * 5;
      if (b.mesh.position.distanceTo(b.player.position) < 0.8) {
        player.takeDamage(12, 'encryption');
        const ws = player.weaponSystem;
        if (ws) {
          ws.lock();
          this._bossWeaponLockTimer = 2.5;
          EnemySounds.weaponLock();
        }
        b.life = 0;
      }
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.geo.dispose();
        b.mat.dispose();
        this._bossBolts.splice(i, 1);
      }
    }

    // Boss weapon lock timer
    if (this._bossWeaponLockTimer > 0) {
      this._bossWeaponLockTimer -= dt;
      if (this._bossWeaponLockTimer <= 0) player.weaponSystem?.unlock();
    }

    // Death check
    if (this.boss.isDead && !this._bossDefeated) {
      this._bossDefeated = true;
      this._onBossDefeated(player);
    }

    // Ambient light flicker
    this._ambientLight.intensity = 3 + Math.sin(performance.now() * 0.003) * 1.5;

    this.pickups.update(dt, player);
  }

  _encryptRandomPanels() {
    const available = this._panels.filter(p => !p.encrypted);
    const count = Math.min(available.length, 2 + this.boss.phase);
    const shuffled = available.sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const panel = shuffled[i];
      panel.encrypted = true;
      panel.mesh.material.color.setHex(0xaa0033);

      // Add lock icon visual
      const lockGeo = new THREE.BoxGeometry(0.3, 0.5, 0.04);
      const lockMat = new THREE.MeshBasicMaterial({ color: 0xff0066 });
      const lock = new THREE.Mesh(lockGeo, lockMat);
      lock.position.copy(panel.mesh.position);
      lock.position.y = 0.3;
      this.scene.add(lock);
      panel._lockMesh = lock;
    }
  }

  _handleBossEvent(evt, player) {
    if (evt.type === 'phase_change') {
      this._showArenaMessage(`PHASE ${evt.phase} — ENCRYPTION ACCELERATING`, 0xff0066);
      EnemySounds.bossVulnerable();
    } else if (evt.type === 'node_hit') {
      const node = this._nodes[evt.index];
      if (node) {
        node.hit = true;
        node.mesh.material.color.setHex(0xffaa00);
      }
    } else if (evt.type === 'nodes_cleared') {
      this._showArenaMessage('DECRYPTION NODES CLEARED — BOSS VULNERABLE', 0x00ffaa);
      EnemySounds.bossVulnerable();
      // Decrypt all panels briefly
      this._panels.forEach(p => {
        if (p.encrypted) {
          p.encrypted = false;
          p.mesh.material.color.setHex(0x1a000a);
          if (p._lockMesh) { this.scene.remove(p._lockMesh); p._lockMesh = null; }
        }
      });
      this._nodes.forEach(node => {
        node.hit = false;
        node.mesh.material.color.setHex(0x00ffaa);
      });
    }
  }

  _spawnBolt(from, target, player) {
    const geo = new THREE.SphereGeometry(0.12, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    mesh.position.y = 1.0;
    this.scene.add(mesh);

    const dir = target.clone().sub(from);
    dir.y = 0;
    dir.normalize();

    this._bossBolts.push({ mesh, geo, mat, dir, speed: 9, life: 3.0, player });
  }

  _onBossDefeated(player) {
    this._showArenaMessage('RANSOMWARE KING NEUTRALIZED — ENCRYPTION LIFTED', 0x00ff41);
    // Drop all loot
    this.boss.dropTable.forEach(drop => {
      if (Math.random() <= drop.chance) {
        const pos = this.boss.position.clone().add(
          new THREE.Vector3((Math.random()-0.5)*3, 0, (Math.random()-0.5)*3)
        );
        this.pickups.spawn(drop.type, pos, { amount: drop.amount, ammoType: drop.ammoType });
      }
    });
    this._onDefeat?.();
  }

  resolveCheckpointDefeat() {
    this._active = false;
    this._bossDefeated = true;
    if (this.boss) {
      this.boss.isDead = true;
      this.boss.health = 0;
    }
    if (this.group) this.group.visible = false;
    this._nodes.forEach(node => { node.mesh.visible = false; });
    this._panels.forEach(panel => {
      panel.encrypted = false;
      panel.mesh.material.color.setHex(0x1a000a);
      if (panel._lockMesh) {
        this.scene.remove(panel._lockMesh);
        panel._lockMesh = null;
      }
    });
  }

  _showArenaMessage(text, color) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:30%; left:50%; transform:translateX(-50%);
      font-family:'Courier New',monospace; font-size:14px; letter-spacing:3px;
      color:#${color.toString(16).padStart(6,'0')};
      text-shadow:0 0 15px #${color.toString(16).padStart(6,'0')};
      pointer-events:none; white-space:nowrap; animation:objToast 3s forwards;
    `;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}


// ================================================================
// ARENA 2 — Cascade Failure Titan Full (south of main level)
// ================================================================

export class CascadeTitanArena {
  constructor(scene, interaction, solidCellsRef) {
    this.scene       = scene;
    this.interaction = interaction;
    this._solid      = solidCellsRef;

    this.ORIGIN_X = 0;
    this.ORIGIN_Z = 33 * TILE;
    this.WIDTH    = 28;
    this.DEPTH    = 14;

    this.boss          = null;
    this.sprite        = null;
    this.group         = null;
    this.pickups       = new PickupManager(scene);
    this._active       = false;
    this._bossDefeated = false;
    this._onDefeat     = null;
    this._electricPanels = [];
    this._electricPattern = [];
    this._electricWarningTimer = 0;
    this._electricActiveTimer = 0;
    this._electricEventTimer = 5.5;
    this._lightsOut    = false;
    this._ambientLight = null;
    this._elapsed      = 0;
    this._titanVFX     = []; // game-loop-managed VFX (explosions, sparks)

    this._build();
  }

  _build() {
    const layout = BOSS_ARENA_LAYOUTS['cascade-titan'];
    const { cx, cz, originX, originZ, wallCells } = buildArenaRoom(
      this.scene,
      this.ORIGIN_X, this.ORIGIN_Z,
      this.WIDTH, this.DEPTH,
      0x221100, 0x0d0800,
      { north: [layout.entrance] }
    );

    buildSign(this.scene, '⚠ CASCADE FAILURE ZONE — CRITICAL INFRASTRUCTURE BREACH',
      cx, WALL_H - 0.4, originZ + 0.2, 0xff4400);

    const W = this.WIDTH * TILE, D = this.DEPTH * TILE;
    const ox = this.ORIGIN_X, oz = this.ORIGIN_Z;

    wallCells.forEach(c => {
      this._solid.push({ ...c, minY: 0, maxY: WALL_H });
      arenaCells.push({ ...c, minY: 0, maxY: WALL_H });
    });

    buildCorridor(this.scene, 13 * TILE, 30 * TILE, 2 * TILE, 3 * TILE, 0x1d1206, 0x120a04, 0xaa6622);

    // Ambient — orange industrial
    this._ambientLight = new THREE.PointLight(0xff4400, 5, 80, 2);
    this._ambientLight.position.set(cx, WALL_H - 0.3, cz);
    this.scene.add(this._ambientLight);

    // Scattered debris / server remnants
    for (let i = 0; i < 8; i++) {
      const debris = new THREE.Mesh(
        new THREE.BoxGeometry(0.4 + Math.random()*0.8, 0.2, 0.3 + Math.random()*0.6),
        new THREE.MeshBasicMaterial({ color: 0x221100 })
      );
      debris.position.set(
        ox + 2*TILE + Math.random() * (W - 4*TILE),
        0.1,
        oz + 2*TILE + Math.random() * (D - 4*TILE)
      );
      this.scene.add(debris);
    }

    this._buildElectricLanes(ox, oz, W, D);

    // Spawn boss
    const bossPos = new THREE.Vector3(cx, 0.01, oz + D * 0.35);
    this.boss = new CascadeFailureTitanFull(bossPos);

    const sheet = buildSpriteSheet('cascade_titan');
    this.sprite = new BillboardSprite(sheet, true);
    this.sprite.mesh.scale.setScalar(3.0);

    this.group = new THREE.Group();
    this.group.position.copy(bossPos);
    this.group.add(this.sprite.mesh);
    this.scene.add(this.group);

    this.sprite.mesh.userData.boss = this.boss;
    this.sprite.mesh.traverse(c => { c.userData.boss = this.boss; });
  }

  _buildElectricLanes(ox, oz, W, D) {
    const laneDefs = [
      { x: ox + 5 * TILE,  z: oz + D / 2, w: 2 * TILE, h: D - 2 * TILE },
      { x: ox + 14 * TILE, z: oz + D / 2, w: 2 * TILE, h: D - 2 * TILE },
      { x: ox + 23 * TILE, z: oz + D / 2, w: 2 * TILE, h: D - 2 * TILE },
      { x: ox + W / 2,     z: oz + 4 * TILE, w: W - 2 * TILE, h: 2 * TILE },
      { x: ox + W / 2,     z: oz + 7 * TILE, w: W - 2 * TILE, h: 2 * TILE },
      { x: ox + W / 2,     z: oz + 10 * TILE, w: W - 2 * TILE, h: 2 * TILE },
    ];

    laneDefs.forEach((lane, index) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(lane.w - 0.2, 0.03, lane.h - 0.2),
        new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.05 }),
      );
      mesh.position.set(lane.x, 0.02, lane.z);
      this.scene.add(mesh);

      const light = new THREE.PointLight(0xffaa33, 0, 8, 2);
      light.position.set(lane.x, 0.4, lane.z);
      this.scene.add(light);

      this._electricPanels.push({
        index,
        mesh,
        light,
        minX: lane.x - lane.w / 2,
        maxX: lane.x + lane.w / 2,
        minZ: lane.z - lane.h / 2,
        maxZ: lane.z + lane.h / 2,
      });
    });
  }

  activate() { this._active = true; }
  onDefeat(fn) { this._onDefeat = fn; }

  getNavigationTarget() {
    return this.boss?.position?.clone?.() ?? null;
  }

  update(dt, player, camera, level) {
    if (!this._active || this._bossDefeated) {
      this.pickups.update(dt, player);
      return;
    }

    this._elapsed += dt;
    this.boss.update(dt, player, level);
    this.group.position.copy(this.boss.position);

    // Shake on charge
    if (this.boss._isCharging) {
      this.group.position.x += (Math.random()-0.5)*0.1;
      this.group.position.z += (Math.random()-0.5)*0.1;
    }

    if (camera) {
      this.sprite.faceCamera(camera);
      const frame = Math.floor(this._elapsed * 6) % 8;
      this.sprite.setFrame(this.boss.isDead ? 8 : frame);
    }

    // Handle events
    while (this.boss.pendingEvents.length > 0) {
      const evt = this.boss.pendingEvents.shift();
      this._handleEvent(evt, player);
    }

    if (this.boss.pendingExplosion) {
      this.boss.pendingExplosion = false;
      this._spawnExplosion(this.boss.position.clone());
    }

    // Ambient flicker
    if (!this._lightsOut) {
      this._ambientLight.intensity = 4 + Math.sin(this._elapsed * 3) * 1.5;
    }

    if (this.boss.phase >= 3 && this._electricWarningTimer <= 0 && this._electricActiveTimer <= 0) {
      this._electricEventTimer -= dt;
      if (this._electricEventTimer <= 0) {
        this._electricEventTimer = Math.max(4.2, 6.4 - this.boss.phase * 0.5);
        this._startElectricPattern();
      }
    }

    this._updateElectricFloor(dt, player);

    if (this.boss.isDead && !this._bossDefeated) {
      this._bossDefeated = true;
      this._onBossDefeated(player);
    }

    // Update VFX (explosions, sparks) — game loop managed
    for (let i = this._titanVFX.length - 1; i >= 0; i--) {
      const v = this._titanVFX[i];
      v.life -= dt;
      const p = 1 - v.life / v.duration;
      if (v.mesh.material.opacity !== undefined) {
        v.mesh.scale.setScalar(1 + p * 20);
        v.mesh.material.opacity = Math.max(0, (1 - p) * 0.8);
      }
      if (v.light) v.light.intensity = Math.max(0, (1 - p) * 8);
      if (v.life <= 0) {
        this.scene.remove(v.mesh);
        v.geo.dispose();
        v.mat.dispose();
        if (v.light) this.scene.remove(v.light);
        this._titanVFX.splice(i, 1);
      }
    }

    this.pickups.update(dt, player);
  }

  _handleEvent(evt, player) {
    if (evt.type === 'charge_warning') {
      this._showMsg('TITAN CHARGING — EVADE!', 0xff4400);
    } else if (evt.type === 'arena_event') {
      this._triggerArenaEvent(evt.event);
    } else if (evt.type === 'phase_change') {
      this._showMsg(`PHASE ${evt.phase} — CASCADE ACCELERATING`, 0xff8800);
      EnemySounds.bossVulnerable();
    }
  }

  _triggerArenaEvent(event) {
    if (event === 'lights_flicker' || event === 'lights_out') {
      this._lightsOut = event === 'lights_out';
      pulseScreenOverlay(
        event === 'lights_out'
          ? [
              { delay: 0, background: 'rgba(0,0,0,0.62)' },
              { delay: 2600, background: 'rgba(0,0,0,0.28)' },
              { delay: 3000, background: '' },
            ]
          : [
              { delay: 0, background: 'rgba(0,0,0,0.25)' },
              { delay: 180, background: '' },
            ],
      );
      setTimeout(() => {
        this._lightsOut = false;
      }, event === 'lights_out' ? 3000 : 220);
    } else if (event === 'electrify_floor') {
      this._startElectricPattern();
    } else if (event === 'alarm') {
      document.getElementById('damage-overlay').style.boxShadow = 'inset 0 0 60px #ff440066';
      setTimeout(() => { document.getElementById('damage-overlay').style.boxShadow = ''; }, 600);
    } else if (event === 'sparks') {
      this._spawnSparks();
    } else if (event === 'maximum_chaos') {
      this._showMsg('MAXIMUM CHAOS — CRITICAL SYSTEM FAILURE', 0xff2200);
      this._ambientLight.color.setHex(0xff2200);
    }
  }

  _startElectricPattern() {
    if (this._electricPanels.length === 0) return;
    const groups = [
      [0, 1, 2],
      [3, 4, 5],
    ];
    const source = groups[Math.floor(Math.random() * groups.length)];
    this._electricPattern = [...source].sort(() => Math.random() - 0.5).slice(0, 2);
    this._electricWarningTimer = 1.1;
    this._electricActiveTimer = 0;
    this._showMsg('FLOOR ROUTING FAILURE — WATCH THE HOT LANES', 0xffaa00);
  }

  _updateElectricFloor(dt, player) {
    if (this._electricWarningTimer > 0) {
      this._electricWarningTimer = Math.max(0, this._electricWarningTimer - dt);
      if (this._electricWarningTimer <= 0) {
        this._electricActiveTimer = 4.2;
        this._showMsg('FLOOR ENERGIZED — MOVE!', 0xffff66);
      }
    } else if (this._electricActiveTimer > 0) {
      this._electricActiveTimer = Math.max(0, this._electricActiveTimer - dt);
    }

    const flash = Math.sin(this._elapsed * 12) > 0 ? 1 : 0.45;
    this._electricPanels.forEach(panel => {
      const active = this._electricPattern.includes(panel.index);
      const warning = active && this._electricWarningTimer > 0;
      const energized = active && this._electricActiveTimer > 0;

      if (!active) {
        panel.mesh.material.opacity = Math.max(0.02, panel.mesh.material.opacity - dt * 4);
        panel.mesh.material.color.setHex(0x552200);
        panel.light.intensity = Math.max(0, panel.light.intensity - dt * 6);
        return;
      }

      if (warning) {
        panel.mesh.material.color.setHex(0xff8800);
        panel.mesh.material.opacity = 0.12 + flash * 0.12;
        panel.light.color.setHex(0xff8800);
        panel.light.intensity = 0.8 + flash * 1.2;
        return;
      }

      if (energized) {
        panel.mesh.material.color.setHex(0xffff66);
        panel.mesh.material.opacity = 0.18 + flash * 0.2;
        panel.light.color.setHex(0xffff99);
        panel.light.intensity = 1.8 + flash * 1.8;
        if (
          player.position.x > panel.minX && player.position.x < panel.maxX &&
          player.position.z > panel.minZ && player.position.z < panel.maxZ
        ) {
          player.takeDamage(28 * dt, 'electrical');
        }
        return;
      }

      panel.mesh.material.opacity = Math.max(0.02, panel.mesh.material.opacity - dt * 3);
      panel.light.intensity = Math.max(0, panel.light.intensity - dt * 8);
    });
  }

  _spawnSparks() {
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const spark = new THREE.Mesh(geo, mat);
      spark.position.set(
        this.ORIGIN_X + Math.random() * this.WIDTH * TILE,
        0.5 + Math.random() * 2,
        this.ORIGIN_Z + Math.random() * this.DEPTH * TILE
      );
      this.scene.add(spark);
      const life = 0.3 + Math.random() * 0.5;
      this._titanVFX.push({ mesh: spark, light: null, geo, mat, life, duration: life });
    }
  }

  _spawnExplosion(pos) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.8 });
    const s = new THREE.Mesh(geo, mat);
    s.position.copy(pos); s.position.y = 0.8;
    this.scene.add(s);
    const l = new THREE.PointLight(0xff4400, 8, 8, 2);
    l.position.copy(s.position);
    this.scene.add(l);
    this._titanVFX.push({ mesh: s, light: l, geo, mat, life: 0.6, duration: 0.6 });
  }

  _onBossDefeated(player) {
    this._showMsg('CASCADE FAILURE TITAN DESTROYED — INFRASTRUCTURE STABILIZING', 0x00ff41);
    this.boss.dropTable.forEach(drop => {
      if (Math.random() <= drop.chance) {
        const pos = this.boss.position.clone().add(
          new THREE.Vector3((Math.random()-0.5)*4, 0, (Math.random()-0.5)*4)
        );
        this.pickups.spawn(drop.type, pos, { amount: drop.amount, ammoType: drop.ammoType });
      }
    });
    this._onDefeat?.();
  }

  resolveCheckpointDefeat() {
    this._active = false;
    this._bossDefeated = true;
    if (this.boss) {
      this.boss.isDead = true;
      this.boss.health = 0;
    }
    if (this.group) this.group.visible = false;
    this._electricPattern = [];
    this._electricWarningTimer = 0;
    this._electricActiveTimer = 0;
    this._electricPanels.forEach(panel => {
      panel.mesh.material.opacity = 0.02;
      panel.light.intensity = 0;
    });
  }

  _showMsg(text, color) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:30%; left:50%; transform:translateX(-50%);
      font-family:'Courier New',monospace; font-size:14px; letter-spacing:3px;
      color:#${color.toString(16).padStart(6,'0')};
      text-shadow:0 0 15px #${color.toString(16).padStart(6,'0')};
      pointer-events:none; white-space:nowrap; animation:objToast 3s forwards;
    `;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}


// ================================================================
// ARENA 3 — The Audit
// ================================================================

export class AuditArena {
  constructor(scene, interaction, solidCellsRef) {
    this.scene       = scene;
    this.interaction = interaction;
    this._solid      = solidCellsRef;

    this.ORIGIN_X = 29 * TILE;
    this.ORIGIN_Z = 14 * TILE;
    this.WIDTH    = 14;
    this.DEPTH    = 16;

    this.boss          = null;
    this.pickups       = new PickupManager(scene);
    this._active       = false;
    this._complete     = false;
    this._onSuccess    = null;
    this._onFailure    = null;
    this._taskConsoles = []; // { mesh, taskIndex, accessed }
    this._hudEl        = null;
    this._elapsed      = 0;
    this._terminalMesh = null;
    this._spawnWaveFn  = null;
    this._spawnPads    = [];

    this._build();
  }

  _build() {
    const layout = BOSS_ARENA_LAYOUTS['the-audit'];
    const { cx, cz, originX, originZ, wallCells } = buildArenaRoom(
      this.scene,
      this.ORIGIN_X, this.ORIGIN_Z,
      this.WIDTH, this.DEPTH,
      0x001122, 0x000a14,
      { west: [layout.entrance] }
    );

    buildSign(this.scene, 'THE AUDIT — DR CERTIFICATION EXAMINATION',
      cx, WALL_H - 0.4, originZ + 0.2, 0x0088ff);

    const W = this.WIDTH * TILE, D = this.DEPTH * TILE;
    const ox = this.ORIGIN_X, oz = this.ORIGIN_Z;

    wallCells.forEach(c => {
      this._solid.push({ ...c, minY: 0, maxY: WALL_H });
      arenaCells.push({ ...c, minY: 0, maxY: WALL_H });
    });

    buildCorridor(this.scene, 28 * TILE, 16 * TILE, TILE, 2 * TILE, 0x001724, 0x000d14, 0x2266aa);

    // Blue ambient
    const blueLight = new THREE.PointLight(0x0044ff, 4, 60, 2);
    blueLight.position.set(cx, WALL_H - 0.3, cz);
    this.scene.add(blueLight);

    // The Audit terminal — large floating screen
    this._buildAuditTerminal(cx, oz + D * 0.25);

    // 5 task consoles spread across the arena
    this._buildTaskConsoles(ox, oz, W, D);

    // Spawn boss
    const bossPos = new THREE.Vector3(cx, 2.0, oz + D * 0.25);
    this.boss = new TheAudit(bossPos);

    // Build HUD overlay
    this._buildAuditHUD();
  }

  _buildAuditTerminal(cx, cz) {
    // Large screen face
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 2.5, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x001133, transparent: true, opacity: 0.9 })
    );
    screen.position.set(cx, 2.0, cz);
    this.scene.add(screen);

    // Screen glow
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.3, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x0044ff, transparent: true, opacity: 0.3 })
    );
    glow.position.set(cx, 2.0, cz - 0.1);
    this.scene.add(glow);

    // AUDIT text on screen
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#001133';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#0088ff';
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('DR CERTIFICATION AUDIT', 256, 50);
    ctx.fillStyle = '#0044aa';
    ctx.font = '16px Courier New';
    ctx.fillText('COMPLETE ALL RECOVERY TASKS', 256, 90);
    ctx.fillText('BEFORE RTO EXPIRES', 256, 115);
    ctx.fillStyle = '#ff4400';
    ctx.font = 'bold 20px Courier New';
    ctx.fillText('FAILURE IS NOT AN OPTION', 256, 170);
    ctx.fillStyle = '#003366';
    ctx.font = '12px Courier New';
    ctx.fillText('anystackarchitect.com // DR RUNBOOK v3.1', 256, 220);

    const screenLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
    );
    screenLabel.position.set(cx, 2.0, cz - 0.12);
    this.scene.add(screenLabel);

    this._terminalMesh = screen;
  }

  _buildTaskConsoles(ox, oz, W, D) {
    const positions = [
      { x: ox + 2*TILE,        z: oz + 4*TILE  },
      { x: ox + W - 2*TILE,    z: oz + 4*TILE  },
      { x: ox + 2*TILE,        z: oz + 8*TILE  },
      { x: ox + W - 2*TILE,    z: oz + 8*TILE  },
      { x: ox + W/2,           z: oz + 12*TILE },
    ];

    positions.forEach((pos, i) => {
      const task = AUDIT_TASKS[i];

      const group = new THREE.Group();

      // Console body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x001122 })
      );
      body.position.y = 0.5;
      group.add(body);

      // Screen
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.65, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x000a1a })
      );
      screen.position.set(0, 0.85, 0.28);
      screen.rotation.x = -0.3;
      group.add(screen);

      // Task label on screen
      const c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000a1a';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#0088ff';
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(`TASK ${i+1}`, 128, 30);
      ctx.fillStyle = '#0055aa';
      ctx.font = '10px Courier New';
      const words = task.label.split(' ');
      let line = '';
      let y = 55;
      words.forEach(w => {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > 230) {
          ctx.fillText(line, 128, y); y += 16; line = w + ' ';
        } else { line = test; }
      });
      ctx.fillText(line, 128, y);

      screen.material = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c), transparent: true
      });

      // Glow indicator
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x0088ff })
      );
      glow.position.set(0, 0.52, 0.26);
      group.add(glow);

      group.position.set(pos.x, 0, pos.z);
      this.scene.add(group);

      const light = new THREE.PointLight(0x0088ff, 0.8, 4, 2);
      light.position.set(pos.x, 1.2, pos.z);
      this.scene.add(light);

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.55, 3.6, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
      );
      beacon.position.set(pos.x, 1.85, pos.z);
      this.scene.add(beacon);

      const taskConsole = { mesh: group, screen, glow, light, beacon, taskIndex: i, accessed: false };
      this._taskConsoles.push(taskConsole);

      // Register as interactable
      if (this.interaction) {
        this.interaction.register(group, 'console', `audit-task-${i}`, () => {
          if (!this._active) return;
          const cur = this.boss.currentTask;
          if (!cur || this.boss.tasks[i].complete) return;
          if (this.boss.currentTaskIndex !== i) return;
          this.boss.completeCurrentTask();
          taskConsole.accessed = true;
          taskConsole.glow.material.color.setHex(0x00ff41);
          taskConsole.light.color.setHex(0x00ff41);
        });
      }
    });

    this._spawnPads = [
      new THREE.Vector3(ox + TILE * 1.5,     0.01, oz + TILE * 2.0),
      new THREE.Vector3(ox + W - TILE * 1.5, 0.01, oz + TILE * 2.0),
      new THREE.Vector3(ox + TILE * 1.5,     0.01, oz + D - TILE * 2.0),
      new THREE.Vector3(ox + W - TILE * 1.5, 0.01, oz + D - TILE * 2.0),
      new THREE.Vector3(ox + W * 0.5,        0.01, oz + TILE * 3.0),
      new THREE.Vector3(ox + W * 0.5,        0.01, oz + D - TILE * 2.5),
    ];
  }

  _buildAuditHUD() {
    const el = document.createElement('div');
    el.id = 'audit-hud';
    el.style.cssText = `
      position: fixed;
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
      width: 200px;
      font-family: 'Courier New', monospace;
      pointer-events: none;
      display: none;
      z-index: 30;
    `;
    document.body.appendChild(el);
    this._hudEl = el;
  }

  activate() {
    this._active = true;
    this.boss.activate();
    if (this._hudEl) this._hudEl.style.display = 'block';
  }

  onSuccess(fn) { this._onSuccess = fn; }
  onFailure(fn) { this._onFailure = fn; }
  setWaveSpawner(fn) { this._spawnWaveFn = fn; }

  getNavigationTarget() {
    return this.getCurrentTaskPosition() ?? this.boss?.position?.clone?.() ?? null;
  }

  getCurrentTaskPosition() {
    const active = this._taskConsoles[this.boss?.currentTaskIndex ?? -1];
    return active ? active.mesh.position.clone() : null;
  }

  update(dt, player, camera, level) {
    if (!this._active || this._complete) {
      this.pickups.update(dt, player);
      return;
    }

    this._elapsed += dt;
    this.boss.update(dt, player, level);

    // Pulse terminal
    if (this._terminalMesh) {
      this._terminalMesh.material.opacity = 0.8 + Math.sin(this._elapsed * 2) * 0.2;
    }

    // Handle boss events
    while (this.boss.pendingEvents.length > 0) {
      const evt = this.boss.pendingEvents.shift();
      this._handleEvent(evt, player);
    }

    if (this.boss.pendingWave) {
      this.boss.pendingWave = false;
      this._spawnAuditWave();
    }

    this._updateTaskConsoleGuidance();

    // Update HUD
    this._updateAuditHUD();

    if ((this.boss.auditComplete || this.boss.rtoFailed) && !this._complete) {
      this._complete = true;
      if (this.boss.auditComplete) {
        this._onAuditComplete(player);
      } else {
        this._onRTOBreach(player);
      }
    }

    this.pickups.update(dt, player);
  }

  _handleEvent(evt, player) {
    if (evt.type === 'task_complete') {
      this._showMsg(`✓ ${AUDIT_TASKS.find(t=>t.id===evt.taskId)?.label ?? 'TASK'} COMPLETE`, 0x00ff41);
    } else if (evt.type === 'task_failed') {
      this._showMsg(`✗ TASK FAILED — -40 UPTIME`, 0xff2200);
    } else if (evt.type === 'next_task') {
      this._showMsg(`NEXT: ${AUDIT_TASKS[evt.index]?.label ?? ''}`, 0x0088ff);
    } else if (evt.type === 'rto_breach') {
      this._showMsg('RTO BREACHED — AUDIT FAILED', 0xff2200);
    } else if (evt.type === 'audit_complete') {
      this._showMsg('AUDIT PASSED — DR CERTIFICATION GRANTED', 0x00ff41);
    }
  }

  _spawnAuditWave() {
    if (!this._spawnWaveFn || this._spawnPads.length === 0) return;

    const phase = this.boss.currentTaskIndex;
    const count = Math.min(2 + phase, this._spawnPads.length);
    const typePool = [
      'corruption_crawler',
      'latency_leech',
      ...(phase >= 1 ? ['hardware_gremlin'] : []),
      ...(phase >= 2 ? ['network_phantom', 'ransomware_wraith'] : []),
      ...(phase >= 3 ? ['config_drift_specter'] : []),
    ];

    const shuffledPads = [...this._spawnPads].sort(() => Math.random() - 0.5).slice(0, count);
    const spawns = shuffledPads.map((position, idx) => ({
      type: typePool[(phase + idx + Math.floor(Math.random() * typePool.length)) % typePool.length],
      position,
    }));

    this._spawnWaveFn(spawns, {
      speedMult: 1 + phase * 0.12,
      damageMult: 1 + phase * 0.08,
      message: `AUDIT ENFORCEMENT DEPLOYED — ${count} THREATS`,
    });
  }

  _updateAuditHUD() {
    if (!this._hudEl) return;
    const rto = Math.max(0, this.boss.rtoTimer);
    const m = Math.floor(rto / 60);
    const s = Math.floor(rto % 60).toString().padStart(2,'0');
    const rtoColor = rto < 30 ? '#ff2200' : rto < 60 ? '#ffaa00' : '#00ff41';
    const curTask  = this.boss.currentTask;
    const taskTime = Math.max(0, this.boss._taskTimer ?? 0).toFixed(0);

    this._hudEl.innerHTML = `
      <div style="font-size:9px;letter-spacing:2px;color:#0088ff;margin-bottom:8px;">THE AUDIT // DR RUNBOOK</div>
      <div style="font-size:9px;color:#555;margin-bottom:4px;">RTO REMAINING</div>
      <div style="font-size:26px;color:${rtoColor};text-shadow:0 0 10px ${rtoColor};margin-bottom:10px;">${m}:${s}</div>
      ${curTask ? `
        <div style="font-size:9px;color:#555;margin-bottom:4px;">CURRENT TASK</div>
        <div style="font-size:10px;color:#0088ff;margin-bottom:4px;">${curTask.label}</div>
        <div style="font-size:9px;color:#ffaa00;">TIME: ${taskTime}s</div>
      ` : '<div style="font-size:10px;color:#00ff41;">ALL TASKS COMPLETE</div>'}
      <div style="margin-top:10px;border-top:1px solid #111;padding-top:8px;">
        ${this.boss.tasks.map((t,i) => `
          <div style="font-size:9px;color:${t.complete?'#00ff41':t.failed?'#ff2200':i===this.boss.currentTaskIndex?'#0088ff':'#333'};">
            ${t.complete?'✓':t.failed?'✗':i===this.boss.currentTaskIndex?'▸':'○'} ${t.label}
          </div>
        `).join('')}
      </div>
    `;
  }

  _updateTaskConsoleGuidance() {
    const activeTaskIndex = this.boss.currentTaskIndex;
    const pulse = 0.55 + Math.sin(this._elapsed * 5.5) * 0.25;

    this._taskConsoles.forEach((taskConsole, index) => {
      const task = this.boss.tasks[index];
      const isActive = activeTaskIndex === index && !task?.complete && !task?.failed;

      taskConsole.beacon.material.opacity = isActive ? 0.12 + pulse * 0.15 : 0.0;
      taskConsole.beacon.visible = isActive;
      taskConsole.beacon.scale.setScalar(isActive ? 0.9 + pulse * 0.35 : 0.75);
      taskConsole.beacon.rotation.y += isActive ? 0.02 : 0.005;

      if (task?.complete || taskConsole.accessed) {
        taskConsole.glow.material.color.setHex(0x00ff41);
        taskConsole.light.color.setHex(0x00ff41);
        taskConsole.light.intensity = 1.0;
        return;
      }

      if (task?.failed) {
        taskConsole.glow.material.color.setHex(0xff2200);
        taskConsole.light.color.setHex(0xff2200);
        taskConsole.light.intensity = 0.8;
        return;
      }

      taskConsole.glow.material.color.setHex(isActive ? 0xffff66 : 0x0088ff);
      taskConsole.light.color.setHex(isActive ? 0xffff66 : 0x0088ff);
      taskConsole.light.intensity = isActive ? 1.25 + pulse * 0.9 : 0.8;
    });
  }

  _onAuditComplete(player) {
    if (this._hudEl) this._hudEl.style.display = 'none';
    this._showMsg('DR CERTIFICATION GRANTED — MISSION ACCOMPLISHED', 0x00ff41);
    this.boss.dropTable.forEach(drop => {
      if (Math.random() <= drop.chance) {
        const pos = new THREE.Vector3(
          this.ORIGIN_X + this.WIDTH*TILE/2 + (Math.random()-0.5)*4,
          0,
          this.ORIGIN_Z + this.DEPTH*TILE/2
        );
        this.pickups.spawn(drop.type, pos, { amount: drop.amount });
      }
    });
    this._onSuccess?.();
  }

  _onRTOBreach(player) {
    if (this._hudEl) this._hudEl.style.display = 'none';
    this._showMsg('RTO BREACHED — CAREER TERMINATED', 0xff2200);
    this._onFailure?.();
  }

  _showMsg(text, color) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:25%; left:50%; transform:translateX(-50%);
      font-family:'Courier New',monospace; font-size:14px; letter-spacing:3px;
      color:#${color.toString(16).padStart(6,'0')};
      text-shadow:0 0 15px #${color.toString(16).padStart(6,'0')};
      pointer-events:none; white-space:nowrap; animation:objToast 3s forwards;
    `;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}
