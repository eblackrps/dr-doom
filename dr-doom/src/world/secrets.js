import * as THREE from 'three';
import { CONSOLE_DATA } from '../world/consoles.js';

const TILE   = 4;
const WALL_H = 4;

// Secret room definitions — hidden behind breakable/interactive walls
// Player must find and activate a trigger to reveal the entrance

export const SECRET_DEFS = [
  {
    id: 'secret-veeam-immutability',
    // NE corner of Storage Vault — tucked behind the last rack row
    // Trigger: server rack at col 25, row 9 (indistinguishable from others)
    triggerCol: 25, triggerRow: 9,
    originCol: 24, originRow: 1, width: 3, depth: 3,
    name: 'IMMUTABLE ARCHIVE',
    content: {
      heading: 'VEEAM HARDENED REPOSITORY — ADVANCED CONFIGURATION',
      lines: [
        'The most critical element of modern ransomware-resilient backup',
        'is immutability. Once written, backup data cannot be modified',
        'or deleted — not even by an attacker with admin credentials.',
        '',
        'Veeam Hardened Repository requirements:',
        '',
        '1. Single-purpose Linux server — no other workloads',
        '2. SSH root login disabled after initial setup',
        '3. Veeam service account with minimal OS privileges',
        '4. XFS filesystem with immutability via per-job retention lock',
        '5. Network isolated — backup VLAN only, no production route',
        '6. Physical or logical air gap from production AD domain',
        '',
        'The hardened repository is your last line of defense.',
        'Treat it like you treat your CA root key.',
        '',
        'Full guide: anystackarchitect.com',
      ],
    },
  },
  {
    id: 'secret-rto-math',
    // NW corner of Network Core — behind the patch panel cluster
    // Trigger: patch panel at col 2, row 20 (south area of NC)
    triggerCol: 2, triggerRow: 20,
    originCol: 1, originRow: 13, width: 3, depth: 3,
    name: 'ENGINEERING NOTES',
    content: {
      heading: 'THE REAL MATH BEHIND RTO AND RPO',
      lines: [
        'Most teams set RTO/RPO targets based on what sounds reasonable.',
        'Almost none of them have validated those targets with actual testing.',
        '',
        'To validate your RTO, you need to measure:',
        '',
        'T_detect   — time from failure to alert firing',
        'T_escalate — time from alert to engineer engaged',
        'T_diagnose — time to identify root cause',
        'T_restore  — time to execute recovery procedure',
        'T_verify   — time to confirm service is healthy',
        '',
        'RTO = T_detect + T_escalate + T_diagnose + T_restore + T_verify',
        '',
        'If you have never measured each component separately,',
        'your RTO is a guess. A tested DR plan measures all five.',
        '',
        'For RPO: your backup frequency sets the ceiling.',
        'Your last successful backup sets the floor.',
        'The gap between them is your real RPO exposure.',
        '',
        'anystackarchitect.com // DR Architecture Series',
      ],
    },
    hasBFR: false,
  },
  {
    id: 'secret-vcf-dr',
    // NW corner of Management Console Room — behind the architect terminal
    // Trigger: console rack at col 25, row 20 (south wall of MCR)
    triggerCol: 25, triggerRow: 20,
    originCol: 22, originRow: 13, width: 3, depth: 3,
    name: 'VCF RUNBOOK',
    content: {
      heading: 'VMWARE CLOUD FOUNDATION DR — WHAT NOBODY TELLS YOU',
      lines: [
        'VCF DR is not just about protecting VMs. You need to protect',
        'the management domain itself — vCenter, NSX Manager, SDDC Manager.',
        '',
        'The management domain is the control plane for everything else.',
        'If it goes down, you cannot recover workload VMs through standard',
        'Veeam restore workflows — you need a separate management domain',
        'restore procedure.',
        '',
        'VCF DR checklist:',
        '',
        '- Separate backup jobs for management VMs vs workload VMs',
        '- NSX configuration backup (independent of VM backup)',
        '- SDDC Manager backup enabled in VCF UI',
        '- vCenter VCSA file-based backup to hardened repo',
        '- Document management domain rebuild order:',
        '  SDDC Mgr → vCenter → NSX → Workloads',
        '',
        'The recovery ORDER matters as much as the recovery CAPABILITY.',
        '',
        'Full VCF architecture guide: anystackarchitect.com',
      ],
    },
  },
  {
    id: 'secret-bfr-vault',
    // NW corner of Emergency Exit Corridor — cols 9-11, rows 23-25
    // Trigger: unmarked panel at col 10, row 27 (inside exit corridor)
    triggerCol: 10, triggerRow: 27,
    originCol: 9, originRow: 23, width: 3, depth: 3,
    name: 'EMERGENCY WEAPONS VAULT',
    content: {
      heading: 'AUTHORIZED PERSONNEL ONLY — DR ARSENAL VAULT',
      lines: [
        'PROPERTY OF DR SYSTEMS INC.',
        '',
        'BFR-9000 UNIT LOCATED IN THIS VAULT.',
        'AUTHORIZED FOR USE AGAINST CATEGORY 5 INFRASTRUCTURE THREATS ONLY.',
        '',
        'READ BEFORE USE:',
        '- BFR-9000 recovers everything in blast radius to clean state',
        '- This includes your own gear. Stand clear.',
        '- Ammo is extremely limited. Do not waste it on gremlins.',
        '- Reserved for: Ransomware King, Cascade Failure Titan,',
        '  and any AWS billing anomaly.',
        '',
        'FIELD MANUAL: anystackarchitect.com',
        '(The BFR is real. The billing anomaly is also real.)',
      ],
    },
    hasBFR: true,
  },
];

export class SecretManager {
  constructor(scene, interaction, saveSystem, consoleUI) {
    this.scene        = scene;
    this.interaction  = interaction;
    this.saves        = saveSystem;
    this._consoleUI   = consoleUI; // FIX #5: passed explicitly, not read from window
    this._secrets     = [];
    this._revealed    = new Set();

    this._buildAll();
  }

  _buildAll() {
    SECRET_DEFS.forEach(def => {
      this._buildSecret(def);
    });
  }

  _buildSecret(def) {
    const already = this.saves.isSecretFound(def.id);

    // Build trigger object — looks like a normal server rack
    const triggerX = def.triggerCol * TILE + TILE/2;
    const triggerZ = def.triggerRow * TILE + TILE/2;

    const triggerGroup = new THREE.Group();
    triggerGroup.position.set(triggerX, 0, triggerZ);

    // Slightly different looking rack — one LED is a different color
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 2.2, 1.0),
      new THREE.MeshBasicMaterial({ color: 0x1e2226 })
    );
    body.position.y = 1.1;
    triggerGroup.add(body);

    // Secret indicator LED — dim purple, easy to miss
    const secretLED = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.04),
      new THREE.MeshBasicMaterial({ color: already ? 0x441144 : 0x660066 })
    );
    secretLED.position.set(0.25, 0.8, 0.47);
    triggerGroup.add(secretLED);

    this.scene.add(triggerGroup);

    // Build the hidden room geometry (always built, initially dark)
    const roomGroup = this._buildRoom(def, already);

    // Register trigger
    if (this.interaction) {
      this.interaction.register(triggerGroup, 'console', `secret-trigger-${def.id}`, () => {
        this._revealSecret(def, roomGroup, secretLED);
      });
    }

    this._secrets.push({ def, triggerGroup, roomGroup, revealed: already });
  }

  _buildRoom(def, alreadyFound) {
    const group = new THREE.Group();

    const ox = def.originCol * TILE;
    const oz = def.originRow * TILE;
    const W  = def.width * TILE;
    const D  = def.depth * TILE;
    const cx = ox + W/2;
    const cz = oz + D/2;

    // Floor
    const floorMat = new THREE.MeshBasicMaterial({ color: def.hasBFR ? 0x0a0a00 : 0x060a06 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.position.set(cx, 0, cz);
    group.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(W, D),
      new THREE.MeshBasicMaterial({ color: 0x050505 })
    );
    ceil.rotation.x = Math.PI/2;
    ceil.position.set(cx, WALL_H, cz);
    group.add(ceil);

    // Walls
    const wallMat = new THREE.MeshBasicMaterial({
      color: def.hasBFR ? 0x1a1a00 : 0x0a150a
    });
    [
      { pos: [cx, WALL_H/2, oz],    size: [W, WALL_H, 0.2] },
      { pos: [cx, WALL_H/2, oz+D],  size: [W, WALL_H, 0.2] },
      { pos: [ox, WALL_H/2, cz],    size: [0.2, WALL_H, D] },
      { pos: [ox+W, WALL_H/2, cz],  size: [0.2, WALL_H, D] },
    ].forEach(({ pos, size }) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(...size), wallMat);
      w.position.set(...pos);
      group.add(w);
    });

    // Atmospheric light
    const lightColor = def.hasBFR ? 0xffaa00 : 0x004400;
    const light = new THREE.PointLight(lightColor, alreadyFound ? 2 : 0, 12, 2);
    light.position.set(cx, WALL_H-0.3, cz);
    group.add(light);
    group._light = light;

    // Room sign
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256; signCanvas.height = 36;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#000';
    sCtx.fillRect(0, 0, 256, 36);
    sCtx.strokeStyle = def.hasBFR ? '#ffaa00' : '#006600';
    sCtx.strokeRect(1, 1, 254, 34);
    sCtx.fillStyle = def.hasBFR ? '#ffaa00' : '#00aa00';
    sCtx.font = 'bold 13px Courier New';
    sCtx.textAlign = 'center';
    sCtx.fillText(`🔒 ${def.name}`, 128, 24);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), transparent: true })
    );
    sign.position.set(cx, WALL_H-0.5, oz+0.15);
    group.add(sign);

    // Lore terminal
    const termGroup = this._buildLoreTerminal(def, cx, oz + D*0.4);
    group.add(termGroup);

    // BFR vault special: ammo crate
    if (def.hasBFR) {
      const crate = this._buildAmmoCrate(cx, oz + D*0.7);
      group.add(crate);
    }

    this.scene.add(group);
    return group;
  }

  _buildLoreTerminal(def, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.1, 0.5),
      new THREE.MeshBasicMaterial({ color: def.hasBFR ? 0x1a1a00 : 0x0a1a0a })
    );
    body.position.y = 0.55;
    group.add(body);

    const screenColor = def.hasBFR ? 0x221a00 : 0x001a00;
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.75, 0.05),
      new THREE.MeshBasicMaterial({ color: screenColor })
    );
    screen.position.set(0, 0.95, 0.28);
    screen.rotation.x = -0.25;
    group.add(screen);

    const glowColor = def.hasBFR ? 0xffaa00 : 0x00ff41;
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.04, 0.04),
      new THREE.MeshBasicMaterial({ color: glowColor })
    );
    glow.position.set(0, 0.52, 0.26);
    group.add(glow);

    // Register as interactable
    if (this.interaction) {
      const consoleUI = this._consoleUI; // capture for closure
      this.interaction.register(group, 'console', `secret-lore-${def.id}`, () => {
        if (!consoleUI) return;
        // Inject this secret's data so consoleUI.open() can find it
        CONSOLE_DATA[`secret-lore-${def.id}`] = {
          title:    def.name,
          subtitle: 'CLASSIFIED // LEVEL CLEARANCE REQUIRED',
          lines:    [],
          tip: {
            heading: def.content.heading,
            body:    def.content.lines,
          },
        };
        consoleUI.open(`secret-lore-${def.id}`);
      });
    }

    return group;
  }

  _buildAmmoCrate(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x332200 })
    );
    crate.position.y = 0.25;
    group.add(crate);

    // BFR label
    const label = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    label.position.set(0, 0.3, 0.27);
    group.add(label);

    // Glow
    const gl = new THREE.PointLight(0xffaa00, 1.5, 3, 2);
    gl.position.y = 0.6;
    group.add(gl);

    return group;
  }

  _revealSecret(def, roomGroup, secretLED) {
    if (this._revealed.has(def.id)) return;
    this._revealed.add(def.id);

    const isNew = this.saves.findSecret(def.id);

    // Light up the room
    if (roomGroup._light) {
      roomGroup._light.intensity = 3;
    }

    // Change trigger LED to found color
    secretLED.material.color.setHex(0x00ff41);

    // Show discovery toast
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed; top:35%; left:50%; transform:translateX(-50%);
      font-family:'Courier New',monospace; font-size:13px; letter-spacing:3px;
      color:#00ff41; text-shadow:0 0 15px #00ff41;
      pointer-events:none; text-align:center;
      animation:objToast 3.5s forwards;
    `;
    toast.innerHTML = isNew
      ? `🔓 SECRET DISCOVERED: ${def.name}`
      : `${def.name}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);

    // Spawn BFR ammo if this is the vault
    if (def.hasBFR && isNew) {
      const bfrPickupEvent = new CustomEvent('bfr-secret-found', {
        detail: { x: def.originCol*TILE + TILE*1.5, z: def.originRow*TILE + TILE }
      });
      window.dispatchEvent(bfrPickupEvent);
    }
  }

  getFoundCount() { return this._revealed.size; }
  getTotalCount()  { return SECRET_DEFS.length; }
}
