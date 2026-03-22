import * as THREE from 'three';

// ---- Base Weapon ----

export class Weapon {
  constructor(def) {
    this.slot        = def.slot;
    this.name        = def.name;
    this.ammoType    = def.ammoType;
    this.ammoPerShot = def.ammoPerShot ?? 1;
    this.fireRate    = def.fireRate;     // shots per second
    this.damage      = def.damage;
    this.isHitscan   = def.isHitscan ?? true;
    this.isBeam      = def.isBeam ?? false;

    // Viewmodel
    this.viewmodel   = null; // THREE.Group, built per weapon
    this._buildViewmodel();

    // State
    this._fireCooldown  = 0;
    this._recoilT       = 0;  // 0=rest, 1=full recoil
    this._recoilDir     = 1;  // 1=kicking back, -1=returning
    this._swayT         = 0;
    this._locked        = false; // weapon-locked status effect (encryption bolt)

    // Switch animation
    this.switchState    = 'idle'; // 'lowering' | 'raising' | 'idle'
    this._switchT       = 1;      // 1=fully up, 0=fully down
    this.visible        = false;
  }

  // Override per weapon
  _buildViewmodel() {}

  // Called every frame
  update(dt, input, ammo, camera, projectileManager) {
    if (this._fireCooldown > 0) this._fireCooldown -= dt;

    this._updateSwitch(dt);
    this._updateRecoil(dt);
    this._updateSway(dt, input);
    this._applyViewmodelTransform(camera);

    if (this.switchState !== 'idle') return;

    // Fire on button-down event OR while holding — ensures single clicks always register
    const justPressed = input.isMouseButtonJustPressed?.(0) ?? false;
    const held        = input.isMouseButtonDown(0);
    const firing      = (justPressed || held) && !this._locked;

    if (firing) {
      // On a fresh press, bypass the cooldown check to guarantee immediate response
      if (justPressed) this._fireCooldown = Math.min(this._fireCooldown, 0);
      this._tryFire(ammo, camera, projectileManager);
    }
  }

  _tryFire(ammo, camera, projectileManager) {
    if (this._fireCooldown > 0) return;
    if (ammo.isEmpty(this.ammoType)) return;
    if (!ammo.consume(this.ammoType, this.ammoPerShot)) return;

    this._fireCooldown = 1 / this.fireRate;
    this._recoilT = 1;
    this._recoilDir = 1;

    this._onFire(camera, projectileManager);
  }

  // Override per weapon
  _onFire(camera, projectileManager) {}

  _updateSwitch(dt) {
    const SWITCH_SPEED = 5.0;
    if (this.switchState === 'lowering') {
      this._switchT = Math.max(0, this._switchT - dt * SWITCH_SPEED);
      if (this._switchT <= 0) {
        this.switchState = 'down';
        this.visible = false;
      }
    } else if (this.switchState === 'raising') {
      this._switchT = Math.min(1, this._switchT + dt * SWITCH_SPEED);
      if (this._switchT >= 1) {
        this.switchState = 'idle';
      }
    }

    if (this.viewmodel) {
      this.viewmodel.visible = this.visible || this.switchState === 'raising';
    }
  }

  _updateRecoil(dt) {
    const RECOIL_SPEED = 8;
    if (this._recoilDir === 1) {
      this._recoilT = Math.max(0, this._recoilT - dt * RECOIL_SPEED * 0.5);
      if (this._recoilT <= 0) this._recoilDir = -1;
    } else if (this._recoilDir === -1) {
      this._recoilT = Math.min(1, this._recoilT + dt * RECOIL_SPEED);
      if (this._recoilT >= 1) this._recoilDir = 0;
    }
  }

  _updateSway(dt, input) {
    this._swayT += dt;
  }

  _applyViewmodelTransform(camera) {
    if (!this.viewmodel) return;

    // Viewmodel follows camera exactly — positioned relative to camera
    const switchOffset = (1 - this._switchT) * -0.6; // drops down when switching
    const recoilOffset = this._recoilT * 0.04;
    const swayX = Math.sin(this._swayT * 0.8) * 0.004;
    const swayY = Math.abs(Math.sin(this._swayT * 1.6)) * 0.002;

    // Get camera world position and quaternion
    const camPos = new THREE.Vector3();
    const camQuat = new THREE.Quaternion();
    camera.getWorldPosition(camPos);
    camera.getWorldQuaternion(camQuat);

    // Offset in camera-local space: centered, slightly down, in front
    const localOffset = new THREE.Vector3(
      swayX,
      -0.28 + switchOffset + swayY,
      -0.5 - recoilOffset
    );
    localOffset.applyQuaternion(camQuat);

    this.viewmodel.position.copy(camPos).add(localOffset);
    this.viewmodel.quaternion.copy(camQuat);
  }

  switchTo() {
    this.visible = true;
    this.switchState = 'raising';
    this._switchT = 0;
  }

  switchAway() {
    this.switchState = 'lowering';
  }

  lock() { this._locked = true; }
  unlock() { this._locked = false; }

  getAmmoDisplay(ammo) {
    return ammo.get(this.ammoType);
  }
}


// Returns the damageable entity (enemy or boss) attached to a raycast hit, or null.
function _hitTarget(hit) {
  return hit.object.userData.enemy || hit.object.userData.boss || null;
}

// ---- Hitscan helper ----

function castHitscan(camera, scene, range, spread = 0) {
  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3(0, 0, -1);

  if (spread > 0) {
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
  }

  dir.applyQuaternion(camera.quaternion).normalize();
  raycaster.set(camera.position, dir);

  const hits = raycaster.intersectObjects(scene.children, true);
  // Only let enemies and level walls stop a shot. Props (server racks,
  // consoles, light fixtures) are visual-only — they have no movement
  // collision and should not silently eat bullets either.
  return hits.filter(h =>
    h.distance > 0.3 &&
    h.distance < range &&
    (h.object.userData.enemy || h.object.userData.boss || h.object.userData.isWall)
  );
}

// spawnHitscanTrace is now handled by ProjectileManager.spawnTrace() so that
// trace fade runs inside the fixed-timestep game loop (pauses correctly).


// ---- Weapon 1: Snapshot Pistol ----

export class SnapshotPistol extends Weapon {
  constructor() {
    super({
      slot: 1,
      name: 'SNAPSHOT PISTOL',
      ammoType: 'STORAGE_UNITS',
      ammoPerShot: 1,
      fireRate: 2.5,
      damage: 15,
      isHitscan: true,
    });
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Slide / body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.08, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x2a2a2e })
    );
    g.add(body);

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.025, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x111115 })
    );
    barrel.position.set(0, 0.02, -0.17);
    g.add(barrel);

    // Grip
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.1, 0.07),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1e })
    );
    grip.position.set(0, -0.08, 0.04);
    g.add(grip);

    // Status LED
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x00ff41 })
    );
    led.position.set(0.025, 0.02, -0.05);
    g.add(led);

    this.viewmodel = g;
  }

  _onFire(camera, projectileManager) {
    const scene = projectileManager.scene;
    const hits = castHitscan(camera, scene, 30, 0);

    const muzzleWorld = new THREE.Vector3();
    camera.getWorldPosition(muzzleWorld);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    muzzleWorld.addScaledVector(forward, 0.6);

    const endPoint = hits.length > 0
      ? hits[0].point.clone()
      : muzzleWorld.clone().addScaledVector(forward, 30);

    projectileManager.spawnTrace(muzzleWorld, endPoint, 0x00ff88);

    const target = hits.length > 0 ? _hitTarget(hits[0]) : null;
    if (target) target.takeDamage(this.damage, 'physical');

    // Hit flash effect
    if (hits.length > 0) {
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.8 })
      );
      flash.position.copy(hits[0].point);
      scene.add(flash);
      setTimeout(() => { scene.remove(flash); flash.geometry.dispose(); flash.material.dispose(); }, 80);
    }
  }
}


// ---- Weapon 2: Replication Shotgun ----

export class ReplicationShotgun extends Weapon {
  constructor() {
    super({
      slot: 2,
      name: 'REPLICATION SHOTGUN',
      ammoType: 'REPLICA_CHARGES',
      ammoPerShot: 1,
      fireRate: 1.1,
      damage: 12, // per pellet, 7 pellets
      isHitscan: true,
    });
    this._isPumping = false;
    this._pumpT = 0;
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Stock
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.07, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x3a2818 })
    );
    g.add(stock);

    // Barrel (double)
    for (const x of [-0.02, 0.02]) {
      const barrel = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.025, 0.28),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
      );
      barrel.position.set(x, 0.02, -0.3);
      g.add(barrel);
    }

    // Pump
    this._pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.04, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x2a1a0a })
    );
    this._pump.position.set(0, -0.01, -0.12);
    g.add(this._pump);

    // Guard
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.02, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x2a1a0a })
    );
    guard.position.set(0, -0.04, 0.04);
    g.add(guard);

    this.viewmodel = g;
  }

  _onFire(camera, projectileManager) {
    const scene = projectileManager.scene;
    const PELLETS = 7;
    const SPREAD = 0.09;

    const muzzleWorld = new THREE.Vector3();
    camera.getWorldPosition(muzzleWorld);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    muzzleWorld.addScaledVector(forward, 0.6);

    for (let i = 0; i < PELLETS; i++) {
      const hits = castHitscan(camera, scene, 18, SPREAD);
      const spreadDir = forward.clone().add(
        new THREE.Vector3((Math.random()-0.5)*SPREAD, (Math.random()-0.5)*SPREAD, 0)
      ).normalize();

      const endPoint = hits.length > 0
        ? hits[0].point.clone()
        : muzzleWorld.clone().addScaledVector(spreadDir, 18);

      projectileManager.spawnTrace(muzzleWorld, endPoint, 0xff8800);

      const pelletTarget = hits.length > 0 ? _hitTarget(hits[0]) : null;
      if (pelletTarget) pelletTarget.takeDamage(this.damage, 'physical');
    }

    // Pump animation
    this._isPumping = true;
    this._pumpT = 0;
  }

  update(dt, input, ammo, camera, projectileManager) {
    // Animate pump
    if (this._isPumping) {
      this._pumpT += dt * 5;
      if (this._pump) {
        this._pump.position.z = -0.12 + Math.sin(this._pumpT) * 0.08;
      }
      if (this._pumpT >= Math.PI) this._isPumping = false;
    }
    super.update(dt, input, ammo, camera, projectileManager);
  }
}


// ---- Weapon 3: Backup Beam ----

export class BackupBeam extends Weapon {
  constructor() {
    super({
      slot: 3,
      name: 'BACKUP BEAM',
      ammoType: 'BACKUP_CAPACITY',
      ammoPerShot: 1, // per tick at 10hz
      fireRate: 999,  // handled manually
      damage: 8,      // per tick
      isBeam: true,
      isHitscan: false,
    });
    this._beamActive = false;
    this._beamMesh = null;
    this._beamTickRate = 0.1;
    this._beamTick = 0;
    this._stackDamage = 1;
    this._chargeT = 0;
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Main housing
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.07, 0.32),
      new THREE.MeshBasicMaterial({ color: 0x1a1a2e })
    );
    g.add(body);

    // Emitter dish
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, 0.04, 6),
      new THREE.MeshBasicMaterial({ color: 0x0033aa })
    );
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, 0, -0.2);
    g.add(dish);

    // Capacitor fins
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.06, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x112233 })
      );
      fin.position.set(0.06, 0.03 - i * 0.03, -0.05 - i * 0.06);
      g.add(fin);
    }

    // Charge indicator
    this._chargeBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.008, 0.005),
      new THREE.MeshBasicMaterial({ color: 0x0044ff })
    );
    this._chargeBar.position.set(0, 0.04, 0);
    g.add(this._chargeBar);

    this.viewmodel = g;
  }

  update(dt, input, ammo, camera, projectileManager) {
    if (this._fireCooldown > 0) this._fireCooldown -= dt;
    this._updateSwitch(dt);
    this._updateRecoil(dt);
    this._updateSway(dt, input);
    this._applyViewmodelTransform(camera);

    if (this.switchState !== 'idle') {
      this._stopBeam(projectileManager.scene);
      return;
    }

    const firing = input.isMouseButtonDown(0) && !this._locked;

    if (firing && !ammo.isEmpty(this.ammoType)) {
      this._chargeT = Math.min(1, this._chargeT + dt * 2);
      this._beamTick += dt;

      if (this._beamTick >= this._beamTickRate) {
        this._beamTick = 0;
        if (ammo.consume(this.ammoType, 1)) {
          this._stackDamage = Math.min(5, this._stackDamage + 0.3);
          this._fireBeam(camera, projectileManager.scene);
        }
      }

      this._beamActive = true;
      // Update charge bar color
      if (this._chargeBar) {
        const h = this._chargeT;
        this._chargeBar.material.color.setRGB(h, 0.2, 1 - h);
        this._chargeBar.scale.x = this._chargeT;
      }
    } else {
      this._chargeT = Math.max(0, this._chargeT - dt * 3);
      this._stackDamage = 1;
      this._stopBeam(projectileManager.scene);
    }
  }

  _fireBeam(camera, scene) {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    raycaster.set(camera.position, dir);

    const hits = raycaster.intersectObjects(scene.children, true);
    const validHit = hits.find(h =>
      h.distance > 0.3 &&
      h.distance < 25 &&
      (h.object.userData.enemy || h.object.userData.boss || h.object.userData.isWall)
    );

    const muzzle = camera.position.clone().addScaledVector(dir, 0.6);
    const endpoint = validHit ? validHit.point.clone() : camera.position.clone().addScaledVector(dir, 25);

    this._renderBeam(scene, muzzle, endpoint);

    const beamTarget = validHit ? _hitTarget(validHit) : null;
    if (beamTarget) {
      beamTarget.takeDamage(this.damage * this._stackDamage, 'backup');
    }
  }

  _renderBeam(scene, from, to) {
    if (this._beamMesh) {
      scene.remove(this._beamMesh);
      this._beamMesh.geometry.dispose();
      this._beamMesh.material.dispose();
    }

    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const intensity = 0.4 + this._chargeT * 0.6;
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.2, 0.4 * intensity, 1.0 * intensity),
      transparent: true,
      opacity: 0.6 + this._chargeT * 0.4,
    });
    this._beamMesh = new THREE.Line(geo, mat);
    scene.add(this._beamMesh);
  }

  _stopBeam(scene) {
    if (this._beamMesh) {
      scene.remove(this._beamMesh);
      this._beamMesh.geometry.dispose();
      this._beamMesh.material.dispose();
      this._beamMesh = null;
    }
    this._beamActive = false;
  }
}


// ---- Weapon 4: Failover Launcher ----

export class FailoverLauncher extends Weapon {
  constructor() {
    super({
      slot: 4,
      name: 'FAILOVER LAUNCHER',
      ammoType: 'FAILOVER_TOKENS',
      ammoPerShot: 1,
      fireRate: 0.7,
      damage: 120,
      isHitscan: false,
    });
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Tube body
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8),
      new THREE.MeshBasicMaterial({ color: 0x2a1a0a })
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0, -0.1);
    g.add(tube);

    // End cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.04, 0.05, 8),
      new THREE.MeshBasicMaterial({ color: 0x1a0a00 })
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(0, 0, -0.32);
    g.add(cap);

    // Side handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.12, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x1e1e18 })
    );
    handle.position.set(0, -0.1, 0.05);
    g.add(handle);

    // Failover indicator ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.008, 4, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8800 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0, -0.18);
    g.add(ring);

    this.viewmodel = g;
  }

  _onFire(camera, projectileManager) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const spawnPos = camera.position.clone().addScaledVector(dir, 0.7);
    spawnPos.y -= 0.1;

    projectileManager.spawn({
      position: spawnPos,
      direction: dir,
      speed: 16,
      damage: this.damage,
      color: 0xff8800,
      scale: 0.2,
      type: 'failover',
      onHit: (pos) => this._explode(pos, projectileManager.scene, projectileManager),
    });
  }

  _explode(pos, scene, projectileManager) {
    const blast = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.4, wireframe: true })
    );
    blast.position.copy(pos);

    const light = new THREE.PointLight(0xff8800, 8, 8, 2);
    light.position.copy(pos);

    projectileManager.spawnVFX({
      mesh: blast, light, duration: 0.3,
      onTick(v, p) {
        v.mesh.material.opacity = (1 - p) * 0.4;
        v.mesh.scale.setScalar(1 + p * 0.5);
        v.light.intensity = (1 - p) * 8;
      },
    });
  }
}


// ---- Weapon 5: Immutable Railgun ----

export class ImmutableRailgun extends Weapon {
  constructor() {
    super({
      slot: 5,
      name: 'IMMUTABLE RAILGUN',
      ammoType: 'IMMUTABLE_LOCKS',
      ammoPerShot: 1,
      fireRate: 0.5,
      damage: 180,
      isHitscan: true,
    });
    this._chargeT = 0;
    this._charging = false;
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Rail assembly
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.05, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x112233 })
    );
    g.add(rail);

    // Upper rail
    const upperRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.02, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x0033aa })
    );
    upperRail.position.set(0, 0.035, 0);
    g.add(upperRail);

    // Capacitor array (glowing)
    for (let i = 0; i < 5; i++) {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.04, 0.025),
        new THREE.MeshBasicMaterial({ color: 0x0066ff })
      );
      cap.position.set(0.06, 0.01, 0.15 - i * 0.07);
      g.add(cap);
    }

    // Sight
    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.04, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    sight.position.set(0, 0.05, -0.1);
    g.add(sight);

    this.viewmodel = g;
  }

  _onFire(camera, projectileManager) {
    const scene = projectileManager.scene;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const from = camera.position.clone().addScaledVector(dir, 0.5);

    // Piercing hitscan — hits everything along the ray
    const raycaster = new THREE.Raycaster();
    raycaster.set(camera.position, dir);
    const allHits = raycaster.intersectObjects(scene.children, true)
      .filter(h => h.distance > 0.3 && h.distance < 60);

    const endpoint = allHits.length > 0
      ? allHits[allHits.length - 1].point.clone()
      : from.clone().addScaledVector(dir, 60);

    // Railgun trace — thick, bright, with glow
    this._spawnRailTrace(scene, from, endpoint, projectileManager);

    // Damage all enemies/bosses hit
    allHits.forEach(hit => {
      const t = _hitTarget(hit);
      if (t) {
        t.takeDamage(this.damage, 'immutable');
        t.applyStatus?.('locked', 1.5);
      }
    });
  }

  _spawnRailTrace(scene, from, to, projectileManager) {
    // Core beam
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 1.0 });
    const beam = new THREE.Line(geo, mat);

    // Outer glow
    const glowGeo = geo.clone();
    const glowMat = new THREE.LineBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.4 });
    const glow = new THREE.Line(glowGeo, glowMat);
    scene.add(glow);

    // Flash light along path
    const midpoint = from.clone().lerp(to, 0.5);
    const light = new THREE.PointLight(0x00ccff, 10, 15, 2);
    light.position.copy(midpoint);

    projectileManager.spawnVFX({
      mesh: beam, light, duration: 0.25,
      onTick(v, p) {
        mat.opacity = 1 - p;
        glowMat.opacity = (1 - p) * 0.4;
        v.light.intensity = (1 - p) * 10;
        if (p >= 1) {
          scene.remove(glow);
          glowGeo.dispose();
          glowMat.dispose();
        }
      },
    });
  }
}


// ---- Weapon 6: CDP Chaingun ----

export class CDPChaingun extends Weapon {
  constructor() {
    super({
      slot: 6,
      name: 'CDP CHAINGUN',
      ammoType: 'CDP_POINTS',
      ammoPerShot: 1,
      fireRate: 10,
      damage: 6,
      isHitscan: true,
    });
    this._spinT = 0;
    this._spinSpeed = 0;
    this._barrel = null;
    this._hitCounters = new Map(); // enemy -> hit count
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Body housing
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x181820 })
    );
    g.add(body);

    // Barrel cluster (rotates)
    const barrelGroup = new THREE.Group();
    const numBarrels = 6;
    for (let i = 0; i < numBarrels; i++) {
      const angle = (i / numBarrels) * Math.PI * 2;
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6),
        new THREE.MeshBasicMaterial({ color: 0x111a11 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(
        Math.cos(angle) * 0.045,
        Math.sin(angle) * 0.045,
        -0.28
      );
      barrelGroup.add(barrel);
    }
    g.add(barrelGroup);
    this._barrel = barrelGroup;

    // Ammo feed
    const feed = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.14, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x2a1a0a })
    );
    feed.position.set(0.08, -0.05, 0.05);
    g.add(feed);

    this.viewmodel = g;
  }

  update(dt, input, ammo, camera, projectileManager) {
    // Spin barrels based on fire state
    const firing = input.isMouseButtonDown(0) && !this._locked && this.switchState === 'idle';
    if (firing && !ammo.isEmpty(this.ammoType)) {
      this._spinSpeed = Math.min(25, this._spinSpeed + dt * 30);
    } else {
      this._spinSpeed = Math.max(0, this._spinSpeed - dt * 15);
    }

    this._spinT += this._spinSpeed * dt;
    if (this._barrel) this._barrel.rotation.z = this._spinT;

    super.update(dt, input, ammo, camera, projectileManager);
  }

  _onFire(camera, projectileManager) {
    const scene = projectileManager.scene;
    const hits = castHitscan(camera, scene, 20, 0.03);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const from = camera.position.clone().addScaledVector(dir, 0.5);
    const to = hits.length > 0
      ? hits[0].point.clone()
      : from.clone().addScaledVector(dir, 20);

    projectileManager.spawnTrace(from, to, 0x00ff41);

    const cdpTarget = hits.length > 0 ? _hitTarget(hits[0]) : null;
    if (cdpTarget) {
      cdpTarget.takeDamage(this.damage, 'cdp');

      // CDP: auto-restore kill after 30 hits
      const count = (this._hitCounters.get(cdpTarget) ?? 0) + 1;
      this._hitCounters.set(cdpTarget, count);
      if (count >= 30) {
        cdpTarget.takeDamage(9999, 'cdp_restore');
        this._hitCounters.delete(cdpTarget);
      }
    }
  }
}


// ---- Weapon 7: BFR-9000 ----

export class BFR9000 extends Weapon {
  constructor() {
    super({
      slot: 7,
      name: 'BFR-9000',
      ammoType: 'BFR_CELLS',
      ammoPerShot: 1,
      fireRate: 0.25,
      damage: 500,
      isHitscan: false,
    });
  }

  _buildViewmodel() {
    const g = new THREE.Group();

    // Main hull
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.14, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x1a2a1e })
    );
    g.add(hull);

    // Emitter dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00aa00, wireframe: true })
    );
    dome.position.set(0, 0, -0.27);
    g.add(dome);

    // BFR glow core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff41 })
    );
    core.position.set(0, 0, -0.27);
    g.add(core);

    // Side vents
    for (const x of [-0.1, 0.1]) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.1, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x111a14 })
      );
      vent.position.set(x, 0, -0.08);
      g.add(vent);
    }

    // Power indicators
    for (let i = 0; i < 4; i++) {
      const pip = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.015, 0.015),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      );
      pip.position.set(-0.06 + i * 0.04, 0.075, 0);
      g.add(pip);
    }

    this.viewmodel = g;
  }

  _onFire(camera, projectileManager) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const spawnPos = camera.position.clone().addScaledVector(dir, 0.7);

    projectileManager.spawn({
      position: spawnPos,
      direction: dir,
      speed: 12,
      damage: this.damage,
      color: 0x00ff41,
      scale: 0.45,
      type: 'bfr',
      onHit: (pos) => this._detonate(pos, projectileManager.scene, projectileManager),
    });
  }

  _detonate(pos, scene, projectileManager) {
    const wave = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x00ff41, transparent: true, opacity: 0.7 })
    );
    wave.position.copy(pos);

    const light = new THREE.PointLight(0x00ff41, 15, 20, 2);
    light.position.copy(pos);

    const maxRadius = 6;
    projectileManager.spawnVFX({
      mesh: wave, light, duration: 0.6,
      onTick(v, p) {
        v.mesh.scale.setScalar(1 + p * maxRadius / 0.1);
        v.mesh.material.opacity = (1 - p) * 0.5;
        v.light.intensity = (1 - p) * 15;
      },
    });
  }
}
