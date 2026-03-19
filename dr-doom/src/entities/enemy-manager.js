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

const TILE = 4;

// Spawn definitions scattered across all 6 rooms
const SPAWN_DEFS = [
  // Main Server Floor — crawlers and wraiths
  { type: 'corruption_crawler', col: 4,  row: 4  },
  { type: 'corruption_crawler', col: 8,  row: 7  },
  { type: 'corruption_crawler', col: 10, row: 3  },
  { type: 'ransomware_wraith',  col: 7,  row: 5  },
  { type: 'ransomware_wraith',  col: 3,  row: 9  },

  // Storage Vault — gremlins and leeches
  { type: 'hardware_gremlin',   col: 17, row: 4  },
  { type: 'hardware_gremlin',   col: 22, row: 7  },
  { type: 'latency_leech',      col: 19, row: 9  },
  { type: 'latency_leech',      col: 25, row: 3  },

  // Network Core — phantoms and specters
  { type: 'network_phantom',    col: 3,  row: 15 },
  { type: 'network_phantom',    col: 7,  row: 18 },
  { type: 'config_drift_specter', col: 5, row: 17 },
  { type: 'config_drift_specter', col: 9, row: 14 },

  // Cold Aisle — mixed
  { type: 'corruption_crawler', col: 14, row: 15 },
  { type: 'ransomware_wraith',  col: 16, row: 18 },
  { type: 'latency_leech',      col: 15, row: 16 },

  // Management Console Room — specters and wraiths
  { type: 'config_drift_specter', col: 22, row: 15 },
  { type: 'config_drift_specter', col: 25, row: 18 },
  { type: 'ransomware_wraith',  col: 23, row: 17 },

  // Emergency Exit Corridor — titan guarding the exit
  { type: 'cascade_titan',      col: 13, row: 27 },
  { type: 'hardware_gremlin',   col: 11, row: 25 },
  { type: 'corruption_crawler', col: 15, row: 26 },
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

export class EnemyManager {
  constructor(scene, weaponSystem) {
    this.scene         = scene;
    this.weaponSystem  = weaponSystem;
    this.enemies       = []; // { entity, sprite, group, deathTimer }
    this.pickups       = new PickupManager(scene);

    this._encryptionBolts   = []; // projectile-like objects from wraiths
    this._corruptionPatches = []; // floor DOT zones

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
      this._spawnEnemy(def.type, pos);
    });
  }

  _spawnEnemy(type, position, mults = {}) {
    const entity = makeEnemy(type, position);
    if (!entity) return;

    if (mults.speedMult)  entity.speed  *= mults.speedMult;
    if (mults.damageMult) entity.damage *= mults.damageMult;

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

    this.enemies.push({ entity, sprite, group, deathTimer: -1 });
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
          this._spawnEncryptionBolt(bolt.from, bolt.target, player);
        });
        entity.pendingBolts = [];
      }

      // Handle Config Drift clones
      if (entity.pendingClones?.length > 0) {
        entity.pendingClones.forEach(pos => {
          this._spawnEnemy('config_drift_specter_clone', pos);
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
      group.position.y = entity.position.y;

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

      // Config Drift morph — tint sprite
      if (entity.type === 'config_drift_specter') {
        const m = entity.getMorphT?.() ?? 0;
        sprite.mesh.material.color.setRGB(1, 1 - m * 0.5, 1 - m * 0.8);
      }
    }

    // Update encryption bolts
    this._updateBolts(dt, player);

    // Update corruption patches
    this._updatePatches(dt, player);

    // Update pickups
    this.pickups.update(dt, player);

    // Wave respawn
    if (!this._bossActive) {
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

  _spawnDrops(entity) {
    entity.dropTable.forEach(drop => {
      if (Math.random() > drop.chance) return;
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

    let life = 0.5;
    let _last = performance.now();
    const tick = (now) => {
      const dt = (now - _last) / 1000; _last = now;
      life -= dt;
      sphere.scale.setScalar(1 + (1 - life / 0.5) * 30);
      sphere.material.opacity = Math.max(0, life / 0.5 * 0.8);
      light.intensity = Math.max(0, life / 0.5 * 6);
      if (life > 0) requestAnimationFrame(tick);
      else { this.scene.remove(sphere); this.scene.remove(light); geo.dispose(); mat.dispose(); }
    };
    requestAnimationFrame(tick);
  }

  _spawnEncryptionBolt(from, target, player) {
    const geo = new THREE.SphereGeometry(0.1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    mesh.position.y = 1.0;
    this.scene.add(mesh);

    const dir = target.clone().sub(from).normalize();
    dir.y = 0;

    const bolt = { mesh, dir, speed: 9, life: 3.0, player };
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
        // Hit — lock player weapon temporarily
        const weapon = player.weaponSystem?.current;
        if (weapon?.lock) {
          weapon.lock();
          setTimeout(() => { if (weapon.unlock) weapon.unlock(); }, 2000);
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
    // Corruption crawlers leave patches — DOT zones
    this.enemies.forEach(e => {
      if (e.entity.type !== 'corruption_crawler') return;
      e.entity._corruptionPatches?.forEach(patch => {
        patch.life -= dt;
        const dist = player.position.distanceTo(patch.position);
        if (dist < 1.2) {
          player.takeDamage(5 * dt, 'corruption');
        }
      });
      if (e.entity._corruptionPatches) {
        e.entity._corruptionPatches = e.entity._corruptionPatches.filter(p => p.life > 0);
      }
    });
  }

  _handleLevelEvent(evt) {
    // Cascade titan events — basic implementations
    if (evt === 'lights_flicker') {
      document.body.style.transition = 'filter 0.1s';
      document.body.style.filter = 'brightness(0.3)';
      setTimeout(() => { document.body.style.filter = ''; }, 200);
      setTimeout(() => { document.body.style.filter = 'brightness(0.5)'; }, 300);
      setTimeout(() => { document.body.style.filter = ''; }, 450);
    } else if (evt === 'alarm') {
      document.getElementById('damage-overlay').style.boxShadow = 'inset 0 0 40px #ff220066';
      setTimeout(() => { document.getElementById('damage-overlay').style.boxShadow = ''; }, 500);
    }
  }

  suppressWaves() { this._bossActive = true;  this._waveTimer = -1; }
  resumeWaves()   { this._bossActive = false; }

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
      this._spawnEnemy(def.type, pos, { speedMult: finalSpeed, damageMult: finalDamage });
    });

    this._showWaveToast(`WAVE ${this._waveNum} INCOMING — ${count} THREATS DETECTED`);
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

  getAllEnemyEntities() {
    return this.enemies.map(e => e.entity);
  }
}
