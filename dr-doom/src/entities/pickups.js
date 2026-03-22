import * as THREE from 'three';

const PICKUP_RADIUS = 1.2; // auto-pickup distance
const BOB_SPEED = 2.0;
const BOB_AMP = 0.1;

export class PickupManager {
  constructor(scene) {
    this.scene = scene;
    this._pickups = [];
    this._elapsed = 0;
  }

  spawn(type, position, options = {}) {
    const mesh = this._buildMesh(type, options);
    if (!mesh) return;

    mesh.position.copy(position);
    mesh.position.y = 0.3;
    this.scene.add(mesh);

    // Glow light
    const lightColor = type === 'health' ? 0x00ff41 :
                       type === 'armor'  ? 0x4488ff : 0xffaa00;
    const light = new THREE.PointLight(lightColor, 1.5, 2.5, 2);
    mesh.add(light);

    this._pickups.push({
      mesh,
      type,
      options,
      life: 30.0, // despawn after 30s
      _bobOffset: Math.random() * Math.PI * 2,
    });
  }

  update(dt, player) {
    this._elapsed += dt;

    for (let i = this._pickups.length - 1; i >= 0; i--) {
      const p = this._pickups[i];
      p.life -= dt;

      // Bob
      p.mesh.position.y = 0.3 + Math.sin(this._elapsed * BOB_SPEED + p._bobOffset) * BOB_AMP;
      p.mesh.rotation.y += dt * 1.5;

      // Auto-pickup: compare XZ only — player.position.y is at head height,
      // pickup mesh.position.y is near floor. 3D distance always fails this check.
      const dx = player.position.x - p.mesh.position.x;
      const dz = player.position.z - p.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < PICKUP_RADIUS) {
        this._applyPickup(p, player);
        this._despawn(i);
        continue;
      }

      // Despawn
      if (p.life <= 0) {
        this._despawn(i);
      }
    }
  }

  _applyPickup(pickup, player) {
    const { type, options } = pickup;

    if (type === 'health') {
      const prev = player.health;
      player.health = Math.min(100, player.health + (options.amount ?? 15));
      if (player.health > prev) {
        this._showToast(`+${player.health - prev} UPTIME RESTORED`);
      }
    } else if (type === 'armor') {
      const prev = player.armor;
      player.armor = Math.min(100, player.armor + (options.amount ?? 20));
      if (player.armor > prev) {
        this._showToast(`+${player.armor - prev} REDUNDANCY RESTORED`);
      }
    } else if (type === 'ammo') {
      const ammoType = options.ammoType;
      if (player.weaponSystem) {
        player.weaponSystem.ammo.add(ammoType, options.amount ?? 10);
        this._showToast(`${ammoType.replace('_', ' ')} +${options.amount ?? 10}`);
      }
    }
  }

  _despawn(index) {
    const p = this._pickups[index];
    this.scene.remove(p.mesh);
    p.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this._pickups.splice(index, 1);
  }

  _buildMesh(type, options) {
    if (type === 'health') {
      // Green server LED — small glowing cube
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.35, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x003300 })
      );
      g.add(body);
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      );
      led.position.set(0.05, 0.1, 0.11);
      g.add(led);
      const cross1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      );
      const cross2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.16, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      );
      cross1.position.set(0, 0, 0.11);
      cross2.position.set(0, 0, 0.11);
      g.add(cross1); g.add(cross2);
      return g;

    } else if (type === 'armor') {
      // Blue rack mount plate
      const g = new THREE.Group();
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.08, 0.28),
        new THREE.MeshBasicMaterial({ color: 0x112233 })
      );
      g.add(plate);
      // Mounting ears
      for (const x of [-0.22, 0.22]) {
        const ear = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.1, 0.08),
          new THREE.MeshBasicMaterial({ color: 0x1a3355 })
        );
        ear.position.set(x, 0, 0);
        g.add(ear);
      }
      // Blue status light
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x4488ff })
      );
      light.position.set(0.15, 0.06, 0.1);
      g.add(light);
      return g;

    } else if (type === 'ammo') {
      // Storage drive — small rectangle
      const g = new THREE.Group();
      const drive = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.08, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x222200 })
      );
      g.add(drive);
      // Label stripe
      const label = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.03, 0.14),
        new THREE.MeshBasicMaterial({ color: 0xaaaa00 })
      );
      label.position.set(0, 0.055, 0);
      g.add(label);
      // Connector
      const conn = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x333300 })
      );
      conn.position.set(0, 0, 0.11);
      g.add(conn);
      return g;
    }

    return null;
  }

  _showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 140px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 2px;
      color: #00ff41;
      text-shadow: 0 0 8px #00ff41;
      pointer-events: none;
      animation: toastFade 1.8s forwards;
      white-space: nowrap;
    `;
    toast.textContent = msg;

    // Inject keyframe if not present
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `
        @keyframes toastFade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }
}
