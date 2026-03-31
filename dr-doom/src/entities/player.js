import * as THREE from 'three';
import { loadGameplaySettings } from '../settings/gameplay-settings.js';

const PLAYER_HEIGHT   = 1.65;
const PLAYER_RADIUS   = 0.3;
const MOVE_SPEED      = 12.0;   // DOOM-fast. Always sprinting.
const BASE_MOUSE_SENS = 0.0018;
const BOB_FREQ        = 8.0;
const BOB_AMP_Y       = 0.06;
const BOB_AMP_X       = 0.03;
const GRAVITY         = -20;
const JUMP_VELOCITY   = 7;

export class Player {
  constructor(camera, input, settings = loadGameplaySettings()) {
    this.camera = camera;
    this.input = input;

    // Position & velocity
    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 0);
    this.velocity = new THREE.Vector3();
    this.onGround = true;

    // Look angles (yaw = left/right, pitch = up/down)
    this.yaw   = 0;
    this.pitch = 0;

    // Head bob state
    this._bobTime = 0;
    this._bobOffset = new THREE.Vector3();

    // For AABB collision
    this._move = new THREE.Vector3();

    // Status timers
    this._slowTimer = 0;
    this._invertY = !!settings.invertY;
    this._mouseSensitivity = BASE_MOUSE_SENS * (settings.mouseSensitivity ?? 1.0);

    // Stats (referenced by HUD)
    this.health = 100;
    this.armor  = 100;
    this.ammo   = Infinity;
  }

  applyLookSettings(settings = loadGameplaySettings()) {
    this._invertY = !!settings.invertY;
    this._mouseSensitivity = BASE_MOUSE_SENS * (settings.mouseSensitivity ?? 1.0);
  }

  setPosition(pos) {
    this.position.copy(pos);
    this.position.y += PLAYER_HEIGHT;
  }

  update(dt, level) {
    this._handleLook();
    this._handleMovement(dt, level);
    this._updateBob(dt);
    this._applyToCamera();
  }

  _handleLook() {
    const { dx, dy } = this.input.mouse;
    if (!this.input.isLocked) return;

    this.yaw -= dx * this._mouseSensitivity;
    const lookDelta = (this._invertY ? -dy : dy) * this._mouseSensitivity;
    this.pitch -= lookDelta;

    // Clamp pitch to prevent full vertical look (DOOM feel)
    this.pitch = Math.max(-Math.PI * 0.35, Math.min(Math.PI * 0.35, this.pitch));
  }

  _handleMovement(dt, level) {
    const input = this.input;

    // Build movement vector in camera-local space
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw), 0, -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.yaw), 0, -Math.sin(this.yaw)
    );

    this._move.set(0, 0, 0);

    if (input.isActionActive('moveForward'))  this._move.addScaledVector(forward, 1);
    if (input.isActionActive('moveBackward')) this._move.addScaledVector(forward, -1);
    if (input.isActionActive('moveRight'))    this._move.addScaledVector(right, 1);
    if (input.isActionActive('moveLeft'))     this._move.addScaledVector(right, -1);

    // Normalize diagonal movement
    if (this._move.lengthSq() > 0) {
      this._move.normalize().multiplyScalar(MOVE_SPEED);
    }

    this.velocity.x = this._move.x;
    this.velocity.z = this._move.z;

    // Gravity
    if (!this.onGround) {
      this.velocity.y += GRAVITY * dt;
    } else {
      this.velocity.y = 0;
      // Jump
      if (input.isActionActive('jump')) {
        this.velocity.y = JUMP_VELOCITY;
        this.onGround = false;
      }
    }

    // Move with AABB collision
    // Apply slow status
    if (this._slowTimer > 0) {
      this._slowTimer -= dt;
      this.velocity.multiplyScalar(0.45);
    }
    const delta = this.velocity.clone().multiplyScalar(dt);
    this._moveWithCollision(delta, level);
  }

  _moveWithCollision(delta, level) {
    // Separate X and Z movement for sliding collision response
    const testPos = this.position.clone();

    // Move X — with step-up (wall-edge case)
    testPos.x += delta.x;
    if (level.collidesAABB(testPos, PLAYER_RADIUS, PLAYER_HEIGHT)) {
      const stepH = level.getStepHeight ? level.getStepHeight(testPos, PLAYER_RADIUS) : 0;
      if (stepH > 0 && this.onGround) {
        testPos.y = this.position.y + stepH + 0.01;
      } else {
        testPos.x -= delta.x;
      }
    }

    // Move Z — with step-up (wall-edge case)
    testPos.z += delta.z;
    if (level.collidesAABB(testPos, PLAYER_RADIUS, PLAYER_HEIGHT)) {
      const stepH = level.getStepHeight ? level.getStepHeight(testPos, PLAYER_RADIUS) : 0;
      if (stepH > 0 && this.onGround) {
        testPos.y = this.position.y + stepH + 0.01;
      } else {
        testPos.z -= delta.z;
      }
    }

    // Proactive raised-floor elevation.
    // Step cells are intentionally skipped in collidesAABB (so enemies aren't
    // blocked by them), so the wall-edge step-up above never fires for the cold
    // aisle floor.  Instead, after X/Z movement we check directly: if the new
    // position is inside a step-cell's XZ footprint and the player is below the
    // step's top surface, snap them up onto it.
    if (this.onGround && level.getStepHeight) {
      const stepH = level.getStepHeight(testPos, PLAYER_RADIUS);
      if (stepH > 0 && testPos.y < PLAYER_HEIGHT + stepH) {
        testPos.y = PLAYER_HEIGHT + stepH + 0.01;
      }
    }

    // Move Y (gravity / jump)
    testPos.y += delta.y;
    if (level.collidesAABB(testPos, PLAYER_RADIUS, PLAYER_HEIGHT)) {
      if (delta.y < 0) {
        // Landed on a regular wall/floor surface
        this.onGround = true;
        testPos.y -= delta.y;
        this.velocity.y = 0;
      } else {
        // Hit ceiling
        testPos.y -= delta.y;
        this.velocity.y = 0;
      }
    } else {
      // Check for landing on a raised-floor step surface.
      // collidesAABB skips step cells, so we handle them here explicitly.
      const stepH = level.getStepHeight ? level.getStepHeight(testPos, PLAYER_RADIUS) : 0;
      if (stepH > 0 && delta.y < 0 && testPos.y <= PLAYER_HEIGHT + stepH + 0.05) {
        this.onGround = true;
        testPos.y = PLAYER_HEIGHT + stepH + 0.01;
        this.velocity.y = 0;
      } else {
        // Check if we're still above any floor (regular or step)
        const floorCheck = testPos.clone();
        floorCheck.y -= 0.05;
        const onStepFloor = stepH > 0 && testPos.y >= PLAYER_HEIGHT + stepH - 0.1;
        if (!level.collidesAABB(floorCheck, PLAYER_RADIUS, PLAYER_HEIGHT) && !onStepFloor) {
          this.onGround = false;
        }
      }
    }

    this.position.copy(testPos);

    // Floor clamp safety (never fall through the world)
    if (this.position.y < PLAYER_HEIGHT) {
      this.position.y = PLAYER_HEIGHT;
      this.onGround = true;
      this.velocity.y = 0;
    }
  }

  _updateBob(dt) {
    const isMoving = this.input.isActionActive('moveForward') ||
                     this.input.isActionActive('moveBackward') ||
                     this.input.isActionActive('moveLeft') ||
                     this.input.isActionActive('moveRight');

    if (isMoving && this.onGround) {
      this._bobTime += dt * BOB_FREQ;
      this._bobOffset.x = Math.sin(this._bobTime) * BOB_AMP_X;
      this._bobOffset.y = Math.abs(Math.sin(this._bobTime)) * BOB_AMP_Y;
    } else {
      // Only dampen when there is bob to settle, avoids perpetual micro-multiply
      if (this._bobOffset.lengthSq() > 0.00001) {
        this._bobOffset.multiplyScalar(0.85);
      } else {
        this._bobOffset.set(0, 0, 0);
      }
    }
  }

  _applyToCamera() {
    // Set camera position from player position + bob
    this.camera.position.set(
      this.position.x + this._bobOffset.x,
      this.position.y + this._bobOffset.y,
      this.position.z
    );

    // Apply yaw and pitch as Euler angles
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  takeDamage(amount, type) {
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor = Math.max(0, this.armor - absorbed);
      amount -= absorbed;
    }
    this.health = Math.max(0, this.health - amount);
    // Flash damage overlay
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      overlay.style.background = 'rgba(255,34,0,0.35)';
      setTimeout(() => { overlay.style.background = ''; }, 80);
    }
  }

  applyStatus(name, duration) {
    if (name === 'slowed') {
      this._slowTimer = Math.max(this._slowTimer, duration);
      this.weaponSystem?.applyFireRateSlow(duration, 0.55);
    }
  }

  getStatusState() {
    return {
      slowed: this._slowTimer > 0,
      slowRemaining: this._slowTimer,
    };
  }

  getPosition() {
    return this.position;
  }
}
