import * as THREE from 'three';

const TILE = 4;

// Electrified floor zones — damage player on contact
// Gas leak zones — DOT + visual fog patch

const ELECTRIC_ZONES = [
  // Storage Vault — damaged power conduit
  { col: 20, row: 5,  label: 'ELECTRICAL FAULT' },
  { col: 21, row: 5,  label: 'ELECTRICAL FAULT' },
  { col: 20, row: 8,  label: 'ELECTRICAL FAULT' },
  // Network Core — blown UPS
  { col: 6,  row: 17, label: 'ELECTRICAL FAULT' },
  { col: 7,  row: 17, label: 'ELECTRICAL FAULT' },
  // Emergency Exit — most dangerous
  { col: 11, row: 25, label: 'HIGH VOLTAGE' },
  { col: 12, row: 25, label: 'HIGH VOLTAGE' },
  { col: 11, row: 28, label: 'HIGH VOLTAGE' },
  { col: 12, row: 28, label: 'HIGH VOLTAGE' },
];

const GAS_ZONES = [
  // Cold Aisle — CRAC unit 2 failure
  { col: 13, row: 15, radius: 2.5, label: 'COOLANT LEAK' },
  { col: 18, row: 19, radius: 2.0, label: 'COOLANT LEAK' },
  // Network Core — blown conduit
  { col: 3,  row: 18, radius: 2.0, label: 'GAS LEAK' },
  // Emergency Exit
  { col: 16, row: 27, radius: 2.5, label: 'HALON DISCHARGE' },
];

export class HazardSystem {
  constructor(scene) {
    this.scene = scene;
    this._electricMeshes = [];
    this._gasMeshes = [];
    this._elapsed = 0;
    this._warnEl = null;

    this._buildElectricZones();
    this._buildGasZones();
    this._buildWarnElement();
  }

  _buildElectricZones() {
    ELECTRIC_ZONES.forEach(zone => {
      const group = new THREE.Group();

      // Floor panel — dark with yellow warning stripes
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(TILE - 0.2, 0.02, TILE - 0.2),
        new THREE.MeshBasicMaterial({ color: 0x1a1a00 })
      );
      group.add(panel);

      // Warning stripe overlay
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(TILE - 0.3, 0.025, 0.15),
        new THREE.MeshBasicMaterial({ color: 0xffaa00 })
      );
      stripe.position.set(0, 0.005, 0);
      group.add(stripe);

      const stripe2 = stripe.clone();
      stripe2.rotation.y = Math.PI / 2;
      group.add(stripe2);

      // Arc effect meshes (animated)
      const arcMat = new THREE.MeshBasicMaterial({
        color: 0xffff88,
        transparent: true,
        opacity: 0.0,
      });
      for (let i = 0; i < 3; i++) {
        const arc = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.3 + Math.random() * 0.4, 0.05),
          arcMat.clone()
        );
        arc.position.set(
          (Math.random() - 0.5) * (TILE - 0.8),
          0.2,
          (Math.random() - 0.5) * (TILE - 0.8)
        );
        group.add(arc);
      }

      // Point light (flickers)
      const light = new THREE.PointLight(0xffff00, 0, 3, 2);
      light.position.y = 0.5;
      group.add(light);

      group.position.set(
        zone.col * TILE + TILE / 2,
        0.01,
        zone.row * TILE + TILE / 2
      );

      this.scene.add(group);

      this._electricMeshes.push({
        group,
        light,
        arcMeshes: group.children.filter(c => c.geometry?.parameters?.height > 0.2),
        zone: {
          minX: zone.col * TILE,
          maxX: zone.col * TILE + TILE,
          minZ: zone.row * TILE,
          maxZ: zone.row * TILE + TILE,
        },
        label: zone.label,
        damageRate: 25, // per second
        _arcTimer: Math.random() * 2,
      });
    });
  }

  _buildGasZones() {
    GAS_ZONES.forEach(zone => {
      const cx = zone.col * TILE + TILE / 2;
      const cz = zone.row * TILE + TILE / 2;

      // Volumetric fog sphere
      const geo = new THREE.SphereGeometry(zone.radius, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x88ff88,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const cloud = new THREE.Mesh(geo, mat);
      cloud.position.set(cx, 0.8, cz);
      this.scene.add(cloud);

      // Inner denser core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(zone.radius * 0.5, 6, 6),
        new THREE.MeshBasicMaterial({
          color: 0xaaffaa,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
        })
      );
      core.position.set(cx, 0.5, cz);
      this.scene.add(core);

      // Dripping particles (static markers)
      for (let i = 0; i < 5; i++) {
        const drip = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 4, 4),
          new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 })
        );
        drip.position.set(
          cx + (Math.random() - 0.5) * zone.radius * 1.5,
          Math.random() * 1.5,
          cz + (Math.random() - 0.5) * zone.radius * 1.5
        );
        this.scene.add(drip);
      }

      // Warning sign above
      this._buildHazardSign(cx, cz, zone.label, 0x44ff44);

      this._gasMeshes.push({
        cloud,
        core,
        zone: { cx, cz, radius: zone.radius },
        label: zone.label,
        damageRate: 8, // per second
      });
    });
  }

  _buildHazardSign(x, z, text, color) {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 36;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 192, 36);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.strokeRect(1, 1, 190, 34);
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`⚠ ${text}`, 96, 24);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.34),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    sign.position.set(x, TILE - 0.6, z);
    this.scene.add(sign);
  }

  _buildWarnElement() {
    const el = document.createElement('div');
    el.id = 'hazard-warn';
    el.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Courier New', monospace;
      font-size: 13px;
      letter-spacing: 3px;
      pointer-events: none;
      display: none;
      text-align: center;
    `;
    document.body.appendChild(el);
    this._warnEl = el;
  }

  update(dt, player) {
    this._elapsed += dt;
    let hazardLabel = null;

    // Electric zone check
    this._electricMeshes.forEach(hz => {
      hz._arcTimer -= dt;

      // Animate arcs
      const arcActive = hz._arcTimer <= 0;
      if (arcActive) {
        hz._arcTimer = 0.8 + Math.random() * 1.5;
      }

      hz.arcMeshes.forEach(arc => {
        if (arcActive) {
          arc.material.opacity = 0.7 + Math.random() * 0.3;
          arc.position.y = 0.1 + Math.random() * 0.5;
        } else {
          arc.material.opacity = Math.max(0, arc.material.opacity - dt * 4);
        }
      });

      hz.light.intensity = arcActive ? 3 + Math.random() * 2 : Math.max(0, hz.light.intensity - dt * 8);

      // Player collision
      const px = player.position.x;
      const pz = player.position.z;
      if (px > hz.zone.minX && px < hz.zone.maxX &&
          pz > hz.zone.minZ && pz < hz.zone.maxZ) {
        player.takeDamage(hz.damageRate * dt, 'electrical');
        hazardLabel = `⚡ ${hz.label} — TAKING DAMAGE`;
      }
    });

    // Gas zone check
    this._gasMeshes.forEach(gz => {
      // Pulse cloud
      const pulse = 0.9 + Math.sin(this._elapsed * 0.8) * 0.1;
      gz.cloud.scale.setScalar(pulse);
      gz.core.scale.setScalar(pulse * 1.1);

      // Player collision
      const dx = player.position.x - gz.zone.cx;
      const dz = player.position.z - gz.zone.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < gz.zone.radius) {
        player.takeDamage(gz.damageRate * dt, 'corruption');
        hazardLabel = `☣ ${gz.label} — TAKING DAMAGE`;

        // Tint screen green
        const overlay = document.getElementById('damage-overlay');
        if (overlay) {
          overlay.style.boxShadow = 'inset 0 0 30px rgba(0,200,0,0.2)';
          setTimeout(() => { overlay.style.boxShadow = ''; }, 200);
        }
      }
    });

    // Hazard warning display
    if (hazardLabel && this._warnEl) {
      const flash = Math.sin(this._elapsed * 8) > 0;
      this._warnEl.style.display = 'block';
      this._warnEl.style.color = hazardLabel.startsWith('⚡') ? '#ffff00' : '#00ff88';
      this._warnEl.style.textShadow = hazardLabel.startsWith('⚡')
        ? '0 0 12px #ffff00' : '0 0 12px #00ff88';
      this._warnEl.style.opacity = flash ? '1' : '0.4';
      this._warnEl.textContent = hazardLabel;
    } else if (this._warnEl) {
      this._warnEl.style.display = 'none';
    }
  }
}
