import * as THREE from 'three';
import { Entity, AI_STATE, DAMAGE_TYPES } from './entity.js';

// ---- 1: Corruption Crawler ----
// Small, fast, melee swarm. Leaves corruption patches.

export class CorruptionCrawler extends Entity {
  constructor(position) {
    super({
      position,
      health: 30,
      speed: 5.5,
      detectionRange: 14,
      attackRange: 1.0,
      damage: 8,
      dropTable: [
        { type: 'health', chance: 0.3, amount: 10 },
        { type: 'ammo', ammoType: 'STORAGE_UNITS', chance: 0.4, amount: 8 },
      ],
    });
    this.type = 'corruption_crawler';
    this._corruptionPatches = [];
  }

  _doAttack(player) {
    player.takeDamage(this.damage, DAMAGE_TYPES.CORRUPTION);
    // Leave a corruption patch at current position
    this._corruptionPatches.push({
      position: this.position.clone(),
      life: 8.0,
    });
  }

  _getAttackCooldown() { return 0.6; }
}


// ---- 2: Ransomware Wraith ----
// Ranged — fires encryption bolts. Encrypts consoles if not killed fast.

export class RansomwareWraith extends Entity {
  constructor(position) {
    super({
      position,
      health: 60,
      speed: 3.0,
      detectionRange: 16,
      attackRange: 8.0,
      damage: 12,
      dropTable: [
        { type: 'health',  chance: 0.25, amount: 15 },
        { type: 'ammo', ammoType: 'REPLICA_CHARGES', chance: 0.5, amount: 3 },
      ],
    });
    this.type = 'ransomware_wraith';
    this._hoverOffset = Math.random() * Math.PI * 2;
    this._hoverT = 0; // accumulated game time for hover bob
    this.pendingBolts = []; // filled by EnemyManager, rendered as projectiles
  }

  _updateChase(dt, player, level) {
    // Wraith keeps mid-range — strafe rather than close in
    const dist = this.position.distanceTo(player.position);
    if (dist < 5) {
      // Back away — use axis-separated collision checks (same pattern as _moveToward)
      // so the wraith can't phase through server racks when retreating.
      const away = this.position.clone().sub(player.position).normalize();
      const step = this.speed * dt;

      const testX = this.position.clone();
      testX.x += away.x * step;
      if (!level.collidesAABB(testX, 0.35, 1.8)) this.position.x = testX.x;

      const testZ = this.position.clone();
      testZ.z += away.z * step;
      if (!level.collidesAABB(testZ, 0.35, 1.8)) this.position.z = testZ.z;

      this.velocity.copy(away).multiplyScalar(this.speed);
    } else {
      super._updateChase(dt, player, level);
    }
    // Hover bob (game time, not wall clock)
    this._hoverT += dt;
    this.position.y = 0.4 + Math.sin(this._hoverT * 2 + this._hoverOffset) * 0.2;
  }

  _doAttack(player) {
    // Queue an encryption bolt — damage is applied on contact, not at fire time.
    this.pendingBolts.push({
      from:   this.position.clone(),
      target: player.position.clone(),
      damage: this.damage,
    });
  }

  _getAttackCooldown() { return 1.8; }

  _applyResistance(amount, type) {
    // Vulnerable to hitscan, resistant to explosion
    if (type === DAMAGE_TYPES.FAILOVER || type === DAMAGE_TYPES.BFR) return amount * 0.5;
    return amount;
  }
}


// ---- 3: Hardware Gremlin ----
// Tanky, slow, charges. Explodes on death.

export class HardwareGremlin extends Entity {
  constructor(position) {
    super({
      position,
      health: 150,
      speed: 2.5,
      detectionRange: 10,
      attackRange: 1.2,
      damage: 20,
      dropTable: [
        { type: 'armor',  chance: 0.5, amount: 20 },
        { type: 'health', chance: 0.3, amount: 20 },
        { type: 'ammo', ammoType: 'FAILOVER_TOKENS', chance: 0.3, amount: 2 },
      ],
    });
    this.type = 'hardware_gremlin';
    this.pendingExplosion = false;
  }

  _applyResistance(amount, type) {
    // Weak to Failover Launcher
    if (type === DAMAGE_TYPES.FAILOVER) return amount * 1.5;
    // Resistant to beam
    if (type === DAMAGE_TYPES.BACKUP) return amount * 0.6;
    return amount;
  }

  _onDeath() {
    this.pendingExplosion = true;
  }

  _getAttackCooldown() { return 1.2; }
}


// ---- 4: Network Phantom ----
// Teleports. Flickers. Disrupts HUD when near.

export class NetworkPhantom extends Entity {
  constructor(position) {
    super({
      position,
      health: 50,
      speed: 4.0,
      detectionRange: 18,
      attackRange: 1.5,
      damage: 14,
      dropTable: [
        { type: 'ammo', ammoType: 'IMMUTABLE_LOCKS', chance: 0.4, amount: 2 },
        { type: 'health', chance: 0.2, amount: 10 },
      ],
    });
    this.type = 'network_phantom';
    this._teleportCooldown = 0;
    this._visibilityT = 1.0;
    this._flickerTimer = 0;
  }

  update(dt, player, level) {
    // Flicker visibility
    this._flickerTimer += dt;
    this._visibilityT = 0.4 + Math.abs(Math.sin(this._flickerTimer * 3.5)) * 0.6;

    // Teleport periodically when chasing
    this._teleportCooldown = Math.max(0, this._teleportCooldown - dt);
    if (this.state === AI_STATE.CHASE && this._teleportCooldown <= 0) {
      this._teleport(player, level);
      this._teleportCooldown = 3.5;
    }

    super.update(dt, player, level);
  }

  _teleport(player, level) {
    // Teleport to a random position near player
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 4;
      const newPos = new THREE.Vector3(
        player.position.x + Math.cos(angle) * dist,
        0.01,
        player.position.z + Math.sin(angle) * dist
      );
      if (!level.collidesAABB(newPos, 0.4, 1.8)) {
        this.position.copy(newPos);
        break;
      }
    }
  }

  getVisibility() { return this._visibilityT; }
}


// ---- 5: Latency Leech ----
// Attaches to player, slows movement and fire rate.

export class LatencyLeech extends Entity {
  constructor(position) {
    super({
      position,
      health: 35,
      speed: 4.5,
      detectionRange: 12,
      attackRange: 0.8,
      damage: 5,
      dropTable: [
        { type: 'ammo', ammoType: 'CDP_POINTS', chance: 0.5, amount: 20 },
        { type: 'health', chance: 0.3, amount: 8 },
      ],
    });
    this.type = 'latency_leech';
    this.isAttached = false;
    this._attachTimer = 0;
  }

  _doAttack(player) {
    this.isAttached = true;
    this._attachTimer = 4.0; // attaches for 4 seconds
    player.applyStatus?.('slowed', 4.0);
    player.takeDamage(this.damage, DAMAGE_TYPES.PHYSICAL);
  }

  update(dt, player, level) {
    if (this.isAttached) {
      // Trail just behind the player so the billboard doesn't fill the screen.
      // player.yaw forward = (-sin, 0, -cos), so behind = (+sin, 0, +cos).
      this.position.x = player.position.x + Math.sin(player.yaw) * 0.4;
      this.position.z = player.position.z + Math.cos(player.yaw) * 0.4;
      this.position.y = 0.01; // floor level — sprite mesh offset handles visual height
      this._attachTimer -= dt;
      if (this._attachTimer <= 0) {
        this.isAttached = false;
        this.state = AI_STATE.CHASE;
      }
      return;
    }
    super.update(dt, player, level);
  }

  _getAttackCooldown() { return 0.5; }
}


// ---- 6: Config Drift Specter ----
// Looks friendly at first, morphs hostile. Spawns copies.

export class ConfigDriftSpecter extends Entity {
  constructor(position, isClone = false) {
    super({
      position,
      health: isClone ? 25 : 70,
      speed: 3.5,
      detectionRange: 14,
      attackRange: 1.3,
      damage: 12,
      dropTable: isClone ? [] : [
        { type: 'health', chance: 0.4, amount: 15 },
        { type: 'ammo', ammoType: 'BACKUP_CAPACITY', chance: 0.4, amount: 30 },
      ],
    });
    this.type = 'config_drift_specter';
    this.isClone = isClone;
    this._morphT = 0; // 0=friendly, 1=hostile
    this._morphTimer = isClone ? 999 : 5.0; // clones start hostile
    this.pendingClones = [];
    this._cloneCooldown = isClone ? 999 : 8.0;
  }

  update(dt, player, level) {
    // Morph from friendly to hostile over time when player is near
    const dist = this.position.distanceTo(player.position);
    if (dist < this.detectionRange && this._morphT < 1) {
      this._morphT = Math.min(1, this._morphT + dt / this._morphTimer);
    }

    // Only become hostile after morphing.
    // Still tick maintenance so status effects expire and cooldowns count down
    // even while the specter appears friendly.
    if (this._morphT < 0.5 && this.state === AI_STATE.IDLE) {
      this._updateStatuses(dt);
      this._attackCooldown = Math.max(0, this._attackCooldown - dt);
      this._didMoveLastFrame = false;
      return;
    }

    // Spawn clone when partially morphed — place it at a random position near the
    // player rather than stacking on top of this entity.
    this._cloneCooldown = Math.max(0, this._cloneCooldown - dt);
    if (!this.isClone && this._morphT > 0.7 && this._cloneCooldown <= 0 && dist < 12) {
      const angle   = Math.random() * Math.PI * 2;
      const radius  = 3 + Math.random() * 4;
      const clonePos = new THREE.Vector3(
        player.position.x + Math.cos(angle) * radius,
        0.01,
        player.position.z + Math.sin(angle) * radius,
      );
      this.pendingClones.push(clonePos);
      this._cloneCooldown = 10.0;
    }

    super.update(dt, player, level);
  }

  getMorphT() { return this._morphT; }
  _getAttackCooldown() { return 1.0; }
}


// ---- 7: Cascade Failure Titan ----
// Mini-boss. Each hit triggers a level event. Phase-based.

export class CascadeFailureTitan extends Entity {
  constructor(position) {
    super({
      position,
      health: 600,
      speed: 1.8,
      detectionRange: 20,
      attackRange: 2.5,
      damage: 35,
      dropTable: [
        { type: 'health', chance: 1.0, amount: 50 },
        { type: 'armor',  chance: 1.0, amount: 50 },
        { type: 'ammo', ammoType: 'BFR_CELLS', chance: 1.0, amount: 1 },
        { type: 'ammo', ammoType: 'FAILOVER_TOKENS', chance: 1.0, amount: 5 },
      ],
    });
    this.type = 'cascade_titan';
    this.phase = 1; // 1-3
    this._hitsTaken = 0;
    this.pendingLevelEvents = [];
  }

  takeDamage(amount, type) {
    super.takeDamage(amount, type);
    this._hitsTaken++;

    // Every 5 hits trigger a cascade event
    if (this._hitsTaken % 5 === 0 && !this.isDead) {
      const events = ['lights_flicker', 'alarm', 'sparks'];
      this.pendingLevelEvents.push(events[Math.floor(Math.random() * events.length)]);
    }

    // Phase transitions at health thresholds
    const hpPct = this.health / this.maxHealth;
    if (hpPct < 0.66 && this.phase === 1) {
      this.phase = 2;
      this.speed = 2.5;
      this.pendingLevelEvents.push('phase2');
    } else if (hpPct < 0.33 && this.phase === 2) {
      this.phase = 3;
      this.speed = 3.2;
      this.damage = 50;
      this.pendingLevelEvents.push('phase3');
    }
  }

  _getAttackCooldown() { return 0.8; }

  _applyResistance(amount, type) {
    // Resistant to everything except Failover Launcher and BFR
    if (type === DAMAGE_TYPES.FAILOVER || type === DAMAGE_TYPES.BFR) return amount;
    return amount * 0.7;
  }
}
