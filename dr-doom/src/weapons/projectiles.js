import * as THREE from 'three';

function _projectileHitsTarget(projectilePos, target) {
  const dx = projectilePos.x - target.position.x;
  const dz = projectilePos.z - target.position.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  const hitRadius = target.isBoss ? 1.8 : 0.65;
  const minY = target.position.y - 0.25;
  const maxY = target.position.y + (target.isBoss ? 3.0 : 1.75);

  return horizontalDist < hitRadius &&
         projectilePos.y >= minY &&
         projectilePos.y <= maxY;
}

export class ProjectileManager {
  constructor(scene) {
    this.scene = scene;
    this._projectiles = [];
    this._traces = [];
    this._vfx = []; // generic visual effects updated by game loop
  }

  spawn({ position, direction, speed, damage, color, scale, type, splash, onHit }) {
    const geo = new THREE.SphereGeometry(scale ?? 0.12, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: color ?? 0x00ff41 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    // Glow point light riding with projectile
    const light = new THREE.PointLight(color ?? 0x00ff41, 2, 3, 2);
    mesh.add(light);

    this._projectiles.push({
      mesh,
      velocity: direction.clone().normalize().multiplyScalar(speed ?? 20),
      damage: damage ?? 50,
      type: type ?? 'standard',
      splash: splash ?? null,
      onHit: onHit ?? null,
      life: 3.0, // seconds before auto-despawn
    });
  }

  spawnTrace(from, to, color) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this._traces.push({ line, geo, mat, life: 0.08 });
  }

  // Spawn a timed visual effect (mesh + optional light) managed by the game loop.
  // `onTick(vfx, progress)` is called each frame with progress 0→1 over `duration`.
  spawnVFX({ mesh, light, duration, onTick }) {
    this.scene.add(mesh);
    if (light) this.scene.add(light);
    this._vfx.push({ mesh, light, duration, elapsed: 0, onTick });
  }

  update(dt, level, enemies) {
    // Update VFX
    for (let i = this._vfx.length - 1; i >= 0; i--) {
      const v = this._vfx[i];
      v.elapsed += dt;
      const progress = Math.min(v.elapsed / v.duration, 1);
      v.onTick(v, progress);
      if (progress >= 1) {
        this.scene.remove(v.mesh);
        v.mesh.geometry.dispose();
        v.mesh.material.dispose();
        if (v.light) this.scene.remove(v.light);
        this._vfx.splice(i, 1);
      }
    }

    // Update hitscan traces
    for (let i = this._traces.length - 1; i >= 0; i--) {
      const t = this._traces[i];
      t.life -= dt;
      t.mat.opacity = Math.max(0, t.life / 0.08 * 0.7);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.geo.dispose();
        t.mat.dispose();
        this._traces.splice(i, 1);
      }
    }

    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      p.life -= dt;

      // Move
      p.mesh.position.addScaledVector(p.velocity, dt);

      // Check world collision (simple: below ceiling, above floor, within level bounds)
      const pos = p.mesh.position;
      let hit = false;

      if (pos.y < 0.1 || pos.y > 3.8) hit = true;
      if (!hit && level.collidesAABB(pos, 0.15, 0.3)) hit = true;

      // Check enemy and boss hits using horizontal radius + body height instead
      // of raw 3D distance. Projectile weapons travel at camera height, while the
      // entities are anchored near the floor.
      if (!hit && enemies) {
        for (const target of enemies) {
          if (!target || target.isDead) continue;
          if (_projectileHitsTarget(pos, target)) {
            target.takeDamage(p.damage, p.type);
            hit = true;
            break;
          }
        }
      }

      if (hit || p.life <= 0) {
        if (hit && p.splash) this._applySplashDamage(p.mesh.position.clone(), p.splash, enemies, p.type);
        if (hit && p.onHit) p.onHit(p.mesh.position.clone());
        this._despawn(i);
      }
    }
  }

  _applySplashDamage(origin, splash, enemies, type) {
    if (!Array.isArray(enemies) || !splash) return;

    enemies.forEach(target => {
      if (!target || target.isDead) return;

      const dx = target.position.x - origin.x;
      const dz = target.position.z - origin.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > splash.radius) return;

      const pct = 1 - dist / Math.max(splash.radius, 0.01);
      const minDamage = splash.minDamage ?? splash.damage;
      const scaledDamage = minDamage + (splash.damage - minDamage) * Math.max(0, pct);
      target.takeDamage(scaledDamage, type);

      if (splash.stunDuration) {
        const duration = target.isBoss
          ? Math.min(0.5, splash.stunDuration * 0.4)
          : splash.stunDuration;
        target.applyStatus?.('stunned', duration);
      }
    });
  }

  _despawn(index) {
    const p = this._projectiles[index];
    this.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
    this._projectiles.splice(index, 1);
  }

  clear() {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      this._despawn(i);
    }
  }
}
