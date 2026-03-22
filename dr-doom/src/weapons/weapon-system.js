import * as THREE from 'three';
import { AmmoPool } from './ammo.js';
import { ProjectileManager } from './projectiles.js';
import {
  SnapshotPistol,
  ReplicationShotgun,
  BackupBeam,
  FailoverLauncher,
  ImmutableRailgun,
  CDPChaingun,
  BFR9000,
} from './weapons.js';

export class WeaponSystem {
  constructor(weaponScene, mainScene) {
    this.weaponScene = weaponScene; // separate scene so weapons don't clip into walls
    this.ammo = new AmmoPool();
    this.projectiles = new ProjectileManager(mainScene);

    // Build all 7 weapons
    this.weapons = [
      new SnapshotPistol(),
      new ReplicationShotgun(),
      new BackupBeam(),
      new FailoverLauncher(),
      new ImmutableRailgun(),
      new CDPChaingun(),
      new BFR9000(),
    ];

    // Add all viewmodels to weapon scene
    this.weapons.forEach(w => {
      if (w.viewmodel) weaponScene.add(w.viewmodel);
    });

    this.currentSlot = 0; // index into weapons array
    this._pendingSlot = -1;
    this._switchCooldown = 0;
    this._locked = false;  // true while an encryption bolt effect is active

    // Start with weapon 1 drawn
    this.weapons[0].switchTo();
  }

  // Called by encryption bolt hit — prevents firing for a short window.
  lock()   { this._locked = true;  }
  unlock() { this._locked = false; }

  get current() {
    return this.weapons[this.currentSlot];
  }

  setLevel(level) { this._level = level; }
  setEnemies(getEnemiesFn) { this._getEnemies = getEnemiesFn; }

  get _enemies() { return this._getEnemies ? this._getEnemies() : []; }

  update(dt, input, camera) {
    this._handleSwitchInput(input);
    this._handleScrollWheel(input);

    // Update all weapons (only current fires, but all animate switch state).
    // While locked by an encryption bolt, feed _noInput to the active slot too.
    this.weapons.forEach((w, i) => {
      const activeInput = (i === this.currentSlot && !this._locked) ? input : _noInput;
      w.update(dt, activeInput, this.ammo, camera, this.projectiles);
    });

    // Update projectiles
    this.projectiles.update(dt, this._level, this._enemies);

    this._switchCooldown = Math.max(0, this._switchCooldown - dt);
  }

  _handleSwitchInput(input) {
    const slotKeys = [
      'weapon1','weapon2','weapon3','weapon4',
      'weapon5','weapon6','weapon7',
    ];

    for (let i = 0; i < slotKeys.length; i++) {
      if (input.isActionActive(slotKeys[i])) {
        this._requestSwitch(i);
        break;
      }
    }

    // Process pending switch when current weapon is fully lowered
    if (this._pendingSlot >= 0) {
      const cur = this.weapons[this.currentSlot];
      if (cur.switchState === 'down') {
        this.currentSlot = this._pendingSlot;
        this._pendingSlot = -1;
        this.weapons[this.currentSlot].switchTo();
      }
    }
  }

  _handleScrollWheel(input) {
    if (input.scrollDelta === undefined) return;
    if (input.scrollDelta > 0) {
      this._requestSwitch((this.currentSlot + 1) % this.weapons.length);
    } else if (input.scrollDelta < 0) {
      this._requestSwitch((this.currentSlot - 1 + this.weapons.length) % this.weapons.length);
    }
    input.scrollDelta = 0;
  }

  _requestSwitch(slot) {
    if (slot === this.currentSlot) return;
    if (this._pendingSlot >= 0) return; // already switching

    this._pendingSlot = slot;
    this.weapons[this.currentSlot].switchAway();
  }

  // For HUD
  getCurrentAmmo() {
    return this.ammo.get(this.current.ammoType);
  }

  getCurrentAmmoType() {
    return this.current.ammoType;
  }

  getCurrentWeaponName() {
    return this.current.name;
  }

  getSlot() {
    return this.currentSlot + 1;
  }
}

// Dummy input for non-active weapons (no firing, no mouse delta)
const _noInput = {
  isMouseButtonDown: () => false,
  isActionActive: () => false,
  mouse: { dx: 0, dy: 0 },
  scrollDelta: 0,
};
