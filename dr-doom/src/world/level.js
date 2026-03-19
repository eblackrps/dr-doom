import * as THREE from 'three';

const TILE   = 4;
const WALL_H = 4;
const STEP_HEIGHT = 0.4;

/*
  Level 1 — Full Floor Layout (28 cols x 32 rows)
  Rooms:
  A = Main Server Floor (spawn)  rows 1-10,  cols 1-12
  B = Storage Vault              rows 1-10,  cols 14-27
  C = Network Core               rows 13-20, cols 1-11
  D = Cold Aisle Corridor        rows 13-20, cols 13-19
  E = Management Console Room    rows 13-20, cols 21-27
  F = Emergency Exit Corridor    rows 23-30, cols 9-18
*/

const LEVEL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 2
  [1,0,0,1,1,0,0,0,0,1,1,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1], // 3
  [1,0,0,1,0,0,0,0,0,0,1,0,1,1,0,0,1,0,0,0,0,1,0,0,1,0,0,1], // 4
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 5
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6 door row A-B
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
  [1,0,0,1,1,0,0,0,0,1,1,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,1], // 8
  [1,0,0,1,0,0,0,0,0,0,1,0,1,1,0,0,1,0,0,0,0,1,0,0,1,0,0,1], // 9
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 10
  [1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1], // 11 A-C door cols 6-7, B-E door cols 17-18
  [1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1], // 12
  [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 13
  [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 14
  [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 15
  [1,0,0,1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16 C-D door col 12
  [1,0,0,1,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 17
  [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 18
  [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 19
  [1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1], // 20
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1], // 21 D-F door cols 16-17
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1], // 22
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 23
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 24
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 25
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 26
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 27
  [1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1], // 28
  [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], // 29
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 30
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 31
];

const ROWS = LEVEL_MAP.length;
const COLS = LEVEL_MAP[0].length;

const DOOR_DEFS = [
  { col: 12, row: 6,  axis: 'x', id: 'door-ab',  label: 'VAULT ACCESS' },
  { col: 6,  row: 11, axis: 'z', id: 'door-ac',  label: 'LOWER LEVEL',   linkedId: 'door-ac2' },
  { col: 7,  row: 12, axis: 'z', id: 'door-ac2', label: 'LOWER LEVEL',   linkedId: 'door-ac'  },
  { col: 17, row: 11, axis: 'z', id: 'door-be',  label: 'MANAGEMENT',    linkedId: 'door-be2' },
  { col: 18, row: 12, axis: 'z', id: 'door-be2', label: 'MANAGEMENT',    linkedId: 'door-be'  },
  { col: 16, row: 21, axis: 'z', id: 'door-df',  label: 'EMERGENCY EXIT', linkedId: 'door-df2' },
  { col: 17, row: 22, axis: 'z', id: 'door-df2', label: 'EMERGENCY EXIT', linkedId: 'door-df'  },
  { col: 12, row: 16, axis: 'x', id: 'door-cd',  label: 'COLD AISLE' },
];

const CONSOLE_DEFS = [
  { col: 6,  row: 2,  id: 'console-spawn-overview',  facing: 's' },
  { col: 18, row: 2,  id: 'console-storage-vault',    facing: 's' },
  { col: 24, row: 5,  id: 'console-storage-hardened', facing: 'w' },
  { col: 4,  row: 16, id: 'console-network-core',     facing: 'e' },
  { col: 14, row: 16, id: 'console-cold-aisle',       facing: 'n' },
  { col: 24, row: 15, id: 'console-architect-kb',     facing: 'w' },
  { col: 13, row: 26, id: 'console-exit-gate',        facing: 's' },
];

export class Level {
  constructor(scene, interactionSystem) {
    this.scene = scene;
    this.interaction = interactionSystem;
    this._solidCells = [];
    this._doors = [];

    this._buildGeometry();
    this._buildDoors();
    this._addLighting();
    this._addServerRacks();
    this._addConsoles();
    this._addRoomSigns();
    this._addProps();

    this.spawnPoint = new THREE.Vector3(TILE * 5 + TILE/2, 0, TILE * 2 + TILE/2);
    this._map = LEVEL_MAP;
  }

  _buildGeometry() {
    const floorTex = this._makeFloorTexture();
    const wallTex  = this._makeWallTexture();
    const ceilTex  = this._makeCeilingTexture();

    const floorMat = new THREE.MeshBasicMaterial({ map: floorTex });
    const wallMat  = new THREE.MeshBasicMaterial({ map: wallTex });
    const ceilMat  = new THREE.MeshBasicMaterial({ map: ceilTex });

    const totalW = COLS * TILE;
    const totalD = ROWS * TILE;

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW, totalD),
      floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(totalW / 2, 0, totalD / 2);
    this.scene.add(floor);

    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW, totalD),
      ceilMat
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(totalW / 2, WALL_H, totalD / 2);
    this.scene.add(ceil);

    const wallGeo = new THREE.BoxGeometry(TILE, WALL_H, TILE);
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (LEVEL_MAP[row][col] === 1) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(col * TILE + TILE/2, WALL_H/2, row * TILE + TILE/2);
          wall.userData.isWall = true;
          this.scene.add(wall);
          this._solidCells.push({
            minX: col*TILE, maxX: col*TILE+TILE,
            minY: 0,        maxY: WALL_H,
            minZ: row*TILE, maxZ: row*TILE+TILE,
          });
        }
      }
    }
  }

  _buildDoors() {
    DOOR_DEFS.forEach(def => {
      const isX = def.axis === 'x';
      const doorGeo = new THREE.BoxGeometry(
        isX ? TILE - 0.1 : 0.18,
        WALL_H - 0.1,
        isX ? 0.18 : TILE - 0.1
      );
      const doorMat = new THREE.MeshBasicMaterial({ color: 0x2a3d2a });
      const mesh = new THREE.Mesh(doorGeo, doorMat);
      mesh.userData.isWall = true;

      const cx = def.col * TILE + TILE/2;
      const cz = def.row * TILE + TILE/2;
      mesh.position.set(cx, WALL_H/2, cz);

      // Green indicator strip
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(isX ? TILE-0.1 : 0.06, 0.05, isX ? 0.06 : TILE-0.1),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      );
      strip.position.y = -(WALL_H/2) + 0.1;
      mesh.add(strip);

      this.scene.add(mesh);

      const collCell = {
        minX: def.col*TILE, maxX: def.col*TILE+TILE,
        minY: 0, maxY: WALL_H,
        minZ: def.row*TILE, maxZ: def.row*TILE+TILE,
        dynamic: true, active: true,
      };
      this._solidCells.push(collCell);

      const ds = { mesh, def, open: false, opening: false, closing: false, t: 0, collCell, openTimer: 0 };
      this._doors.push(ds);

      if (this.interaction) {
        this.interaction.register(mesh, 'door', def.id, () => this._toggleDoor(ds));
      }
    });
  }

  _toggleDoor(ds) {
    const opening = !(ds.open || ds.opening);
    if (opening) {
      ds.opening = true; ds.closing = false;
    } else {
      ds.closing = true; ds.opening = false;
    }
    // Open/close linked partner door simultaneously
    if (ds.def.linkedId) {
      const partner = this._doors.find(d => d.def.id === ds.def.linkedId);
      if (partner) {
        if (opening) { partner.opening = true; partner.closing = false; }
        else          { partner.closing = true; partner.opening = false; }
      }
    }
  }

  updateDoors(dt) {
    this._doors.forEach(ds => {
      if (ds.opening) {
        ds.t = Math.min(1, ds.t + dt * 1.8);
        if (ds.t >= 1) {
          ds.open = true;
          ds.opening = false;
          ds.openTimer = 5.0; // auto-close after 5 seconds
        }
      } else if (ds.open && !ds.closing) {
        // Count down auto-close timer
        ds.openTimer -= dt;
        if (ds.openTimer <= 0) {
          ds.closing = true;
          ds.open = false;
          // Close linked partner too
          if (ds.def.linkedId) {
            const partner = this._doors.find(d => d.def.id === ds.def.linkedId);
            if (partner && !partner.closing) {
              partner.closing = true;
              partner.open = false;
            }
          }
        }
      } else if (ds.closing) {
        ds.t = Math.max(0, ds.t - dt * 1.8);
        if (ds.t <= 0) { ds.open = false; ds.closing = false; }
      }
      ds.mesh.position.y = WALL_H/2 + ds.t * (WALL_H + 0.3);
      ds.collCell.active = ds.t < 0.05;
    });
  }

  _addLighting() {
    this.scene.add(new THREE.AmbientLight(0xfff5e0, 4.0));
    this.scene.fog = new THREE.Fog(0x05080a, 12, 45);

    const roomLights = [
      // Main Server Floor
      { x: TILE*4,  z: TILE*4,  c: 0x88aacc, i: 6 },
      { x: TILE*9,  z: TILE*4,  c: 0x88aacc, i: 6 },
      { x: TILE*4,  z: TILE*8,  c: 0x88aacc, i: 6 },
      { x: TILE*9,  z: TILE*8,  c: 0x88aacc, i: 6 },
      // Storage Vault
      { x: TILE*18, z: TILE*4,  c: 0x88aacc, i: 6 },
      { x: TILE*23, z: TILE*4,  c: 0x88aacc, i: 6 },
      { x: TILE*18, z: TILE*8,  c: 0x88aacc, i: 6 },
      { x: TILE*23, z: TILE*8,  c: 0x88aacc, i: 6 },
      // Network Core
      { x: TILE*4,  z: TILE*15, c: 0x88aacc, i: 6 },
      { x: TILE*8,  z: TILE*15, c: 0x88aacc, i: 6 },
      { x: TILE*4,  z: TILE*19, c: 0x88aacc, i: 6 },
      { x: TILE*8,  z: TILE*19, c: 0x88aacc, i: 6 },
      // Cold Aisle — blue tint
      { x: TILE*15, z: TILE*15, c: 0x4488ff, i: 5 },
      { x: TILE*15, z: TILE*19, c: 0x4488ff, i: 5 },
      // Management
      { x: TILE*23, z: TILE*15, c: 0x88aacc, i: 6 },
      { x: TILE*23, z: TILE*19, c: 0x88aacc, i: 6 },
      // Emergency Exit — red/amber
      { x: TILE*13, z: TILE*25, c: 0xff4400, i: 4 },
      { x: TILE*13, z: TILE*28, c: 0xff4400, i: 4 },
    ];

    roomLights.forEach(({ x, z, c, i }) => {
      const light = new THREE.PointLight(c, i, 20, 2);
      light.position.set(x, WALL_H - 0.3, z);
      this.scene.add(light);

      const fix = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.07, 0.28),
        new THREE.MeshBasicMaterial({ color: c === 0x4488ff ? 0x88aaff : 0xccddff })
      );
      fix.position.set(x, WALL_H - 0.04, z);
      this.scene.add(fix);
    });

    // Console glow
    CONSOLE_DEFS.forEach(def => {
      const g = new THREE.PointLight(0x00ff41, 0.8, 4, 2);
      g.position.set(def.col*TILE+TILE/2, 1.2, def.row*TILE+TILE/2);
      this.scene.add(g);
    });
  }

  _addServerRacks() {
    // Main Server Floor
    [[2,3],[5,3],[8,3],[10,3],[2,7],[5,7],[8,7],[10,7]].forEach(([c,r]) => {
      this.scene.add(this._makeServerRack(c*TILE+TILE/2, r*TILE+TILE/2));
    });
    // Storage Vault
    [[15,3],[16,3],[20,3],[21,3],[24,3],[25,3],
     [15,7],[16,7],[20,7],[21,7],[24,7],[25,7]].forEach(([c,r]) => {
      this.scene.add(this._makeServerRack(c*TILE+TILE/2, r*TILE+TILE/2));
    });
    // Network Core — patch panels
    [[2,14],[5,14],[8,14],[2,18],[5,18],[8,18]].forEach(([c,r]) => {
      this.scene.add(this._makeNetworkRack(c*TILE+TILE/2, r*TILE+TILE/2));
    });
  }

  _makeServerRack(x, z) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x1a2030 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 1.0), bodyMat);
    body.position.y = 1.1;
    g.add(body);

    // Front face — slightly lighter
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 2.18, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x252e40 })
    );
    face.position.set(0, 1.1, 0.5);
    g.add(face);

    for (let i = 0; i < 12; i++) {
      const bay = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.13, 0.015),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x1e2840 : 0x283248 })
      );
      bay.position.set(0, 0.18 + i * 0.17, 0.51);
      g.add(bay);

      // LED — bright and readable
      if (Math.random() > 0.2) {
        const ledColor = Math.random() > 0.12 ? 0x00ff41 : 0xff2200;
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.02),
          new THREE.MeshBasicMaterial({ color: ledColor })
        );
        led.position.set(0.22, 0.18 + i * 0.17, 0.52);
        g.add(led);
      }
    }
    g.position.set(x, 0, z);
    return g;
  }

  _makeNetworkRack(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.4, 0.8),
      new THREE.MeshBasicMaterial({ color: 0x1a2030 })
    );
    body.position.y = 0.7;
    g.add(body);

    // Front panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 1.38, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x222d40 })
    );
    panel.position.set(0, 0.7, 0.41);
    g.add(panel);

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 8; j++) {
        const portColor = Math.random() > 0.3 ? 0x0055ff : 0x222222;
        const port = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.02),
          new THREE.MeshBasicMaterial({ color: portColor })
        );
        port.position.set(-0.18 + j * 0.05, 0.4 + i * 0.17, 0.42);
        g.add(port);
      }
    }
    g.position.set(x, 0, z);
    return g;
  }

  _addConsoles() {
    if (!this.interaction) return;
    const facingAngles = { n: 0, s: Math.PI, e: Math.PI/2, w: -Math.PI/2 };

    CONSOLE_DEFS.forEach(def => {
      const g = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.0, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x1a2a1a })
      );
      body.position.y = 0.5;
      g.add(body);

      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.65, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x003300 })
      );
      screen.position.set(0, 0.85, 0.28);
      screen.rotation.x = -0.3;
      g.add(screen);

      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.04, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x00ff41 })
      );
      glow.position.set(0, 0.52, 0.26);
      g.add(glow);

      g.position.set(def.col*TILE+TILE/2, 0, def.row*TILE+TILE/2);
      g.rotation.y = facingAngles[def.facing] || 0;
      this.scene.add(g);

      this.interaction.register(g, 'console', def.id, () => {
        this.interaction.consoleUI.open(def.id);
      });
    });
  }

  _addRoomSigns() {
    const signs = [
      { text: 'MAIN SERVER FLOOR',    col: 6,  row: 1  },
      { text: 'STORAGE VAULT',        col: 20, row: 1  },
      { text: 'NETWORK CORE',         col: 5,  row: 13 },
      { text: 'COLD AISLE',           col: 15, row: 13 },
      { text: 'MANAGEMENT CONSOLES',  col: 23, row: 13 },
      { text: 'EMERGENCY EXIT',       col: 13, row: 23 },
    ];

    signs.forEach(({ text, col, row }) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 48;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0a1a0e';
      ctx.fillRect(0, 0, 256, 48);
      ctx.strokeStyle = '#00ff41';
      ctx.strokeRect(1, 1, 254, 46);
      ctx.fillStyle = '#00ff41';
      ctx.font = 'bold 15px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 31);

      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 0.47),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true })
      );
      sign.position.set(col*TILE+TILE/2, WALL_H - 0.5, row*TILE + 0.15);
      this.scene.add(sign);
    });
  }

  _addProps() {
    // Cable trays
    const trayMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const trays = [
      [1*TILE, 6*TILE, 11*TILE, 6*TILE],
      [14*TILE, 1*TILE, 14*TILE, 10*TILE],
    ];
    trays.forEach(([x1,z1,x2,z2]) => {
      const len = Math.sqrt((x2-x1)**2+(z2-z1)**2);
      const ang = Math.atan2(z2-z1, x2-x1);
      const t = new THREE.Mesh(new THREE.BoxGeometry(len,0.08,0.35), trayMat);
      t.position.set((x1+x2)/2, WALL_H-0.25, (z1+z2)/2);
      t.rotation.y = -ang;
      this.scene.add(t);
    });

    // Raised floor in cold aisle
    const raisedMat = new THREE.MeshBasicMaterial({ color: 0x1a2a3a });
    for (let col = 13; col <= 19; col++) {
      for (let row = 13; row <= 20; row++) {
        if (LEVEL_MAP[row]?.[col] === 0) {
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(TILE-0.1, STEP_HEIGHT, TILE-0.1),
            raisedMat
          );
          panel.position.set(col*TILE+TILE/2, STEP_HEIGHT/2, row*TILE+TILE/2);
          this.scene.add(panel);
          this._solidCells.push({
            minX: col*TILE+0.05, maxX: col*TILE+TILE-0.05,
            minZ: row*TILE+0.05, maxZ: row*TILE+TILE-0.05,
            minY: 0, maxY: STEP_HEIGHT,
            isStep: true, stepHeight: STEP_HEIGHT,
          });
        }
      }
    }

    // Hazard stripes in exit corridor
    const hazardMats = [
      new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
      new THREE.MeshBasicMaterial({ color: 0x222222 }),
    ];
    for (let row = 23; row <= 29; row++) {
      for (let col = 9; col <= 18; col++) {
        if (LEVEL_MAP[row]?.[col] === 0 && Math.random() > 0.65) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(TILE-0.2, 0.01, 0.2),
            hazardMats[Math.floor(Math.random()*2)]
          );
          stripe.position.set(col*TILE+TILE/2, 0.005, row*TILE+TILE/2);
          stripe.rotation.y = Math.PI/4;
          this.scene.add(stripe);
        }
      }
    }
  }

  // ---- Textures ----

  _makeFloorTexture() {
    const s = 512, c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Dark charcoal base — floor should be darkest surface
    ctx.fillStyle = '#282828';
    ctx.fillRect(0, 0, s, s);

    // Large tile grid
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    for (let x = 0; x <= s; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
    }
    for (let y = 0; y <= s; y += 128) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
    }

    // Tile surface — slightly lighter
    ctx.fillStyle = '#303030';
    for (let tx = 0; tx < s; tx += 128) {
      for (let ty = 0; ty < s; ty += 128) {
        ctx.fillRect(tx + 3, ty + 3, 122, 122);
      }
    }

    // Diamond-plate pattern — raised diamond bumps
    ctx.fillStyle = '#3a3a3a';
    for (let tx = 0; tx < s; tx += 128) {
      for (let ty = 0; ty < s; ty += 128) {
        for (let dx = 16; dx < 120; dx += 20) {
          for (let dy = 16; dy < 120; dy += 20) {
            ctx.beginPath();
            ctx.moveTo(tx + dx + 6, ty + dy);
            ctx.lineTo(tx + dx + 12, ty + dy + 6);
            ctx.lineTo(tx + dx + 6, ty + dy + 12);
            ctx.lineTo(tx + dx, ty + dy + 6);
            ctx.closePath();
            ctx.fill();
            // Highlight edge of diamond
            ctx.fillStyle = '#484848';
            ctx.beginPath();
            ctx.moveTo(tx + dx + 6, ty + dy);
            ctx.lineTo(tx + dx + 12, ty + dy + 6);
            ctx.lineTo(tx + dx + 10, ty + dy + 6);
            ctx.lineTo(tx + dx + 6, ty + dy + 2);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#3a3a3a';
          }
        }
      }
    }

    // Worn patches
    ctx.fillStyle = '#222222';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * s, Math.random() * s,
        10 + Math.random() * 30, 5 + Math.random() * 15,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(COLS * 0.25, ROWS * 0.25);
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  _makeWallTexture() {
    const s = 512, c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Base — cool blue-gray painted steel, data center aesthetic
    ctx.fillStyle = '#4a5260';
    ctx.fillRect(0, 0, s, s);

    // Subtle blue-gray noise — break up the flat base
    for (let i = 0; i < 2000; i++) {
      const v = Math.floor(Math.random() * 18) - 9;
      const r = 74 + v, g = 82 + v, b = 96 + v;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }

    // Vertical steel panel seams — segmented panel look every 128px
    ctx.strokeStyle = '#363d4a';
    ctx.lineWidth = 3;
    for (let x = 128; x < s; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
      // Highlight edge to give depth
      ctx.strokeStyle = '#5c6675';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, s); ctx.stroke();
      ctx.strokeStyle = '#363d4a';
      ctx.lineWidth = 3;
    }

    // Horizontal block courses — CMU joint lines, blue-gray toned
    ctx.strokeStyle = '#3a404e';
    ctx.lineWidth = 3;
    for (let y = 0; y <= s; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
    }

    // Vertical block joints within panels — running bond offset
    ctx.lineWidth = 2;
    for (let row = 0; row < s / 64; row++) {
      const offset = (row % 2 === 0) ? 0 : 64;
      for (let x = offset; x <= s; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, row * 64);
        ctx.lineTo(x, row * 64 + 64);
        ctx.stroke();
      }
    }

    // High-vis yellow/black OSHA safety stripe band
    for (let y = 192; y < s; y += 256) {
      ctx.fillStyle = '#ffd000';
      ctx.fillRect(0, y, s, 22);
      // Black diagonal chevrons on yellow band
      ctx.fillStyle = '#111100';
      for (let x = -24; x < s; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x,      y);
        ctx.lineTo(x + 22, y);
        ctx.lineTo(x,      y + 22);
        ctx.closePath();
        ctx.fill();
      }
      // Bold black border beneath stripe
      ctx.fillStyle = '#0a0a00';
      ctx.fillRect(0, y + 20, s, 4);
    }

    // Cable tray / conduit strip along top — metallic blue-gray
    ctx.fillStyle = '#333b47';
    ctx.fillRect(0, 2, s, 14);
    ctx.fillStyle = '#5e6878';
    ctx.fillRect(0, 3, s, 5);
    // Conduit bolt marks
    ctx.fillStyle = '#2a3040';
    for (let x = 20; x < s; x += 64) {
      ctx.beginPath();
      ctx.arc(x, 9, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  _makeCeilingTexture() {
    const s = 256, c = document.createElement('canvas');
    c.width = s; c.height = s;
    const ctx = c.getContext('2d');

    // Dark ceiling — almost black
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(0, 0, s, s);

    // T-bar grid — visible silver bars
    ctx.strokeStyle = '#585858';
    ctx.lineWidth = 5;
    for (let x = 0; x <= s; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s); ctx.stroke();
    }
    for (let y = 0; y <= s; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y); ctx.stroke();
    }

    // Ceiling tile panels
    ctx.fillStyle = '#222226';
    for (let tx = 0; tx < s; tx += 64) {
      for (let ty = 0; ty < s; ty += 64) {
        ctx.fillRect(tx + 4, ty + 4, 56, 56);
      }
    }

    // Fluorescent tube light strips — bright warm white
    ctx.fillStyle = '#ffffd0';
    for (let ty = 0; ty < s; ty += 128) {
      ctx.fillRect(16, ty + 26, s - 32, 12);
      // Glow halo
      ctx.fillStyle = 'rgba(255,255,180,0.15)';
      ctx.fillRect(0, ty + 18, s, 28);
      ctx.fillStyle = '#ffffd0';
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(COLS * 0.5, ROWS * 0.5);
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  // ---- Collision ----

  collidesAABB(position, radius, height) {
    const minX = position.x - radius, maxX = position.x + radius;
    const minY = position.y - height, maxY = position.y;
    const minZ = position.z - radius, maxZ = position.z + radius;

    for (const cell of this._solidCells) {
      if (cell.dynamic && !cell.active) continue;
      if (cell.isStep) continue;
      if (maxX > cell.minX && minX < cell.maxX &&
          maxY > cell.minY && minY < cell.maxY &&
          maxZ > cell.minZ && minZ < cell.maxZ) return true;
    }
    return false;
  }

  getStepHeight(position, radius) {
    for (const cell of this._solidCells) {
      if (!cell.isStep) continue;
      if (position.x+radius > cell.minX && position.x-radius < cell.maxX &&
          position.z+radius > cell.minZ && position.z-radius < cell.maxZ) {
        return cell.stepHeight;
      }
    }
    return 0;
  }

  update(dt) {
    this.updateDoors(dt);
  }
}
