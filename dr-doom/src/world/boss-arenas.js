import * as THREE from 'three';
import { RansomwareKing, CascadeFailureTitanFull, TheAudit, AUDIT_TASKS } from '../entities/bosses.js';
import { buildSpriteSheet, BillboardSprite } from '../entities/sprites.js';
import { PickupManager } from '../entities/pickups.js';

const TILE   = 4;
const WALL_H = 4;

// ---- Arena geometry helper ----

function buildArenaRoom(scene, originX, originZ, width, depth, wallColor, floorColor) {
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

  // Walls: N S E W
  const walls = [
    { pos: [cx, WALL_H/2, originZ],      size: [W, WALL_H, 0.3] },         // N
    { pos: [cx, WALL_H/2, originZ + D],  size: [W, WALL_H, 0.3] },         // S
    { pos: [originX,     WALL_H/2, cz],  size: [0.3, WALL_H, D] },         // W
    { pos: [originX + W, WALL_H/2, cz],  size: [0.3, WALL_H, D] },         // E
  ];
  walls.forEach(({ pos, size }) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
    m.position.set(...pos);
    scene.add(m);
  });

  return { cx, cz, W, D, originX, originZ };
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

    this._build();
  }

  _build() {
    const { cx, cz, originX, originZ } = buildArenaRoom(
      this.scene,
      this.ORIGIN_X, this.ORIGIN_Z,
      this.WIDTH, this.DEPTH,
      0x330011, 0x110008
    );

    buildSign(this.scene, '⚠ ENCRYPTION ZONE — RANSOMWARE KING', cx, WALL_H - 0.4, originZ + 0.2, 0xff0066);

    // Register arena walls as solid
    const W = this.WIDTH * TILE, D = this.DEPTH * TILE;
    const ox = this.ORIGIN_X, oz = this.ORIGIN_Z;
    [
      { minX: ox,   maxX: ox+W, minZ: oz-0.3, maxZ: oz    }, // N
      { minX: ox,   maxX: ox+W, minZ: oz+D,   maxZ: oz+D+0.3 }, // S
      { minX: ox-0.3, maxX: ox,  minZ: oz,   maxZ: oz+D  }, // W
      { minX: ox+W, maxX: ox+W+0.3, minZ: oz, maxZ: oz+D }, // E
    ].forEach(c => {
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
    const corrW = 2 * TILE, corrH = TILE;
    const corrX = 27 * TILE, corrZ = 5 * TILE;

    const mat = new THREE.MeshBasicMaterial({ color: 0x220008 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(corrW, corrH), mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(corrX + corrW/2, 0, corrZ + corrH/2);
    this.scene.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(corrW, corrH),
      new THREE.MeshBasicMaterial({ color: 0x110005 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(corrX + corrW/2, WALL_H, corrZ + corrH/2);
    this.scene.add(ceil);

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

  update(dt, player, camera) {
    if (!this._active || this._bossDefeated) {
      this.pickups.update(dt, player);
      return;
    }

    this.boss.update(dt, player, { collidesAABB: () => false, getStepHeight: () => 0 });

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

    // Encryption bolts
    if (this.boss.pendingBolts.length > 0) {
      this.boss.pendingBolts.forEach(b => this._spawnBolt(b.from, b.target, player));
      this.boss.pendingBolts = [];
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
    } else if (evt.type === 'nodes_cleared') {
      this._showArenaMessage('DECRYPTION NODES CLEARED — BOSS VULNERABLE', 0x00ffaa);
      // Decrypt all panels briefly
      this._panels.forEach(p => {
        if (p.encrypted) {
          p.encrypted = false;
          p.mesh.material.color.setHex(0x1a000a);
          if (p._lockMesh) { this.scene.remove(p._lockMesh); p._lockMesh = null; }
        }
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

    let life = 3.0;
    let _last = performance.now();
    const tick = (now) => {
      const dt = (now - _last) / 1000; _last = now;
      life -= dt;
      mesh.position.addScaledVector(dir, 0.15);
      mesh.rotation.y += 0.1;
      if (mesh.position.distanceTo(player.position) < 0.8) {
        player.weaponSystem?.current?.lock?.();
        setTimeout(() => player.weaponSystem?.current?.unlock?.(), 2500);
        life = 0;
      }
      if (life > 0) requestAnimationFrame(tick);
      else { this.scene.remove(mesh); geo.dispose(); }
    };
    requestAnimationFrame(tick);
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
    this._lightsOut    = false;
    this._ambientLight = null;
    this._elapsed      = 0;

    this._build();
  }

  _build() {
    const { cx, cz, originX, originZ } = buildArenaRoom(
      this.scene,
      this.ORIGIN_X, this.ORIGIN_Z,
      this.WIDTH, this.DEPTH,
      0x221100, 0x0d0800
    );

    buildSign(this.scene, '⚠ CASCADE FAILURE ZONE — CRITICAL INFRASTRUCTURE BREACH',
      cx, WALL_H - 0.4, originZ + 0.2, 0xff4400);

    const W = this.WIDTH * TILE, D = this.DEPTH * TILE;
    const ox = this.ORIGIN_X, oz = this.ORIGIN_Z;

    // Register walls
    [
      { minX: ox,   maxX: ox+W,     minZ: oz-0.3,    maxZ: oz       },
      { minX: ox,   maxX: ox+W,     minZ: oz+D,      maxZ: oz+D+0.3 },
      { minX: ox-0.3, maxX: ox,     minZ: oz,        maxZ: oz+D     },
      { minX: ox+W, maxX: ox+W+0.3, minZ: oz,        maxZ: oz+D     },
    ].forEach(c => {
      this._solid.push({ ...c, minY: 0, maxY: WALL_H });
    });

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

  activate() { this._active = true; }
  onDefeat(fn) { this._onDefeat = fn; }

  update(dt, player, camera) {
    if (!this._active || this._bossDefeated) {
      this.pickups.update(dt, player);
      return;
    }

    this._elapsed += dt;
    this.boss.update(dt, player, { collidesAABB: () => false, getStepHeight: () => 0 });
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

    if (this.boss.isDead && !this._bossDefeated) {
      this._bossDefeated = true;
      this._onBossDefeated(player);
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
    }
  }

  _triggerArenaEvent(event) {
    if (event === 'lights_flicker' || event === 'lights_out') {
      document.body.style.filter = 'brightness(0.2)';
      setTimeout(() => { document.body.style.filter = ''; }, event === 'lights_out' ? 3000 : 300);
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

  _spawnSparks() {
    for (let i = 0; i < 5; i++) {
      const spark = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      spark.position.set(
        this.ORIGIN_X + Math.random() * this.WIDTH * TILE,
        0.5 + Math.random() * 2,
        this.ORIGIN_Z + Math.random() * this.DEPTH * TILE
      );
      this.scene.add(spark);
      setTimeout(() => this.scene.remove(spark), 300 + Math.random() * 500);
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
    let life = 0.6;
    let _last = performance.now();
    const tick = (now) => {
      const dt = (now - _last) / 1000; _last = now;
      life -= dt;
      s.scale.setScalar(1 + (1 - life/0.6) * 20);
      s.material.opacity = Math.max(0, life/0.6 * 0.8);
      l.intensity = Math.max(0, life/0.6 * 8);
      if (life > 0) requestAnimationFrame(tick);
      else { this.scene.remove(s); this.scene.remove(l); geo.dispose(); }
    };
    requestAnimationFrame(tick);
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
    this._onComplete   = null;
    this._taskConsoles = []; // { mesh, taskIndex, accessed }
    this._hudEl        = null;
    this._elapsed      = 0;
    this._terminalMesh = null;

    this._build();
  }

  _build() {
    const { cx, cz, originX, originZ } = buildArenaRoom(
      this.scene,
      this.ORIGIN_X, this.ORIGIN_Z,
      this.WIDTH, this.DEPTH,
      0x001122, 0x000a14
    );

    buildSign(this.scene, 'THE AUDIT — DR CERTIFICATION EXAMINATION',
      cx, WALL_H - 0.4, originZ + 0.2, 0x0088ff);

    const W = this.WIDTH * TILE, D = this.DEPTH * TILE;
    const ox = this.ORIGIN_X, oz = this.ORIGIN_Z;

    [
      { minX: ox,   maxX: ox+W,     minZ: oz-0.3,    maxZ: oz       },
      { minX: ox,   maxX: ox+W,     minZ: oz+D,      maxZ: oz+D+0.3 },
      { minX: ox-0.3, maxX: ox,     minZ: oz,        maxZ: oz+D     },
      { minX: ox+W, maxX: ox+W+0.3, minZ: oz,        maxZ: oz+D     },
    ].forEach(c => {
      this._solid.push({ ...c, minY: 0, maxY: WALL_H });
    });

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
      new THREE.MeshBasicMaterial({ color: 0x001133 })
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

      const taskConsole = { mesh: group, screen, glow, light, taskIndex: i, accessed: false };
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

  onComplete(fn) { this._onComplete = fn; }

  update(dt, player, camera) {
    if (!this._active || this._complete) {
      this.pickups.update(dt, player);
      return;
    }

    this._elapsed += dt;
    this.boss.update(dt, player, null);

    // Pulse terminal
    if (this._terminalMesh) {
      this._terminalMesh.material.opacity = 0.8 + Math.sin(this._elapsed * 2) * 0.2;
    }

    // Handle boss events
    while (this.boss.pendingEvents.length > 0) {
      const evt = this.boss.pendingEvents.shift();
      this._handleEvent(evt, player);
    }

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
    this._onComplete?.();
  }

  _onRTOBreach(player) {
    if (this._hudEl) this._hudEl.style.display = 'none';
    player.takeDamage(50, 'physical');
    this._showMsg('RTO BREACHED — CAREER TERMINATED', 0xff2200);
    setTimeout(() => this._onComplete?.(), 3000);
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
