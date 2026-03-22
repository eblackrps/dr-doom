import * as THREE from 'three';

export const AI_STATE = {
  IDLE:    'idle',
  PATROL:  'patrol',
  CHASE:   'chase',
  ATTACK:  'attack',
  STUNNED: 'stunned',
  DEAD:    'dead',
};

export const DAMAGE_TYPES = {
  PHYSICAL:    'physical',
  ENCRYPTION:  'encryption',  // locks weapon temporarily
  CORRUPTION:  'corruption',  // damage over time
  ELECTRICAL:  'electrical',  // from hardware gremlin explosion
  BACKUP:      'backup',
  CDP:         'cdp',
  CDP_RESTORE: 'cdp_restore',
  IMMUTABLE:   'immutable',
  FAILOVER:    'failover',
  BFR:         'bfr',
};

export class Entity {
  constructor({ position, health, speed, detectionRange, attackRange, damage, dropTable }) {
    this.position      = position.clone();
    this.maxHealth     = health;
    this.health        = health;
    this.speed         = speed ?? 3;
    this.detectionRange = detectionRange ?? 12;
    this.attackRange   = attackRange ?? 1.5;
    this.damage        = damage ?? 10;
    this.dropTable     = dropTable ?? [];

    this.state         = AI_STATE.IDLE;
    this.velocity      = new THREE.Vector3();
    this.yaw           = Math.random() * Math.PI * 2;
    this.isDead        = false;

    // Status effects
    this._statuses     = new Map(); // name -> remaining duration

    // Patrol waypoints (set by spawner or AI)
    this._patrolPoints = [];
    this._patrolIndex  = 0;
    this._patrolTimer  = 0;

    // Attack cooldown
    this._attackCooldown = 0;

    // Stun timer
    this._stunTimer    = 0;

    // Path for A*
    this._path         = [];
    this._pathTimer    = 0;

    // Stuck-navigation state
    // _prevPos: position at end of last _moveToward call, used to measure actual movement
    // _stuckTimer: how long the entity has been moving less than expected
    // _steerAngle: current rotational offset applied to the desired direction
    // _steerTimer: how long left in the current steer maneuver
    this._prevPos          = position.clone();
    this._stuckTimer       = 0;
    this._steerAngle       = 0;
    this._steerTimer       = 0;
    // Set to true whenever _moveToward runs; cleared when entity stops moving so that
    // the first _moveToward call after an ATTACK/IDLE pause re-syncs _prevPos instead
    // of counting the stand-still as a stuck frame.
    this._didMoveLastFrame = false;

    // Sight memory: how many seconds we keep chasing after losing line-of-sight.
    this._sightMemory = 0;

    // Seconds remaining on the white→red hit-flash applied to the sprite.
    this._hitFlash = 0;
  }

  // ---- Damage ----

  takeDamage(amount, type = DAMAGE_TYPES.PHYSICAL) {
    if (this.isDead) return;

    // Apply resistances (override per enemy subclass)
    const actual = this._applyResistance(amount, type);

    this.health -= actual;

    if (this.health <= 0) {
      this.health = 0;
      this._die();
    } else {
      // Stagger into chase on any hit
      if (this.state === AI_STATE.IDLE || this.state === AI_STATE.PATROL) {
        this.state = AI_STATE.CHASE;
      }
      this._hitFlash = 0.12; // trigger white→red sprite flash
    }
  }

  _applyResistance(amount, type) {
    return amount; // base: no resistance — override per enemy
  }

  applyStatus(name, duration) {
    this._statuses.set(name, duration);
    if (name === 'stunned') {
      this.state = AI_STATE.STUNNED;
      this._stunTimer = duration;
    }
  }

  _die() {
    this.isDead = true;
    this.state  = AI_STATE.DEAD;
    this._onDeath();
  }

  _onDeath() {} // override per enemy

  // ---- AI update ----

  update(dt, player, level) {
    if (this.isDead) return;

    this._updateStatuses(dt);
    this._attackCooldown = Math.max(0, this._attackCooldown - dt);

    // XZ-only distance — enemies live on the ground (Y=0), player eye is at Y=1.65.
    // Using 3D distance would inflate the value by ~1.64 units when the enemy is
    // directly under the player, preventing attacks and creating stuck-chasing loops.
    const _dx = player.position.x - this.position.x;
    const _dz = player.position.z - this.position.z;
    const distToPlayer = Math.sqrt(_dx * _dx + _dz * _dz);

    // Line-of-sight check: only detect the player when there is no wall in the way.
    // level may be null in rare subclass overrides, so fall back to pure distance.
    const inRange = distToPlayer < this.detectionRange;
    const hasLOS  = inRange && (level ? level.hasLOS(this.position, player.position) : true);
    // Sight memory: keep chasing for 2 s after losing LOS so ducking around a corner
    // doesn't instantly reset every enemy in the room.
    if (hasLOS) {
      this._sightMemory = 2.0;
    } else {
      this._sightMemory = Math.max(0, this._sightMemory - dt);
    }
    const canSee = hasLOS || this._sightMemory > 0;

    switch (this.state) {
      case AI_STATE.IDLE:
        if (canSee) this.state = AI_STATE.CHASE;
        else this._updateIdle(dt);
        break;

      case AI_STATE.PATROL:
        if (canSee) this.state = AI_STATE.CHASE;
        else this._updatePatrol(dt, level);
        break;

      case AI_STATE.CHASE:
        if (!canSee && distToPlayer > this.detectionRange * 1.5) {
          this.state = AI_STATE.PATROL;
        } else if (distToPlayer <= this.attackRange) {
          this.state = AI_STATE.ATTACK;
        } else {
          this._updateChase(dt, player, level);
        }
        break;

      case AI_STATE.ATTACK:
        if (distToPlayer > this.attackRange * 1.3) {
          this.state = AI_STATE.CHASE;
        } else {
          this._updateAttack(dt, player);
        }
        break;

      case AI_STATE.STUNNED:
        this._didMoveLastFrame = false;
        this._stunTimer -= dt;
        if (this._stunTimer <= 0) this.state = AI_STATE.CHASE;
        break;
    }

    // Face movement direction
    if (this.velocity.lengthSq() > 0.01) {
      this.yaw = Math.atan2(this.velocity.x, this.velocity.z);
    }
  }

  _updateStatuses(dt) {
    for (const [name, remaining] of this._statuses) {
      const next = remaining - dt;
      if (next <= 0) {
        this._statuses.delete(name);
      } else {
        this._statuses.set(name, next);
      }
    }
  }

  _updateIdle(dt) {
    this._didMoveLastFrame = false;
    this.velocity.set(0, 0, 0);
  }

  _updatePatrol(dt, level) {
    if (this._patrolPoints.length === 0) return;

    // Pause at each waypoint before walking on — gives a guard-on-watch feel.
    if (this._patrolTimer > 0) {
      this._patrolTimer -= dt;
      this._didMoveLastFrame = false;
      this.velocity.set(0, 0, 0);
      return;
    }

    const target = this._patrolPoints[this._patrolIndex];
    const dist = this.position.distanceTo(target);
    if (dist < 0.5) {
      this._patrolIndex = (this._patrolIndex + 1) % this._patrolPoints.length;
      this._patrolTimer = 0.5 + Math.random() * 1.5; // pause 0.5–2 s at each stop
    } else {
      this._moveToward(target, this.speed * 0.5, dt, level);
    }
  }

  _updateChase(dt, player, level) {
    this._moveToward(player.position, this.speed, dt, level);
  }

  _updateAttack(dt, player) {
    this._didMoveLastFrame = false;
    this.velocity.set(0, 0, 0);
    if (this._attackCooldown <= 0) {
      this._doAttack(player);
      this._attackCooldown = this._getAttackCooldown();
    }
  }

  _doAttack(player) {
    // Melee: deal damage directly
    player.takeDamage(this.damage, DAMAGE_TYPES.PHYSICAL);
  }

  _getAttackCooldown() { return 1.0; }

  _moveToward(target, speed, dt, level) {
    // Desired direction (XZ only — enemies live on the ground)
    let dx = target.x - this.position.x;
    let dz = target.z - this.position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < 0.0001) { this.velocity.set(0, 0, 0); return; }
    const dist = Math.sqrt(distSq);
    dx /= dist;
    dz /= dist;

    // ---- Stuck detection ----
    // Measure how far the entity actually moved since the last call.
    // If it moved less than 25% of the expected distance, it's probably
    // wedged into a wall or corner.
    //
    // Guard: if _moveToward wasn't called last frame (e.g. entity just left ATTACK
    // or STUNNED state) _prevPos is stale, so re-sync it before measuring to avoid
    // a phantom stuck tick on the first frame of movement.
    if (!this._didMoveLastFrame) {
      this._prevPos.copy(this.position);
      this._stuckTimer = 0;
    }
    this._didMoveLastFrame = true;

    const movedDist = Math.hypot(
      this.position.x - this._prevPos.x,
      this.position.z - this._prevPos.z
    );
    this._prevPos.copy(this.position);

    const expectedMove = speed * dt;
    if (movedDist < expectedMove * 0.25) {
      this._stuckTimer += dt;
    } else {
      // Recover quickly once movement resumes
      this._stuckTimer = Math.max(0, this._stuckTimer - dt * 3);
    }

    // ---- Steer maneuver ----
    // After being stuck for ~0.35s, pick a random rotation (60–108°,
    // left or right) and hold it for 0.4–0.9s.  This lets the entity
    // arc around corners and server racks without needing a pathfinder.
    if (this._stuckTimer > 0.35 && this._steerTimer <= 0) {
      const sign = Math.random() > 0.5 ? 1 : -1;
      this._steerAngle = sign * (Math.PI * 0.33 + Math.random() * Math.PI * 0.27);
      this._steerTimer = 0.4 + Math.random() * 0.5;
      this._stuckTimer = 0;
    }

    if (this._steerTimer > 0) {
      this._steerTimer -= dt;
      const cos = Math.cos(this._steerAngle);
      const sin = Math.sin(this._steerAngle);
      const rdx = dx * cos - dz * sin;
      const rdz = dx * sin + dz * cos;
      dx = rdx;
      dz = rdz;
    }

    // ---- Move with axis-separated wall sliding ----
    const step = speed * dt;

    const testX = this.position.clone();
    testX.x += dx * step;
    if (!level.collidesAABB(testX, 0.35, 1.8)) {
      this.position.x = testX.x;
      this.velocity.x = dx * speed;
    } else {
      this.velocity.x = 0;
    }

    const testZ = this.position.clone();
    testZ.z += dz * step;
    if (!level.collidesAABB(testZ, 0.35, 1.8)) {
      this.position.z = testZ.z;
      this.velocity.z = dz * speed;
    } else {
      this.velocity.z = 0;
    }

    this.position.y = 0.01;
  }

  hasStatus(name) {
    return this._statuses.has(name);
  }
}
