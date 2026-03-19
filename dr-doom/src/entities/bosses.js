import * as THREE from 'three';
import { Entity, AI_STATE, DAMAGE_TYPES } from './entity.js';

// ---- Boss base ----

export class Boss extends Entity {
  constructor(config) {
    super(config);
    this.phase          = 1;
    this.maxPhases      = config.maxPhases ?? 3;
    this.isBoss         = true;
    this.name           = config.name ?? 'BOSS';
    this.pendingEvents  = [];
    this._phaseThresholds = config.phaseThresholds ?? [0.66, 0.33];
    this._vulnerableWindow = false;
    this._vulnerableTimer  = 0;
  }

  takeDamage(amount, type) {
    if (!this._vulnerableWindow && this.phase > 1) {
      amount *= 0.15; // near-immune outside vulnerable windows in later phases
    }
    super.takeDamage(amount, type);
    this._checkPhaseTransition();
  }

  _checkPhaseTransition() {
    const pct = this.health / this.maxHealth;
    for (let i = 0; i < this._phaseThresholds.length; i++) {
      const threshold = this._phaseThresholds[i];
      const targetPhase = i + 2;
      if (pct < threshold && this.phase < targetPhase) {
        this.phase = targetPhase;
        this._onPhaseTransition(targetPhase);
        break;
      }
    }
  }

  _onPhaseTransition(phase) {
    this.pendingEvents.push({ type: 'phase_change', phase });
    // Open a vulnerability window on transition
    this._vulnerableWindow = true;
    this._vulnerableTimer = 4.0;
  }

  update(dt, player, level) {
    if (this.isDead) return;
    if (this._vulnerableTimer > 0) {
      this._vulnerableTimer -= dt;
      if (this._vulnerableTimer <= 0) this._vulnerableWindow = false;
    }
    super.update(dt, player, level);
  }

  isVulnerable() { return this._vulnerableWindow || this.phase === 1; }
}


// ---- Boss 1: Ransomware King ----
// Level 5 boss. Encrypts floor panels over time (shrinks playable space).
// Player must shoot decryption nodes on its body between encryption waves.
// DPS check + spatial awareness.

export class RansomwareKing extends Boss {
  constructor(position) {
    super({
      position,
      health: 800,
      speed: 2.2,
      detectionRange: 999,
      attackRange: 3.0,
      damage: 18,
      name: 'RANSOMWARE KING',
      maxPhases: 3,
      phaseThresholds: [0.66, 0.33],
      dropTable: [
        { type: 'health',  chance: 1.0, amount: 60 },
        { type: 'armor',   chance: 1.0, amount: 60 },
        { type: 'ammo', ammoType: 'BFR_CELLS',      chance: 1.0, amount: 2 },
        { type: 'ammo', ammoType: 'FAILOVER_TOKENS', chance: 1.0, amount: 10 },
      ],
    });
    this.type = 'ransomware_king';

    // Encryption wave state
    this._encryptTimer    = 5.0;  // time between encryption waves
    this._encryptInterval = 5.0;
    this.encryptedPanels  = [];   // { col, row } — managed by BossArena
    this.pendingEncrypt   = false;

    // Decryption nodes — weak points on the boss body
    // When all 3 are shot in a cycle, boss takes full damage for a window
    this._nodeCount    = 3;
    this._nodesHit     = 0;
    this._nodePositions = [
      new THREE.Vector3(-0.4, 1.2, 0),
      new THREE.Vector3( 0.0, 1.8, 0),
      new THREE.Vector3( 0.4, 1.2, 0),
    ];
    this.pendingBolts = [];
  }

  update(dt, player, level) {
    if (this.isDead) return;

    // Encryption wave timer
    this._encryptTimer -= dt;
    if (this._encryptTimer <= 0) {
      const interval = Math.max(2.5, this._encryptInterval - (this.phase - 1) * 0.8);
      this._encryptTimer = interval;
      this.pendingEncrypt = true;
    }

    // Phase 2+: fire more encryption bolts
    if (this.state === AI_STATE.ATTACK && this._attackCooldown <= 0) {
      const boltsPerAttack = this.phase;
      for (let i = 0; i < boltsPerAttack; i++) {
        const spread = new THREE.Vector3(
          player.position.x + (Math.random() - 0.5) * 2,
          player.position.y,
          player.position.z + (Math.random() - 0.5) * 2
        );
        this.pendingBolts.push({ from: this.position.clone(), target: spread });
      }
    }

    super.update(dt, player, level);
  }

  hitNode(nodeIndex) {
    this._nodesHit++;
    if (this._nodesHit >= this._nodeCount) {
      this._nodesHit = 0;
      this._vulnerableWindow = true;
      this._vulnerableTimer = 3.5;
      this.pendingEvents.push({ type: 'nodes_cleared' });
    }
    this.pendingEvents.push({ type: 'node_hit', index: nodeIndex });
  }

  _getAttackCooldown() { return Math.max(0.8, 1.5 - (this.phase - 1) * 0.3); }

  _applyResistance(amount, type) {
    if (!this.isVulnerable()) return amount * 0.1;
    if (type === DAMAGE_TYPES.IMMUTABLE) return amount * 1.5;
    return amount;
  }
}


// ---- Boss 2: Cascade Failure Titan (full) ----
// Level 6 boss. Each phase triggers environmental disasters.
// Phase 1: normal. Phase 2: lights out (flashlight mode signal).
// Phase 3: electrified floor patterns. Phase 4: maximum chaos.

export class CascadeFailureTitanFull extends Boss {
  constructor(position) {
    super({
      position,
      health: 1200,
      speed: 1.6,
      detectionRange: 999,
      attackRange: 2.8,
      damage: 40,
      name: 'CASCADE FAILURE TITAN',
      maxPhases: 4,
      phaseThresholds: [0.75, 0.5, 0.25],
      dropTable: [
        { type: 'health',  chance: 1.0, amount: 80 },
        { type: 'armor',   chance: 1.0, amount: 80 },
        { type: 'ammo', ammoType: 'BFR_CELLS',       chance: 1.0, amount: 3 },
        { type: 'ammo', ammoType: 'FAILOVER_TOKENS',  chance: 1.0, amount: 15 },
        { type: 'ammo', ammoType: 'IMMUTABLE_LOCKS',  chance: 1.0, amount: 10 },
      ],
    });
    this.type = 'cascade_titan_full';

    this._chargeTimer  = 4.0;
    this._isCharging   = false;
    this._chargeDir    = new THREE.Vector3();
    this._chargeSpeed  = 12;
    this._chargeTime   = 0;
    this.pendingExplosion = false;
    this._hitsTaken    = 0;
  }

  takeDamage(amount, type) {
    super.takeDamage(amount, type);
    this._hitsTaken++;
    if (this._hitsTaken % 4 === 0 && !this.isDead) {
      const events = ['sparks', 'alarm', 'lights_flicker'];
      this.pendingEvents.push({
        type: 'arena_event',
        event: events[Math.floor(Math.random() * events.length)],
      });
    }
  }

  _onPhaseTransition(phase) {
    super._onPhaseTransition(phase);
    const phaseEvents = {
      2: 'lights_out',
      3: 'electrify_floor',
      4: 'maximum_chaos',
    };
    if (phaseEvents[phase]) {
      this.pendingEvents.push({ type: 'arena_event', event: phaseEvents[phase] });
    }
    this.speed += 0.4;
    this.damage += 8;
  }

  update(dt, player, level) {
    if (this.isDead) return;

    // Charge attack
    this._chargeTimer -= dt;
    if (this._chargeTimer <= 0 && !this._isCharging) {
      this._chargeTimer = Math.max(3.0, 6.0 - this.phase * 0.8);
      this._isCharging = true;
      this._chargeTime = 0;
      this._chargeDir = player.position.clone()
        .sub(this.position).normalize();
      this.pendingEvents.push({ type: 'charge_warning' });
    }

    if (this._isCharging) {
      this._chargeTime += dt;
      const chargeDelta = this._chargeDir.clone()
        .multiplyScalar(this._chargeSpeed * dt);
      const next = this.position.clone().add(chargeDelta);
      if (!level.collidesAABB(next, 0.8, 2.5)) {
        this.position.copy(next);
      } else {
        // Hit a wall — end charge, mini explosion
        this._isCharging = false;
        this.pendingExplosion = true;
      }
      if (this._chargeTime > 1.2) this._isCharging = false;

      // Charge collision with player
      if (this.position.distanceTo(player.position) < 1.5) {
        player.takeDamage(this.damage * 2, DAMAGE_TYPES.PHYSICAL);
        this._isCharging = false;
      }
      return;
    }

    super.update(dt, player, level);
  }

  _applyResistance(amount, type) {
    if (type === DAMAGE_TYPES.FAILOVER || type === DAMAGE_TYPES.BFR) return amount * 1.2;
    if (!this.isVulnerable()) return amount * 0.5;
    return amount;
  }

  _getAttackCooldown() { return Math.max(0.6, 1.2 - (this.phase - 1) * 0.15); }
}


// ---- Boss 3: The Audit ----
// Level 7 boss. Not a monster — a massive floating terminal.
// Player must complete 5 DR tasks (reach console under fire) within RTO timer.
// Fail a task = massive damage. Complete all = victory.

export const AUDIT_TASKS = [
  {
    id: 'task-restore-vm',
    label: 'RESTORE PRIMARY VM',
    detail: 'Boot vm-prod-01 from backup snapshot',
    col: 0, row: 0, // set by arena
    timeLimit: 45,
  },
  {
    id: 'task-verify-backup',
    label: 'VERIFY BACKUP INTEGRITY',
    detail: 'Confirm latest backup job completed without errors',
    col: 0, row: 0,
    timeLimit: 40,
  },
  {
    id: 'task-reconnect-network',
    label: 'RECONNECT NETWORK NODE',
    detail: 'Re-establish spine connection to core-sw-01',
    col: 0, row: 0,
    timeLimit: 35,
  },
  {
    id: 'task-confirm-replication',
    label: 'CONFIRM REPLICATION',
    detail: 'Verify Veeam replication job to Site-B is current',
    col: 0, row: 0,
    timeLimit: 30,
  },
  {
    id: 'task-initiate-failover',
    label: 'INITIATE SITE FAILOVER',
    detail: 'Execute orchestrated failover to DR site',
    col: 0, row: 0,
    timeLimit: 25,
  },
];

export class TheAudit extends Boss {
  constructor(position) {
    super({
      position,
      health: 9999, // killed by completing tasks, not damage
      speed: 0,
      detectionRange: 999,
      attackRange: 0,
      damage: 0,
      name: 'THE AUDIT',
      maxPhases: 1,
      phaseThresholds: [],
      dropTable: [
        { type: 'health', chance: 1.0, amount: 100 },
        { type: 'armor',  chance: 1.0, amount: 100 },
      ],
    });
    this.type = 'the_audit';

    this.tasks              = AUDIT_TASKS.map(t => ({ ...t, complete: false, failed: false }));
    this.currentTaskIndex   = 0;
    this._taskTimer         = AUDIT_TASKS[0].timeLimit;
    this.rtoTimer           = 180; // 3 minute RTO
    this.rtoFailed          = false;
    this.auditComplete      = false;
    this._waveTimer         = 8.0;
    this.pendingWave        = false;
    this._active            = false;
  }

  activate() { this._active = true; }

  get currentTask() {
    return this.tasks[this.currentTaskIndex] ?? null;
  }

  completeCurrentTask() {
    const task = this.tasks[this.currentTaskIndex];
    if (!task) return;
    task.complete = true;
    this.pendingEvents.push({ type: 'task_complete', taskId: task.id });
    this.currentTaskIndex++;

    if (this.currentTaskIndex >= this.tasks.length) {
      this.auditComplete = true;
      this.isDead = true;
      this.pendingEvents.push({ type: 'audit_complete' });
    } else {
      this._taskTimer = this.tasks[this.currentTaskIndex].timeLimit;
      this.pendingEvents.push({ type: 'next_task', index: this.currentTaskIndex });
    }
  }

  update(dt, player, level) {
    if (!this._active || this.isDead || this.rtoFailed) return;

    // RTO countdown
    this.rtoTimer -= dt;
    if (this.rtoTimer <= 0) {
      this.rtoFailed = true;
      this.pendingEvents.push({ type: 'rto_breach' });
      return;
    }

    // Current task timer
    if (this.currentTask && !this.currentTask.complete) {
      this._taskTimer -= dt;
      if (this._taskTimer <= 0) {
        // Task failed — damage player
        this.tasks[this.currentTaskIndex].failed = true;
        this.pendingEvents.push({
          type: 'task_failed',
          taskId: this.currentTask.id,
        });
        player.takeDamage(40, DAMAGE_TYPES.PHYSICAL);
        // Skip to next task with penalty
        this.currentTaskIndex++;
        if (this.currentTaskIndex < this.tasks.length) {
          this._taskTimer = this.tasks[this.currentTaskIndex].timeLimit;
        }
      }
    }

    // Wave spawns
    this._waveTimer -= dt;
    if (this._waveTimer <= 0) {
      this._waveTimer = Math.max(5.0, 10.0 - this.currentTaskIndex * 1.5);
      this.pendingWave = true;
    }
  }

  // The Audit can't be damaged normally
  takeDamage() {}

  _applyResistance() { return 0; }
}
