import * as THREE from 'three';

export class ProjectileManager {
  constructor(scene) {
    this.scene = scene;
    this._projectiles = [];
    this._traces = [];
  }

  spawn({ position, direction, speed, damage, color, scale, type, onHit }) {
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

  update(dt, level, enemies) {
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

      // Check enemy hits (placeholder — Phase 3 will wire this properly)
      if (!hit && enemies) {
        for (const enemy of enemies) {
          if (enemy.isDead) continue;
          if (pos.distanceTo(enemy.position) < 0.8) {
            enemy.takeDamage(p.damage, p.type);
            hit = true;
            break;
          }
        }
      }

      if (hit || p.life <= 0) {
        if (hit && p.onHit) p.onHit(p.mesh.position.clone());
        this._despawn(i);
      }
    }
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
