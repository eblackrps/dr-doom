import * as THREE from 'three';

// Generates a procedural canvas sprite for each enemy type
// Each enemy has 8 directional frames + death frame
// All drawn programmatically — no external assets

const SIZE = 64; // sprite sheet frame size

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---- Per-enemy sprite painters ----

const PAINTERS = {

  corruption_crawler(ctx, frame, s) {
    // Small, low, crablike data corruption blob
    const facing = frame / 8;
    ctx.fillStyle = '#6600aa';
    ctx.fillRect(s*0.2, s*0.45, s*0.6, s*0.35);
    // Body blob
    ctx.fillStyle = '#aa00ff';
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.55, s*0.28, s*0.2, facing * 0.3, 0, Math.PI*2);
    ctx.fill();
    // Corruption patches
    ctx.fillStyle = '#ff00ff';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(s*(0.25+i*0.12), s*0.48, s*0.08, s*0.08);
    }
    // Eyes
    ctx.fillStyle = '#ff0066';
    ctx.fillRect(s*0.35, s*0.44, s*0.08, s*0.06);
    ctx.fillRect(s*0.55, s*0.44, s*0.08, s*0.06);
    // Legs
    ctx.strokeStyle = '#8800cc';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const x = s*(0.3 + i*0.15);
      ctx.beginPath(); ctx.moveTo(x, s*0.68); ctx.lineTo(x-4, s*0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, s*0.68); ctx.lineTo(x+4, s*0.85); ctx.stroke();
    }
  },

  ransomware_wraith(ctx, frame, s) {
    // Hovering spectral form, encryption lock motif
    const bob = Math.sin(frame * 0.8) * 3;
    // Cloak / body
    ctx.fillStyle = '#003333';
    ctx.beginPath();
    ctx.moveTo(s*0.5, s*0.1 + bob);
    ctx.lineTo(s*0.15, s*0.9);
    ctx.lineTo(s*0.85, s*0.9);
    ctx.closePath();
    ctx.fill();
    // Inner glow
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.35 + bob, s*0.15, s*0.2, 0, 0, Math.PI*2);
    ctx.fill();
    // Face — glowing eyes
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(s*0.38, s*0.28 + bob, s*0.08, s*0.06);
    ctx.fillRect(s*0.52, s*0.28 + bob, s*0.08, s*0.06);
    // Lock icon on chest
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(s*0.42, s*0.42 + bob, s*0.16, s*0.13);
    ctx.beginPath();
    ctx.arc(s*0.5, s*0.42 + bob, s*0.07, Math.PI, 0);
    ctx.stroke();
    // Wispy tendrils
    ctx.strokeStyle = '#006644';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(s*(0.2+i*0.25), s*0.82);
      ctx.lineTo(s*(0.15+i*0.25), s*0.95);
      ctx.stroke();
    }
  },

  hardware_gremlin(ctx, frame, s) {
    // Stocky, mechanical, walking tank
    // Body — thick square
    ctx.fillStyle = '#442200';
    ctx.fillRect(s*0.2, s*0.3, s*0.6, s*0.5);
    // Metal plating
    ctx.fillStyle = '#663300';
    ctx.fillRect(s*0.25, s*0.35, s*0.5, s*0.2);
    ctx.fillRect(s*0.25, s*0.6, s*0.5, s*0.15);
    // Head
    ctx.fillStyle = '#553300';
    ctx.fillRect(s*0.3, s*0.15, s*0.4, s*0.2);
    // Eyes — red failure lights
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(s*0.35, s*0.2, s*0.1, s*0.08);
    ctx.fillRect(s*0.53, s*0.2, s*0.1, s*0.08);
    // Arms
    ctx.fillStyle = '#442200';
    const armSwing = Math.sin(frame * 1.2) * 4;
    ctx.fillRect(s*0.08, s*0.32 + armSwing, s*0.14, s*0.28);
    ctx.fillRect(s*0.78, s*0.32 - armSwing, s*0.14, s*0.28);
    // Legs
    const legSwing = Math.sin(frame * 1.2) * 5;
    ctx.fillStyle = '#331a00';
    ctx.fillRect(s*0.28, s*0.78 + legSwing, s*0.18, s*0.16);
    ctx.fillRect(s*0.52, s*0.78 - legSwing, s*0.18, s*0.16);
    // Spark vents
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(s*0.22, s*0.38, s*0.06, s*0.04);
    ctx.fillRect(s*0.7, s*0.38, s*0.06, s*0.04);
  },

  network_phantom(ctx, frame, s) {
    // Flickering, translucent — visibility driven by frame
    const alpha = 0.3 + Math.abs(Math.sin(frame * 0.7)) * 0.7;
    ctx.globalAlpha = alpha;
    // Ghostly body
    ctx.fillStyle = '#0044aa';
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.4, s*0.22, s*0.35, 0, 0, Math.PI*2);
    ctx.fill();
    // Signal wave pattern
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < s; x += 2) {
      const y = s*0.5 + Math.sin((x/s * Math.PI * 4) + frame * 0.5) * s*0.08;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Eyes — wifi symbol
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(s*0.4, s*0.28, s*0.06, s*0.06);
    ctx.fillRect(s*0.52, s*0.28, s*0.06, s*0.06);
    // Packet loss holes
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(s*0.44, s*0.5, s*0.12, s*0.1);
    ctx.globalAlpha = alpha;
  },

  latency_leech(ctx, frame, s) {
    // Slug-like, attaches to player
    ctx.fillStyle = '#887700';
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.6, s*0.3, s*0.18, 0, 0, Math.PI*2);
    ctx.fill();
    // Segmented body
    ctx.strokeStyle = '#665500';
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(s*0.5, s*0.6, s*(0.3-i*0.04), s*(0.18-i*0.02), 0, 0, Math.PI*2);
      ctx.stroke();
    }
    // Head
    ctx.fillStyle = '#aaaa00';
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.38, s*0.15, s*0.15, 0, 0, Math.PI*2);
    ctx.fill();
    // Sucker mouth
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(s*0.5, s*0.38, s*0.07, 0, Math.PI*2);
    ctx.fill();
    // Antenna
    const antWiggle = Math.sin(frame * 2) * 4;
    ctx.strokeStyle = '#aaaa00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s*0.43, s*0.25);
    ctx.lineTo(s*0.38 + antWiggle, s*0.12);
    ctx.moveTo(s*0.57, s*0.25);
    ctx.lineTo(s*0.62 - antWiggle, s*0.12);
    ctx.stroke();
  },

  config_drift_specter(ctx, frame, s) {
    // Starts humanoid (friendly-looking), morphs into hostile
    const morph = (frame % 8) / 7; // 0=friendly, 1=hostile
    // Body
    const bodyColor = `rgb(${Math.floor(40+morph*160)}, ${Math.floor(80-morph*60)}, ${Math.floor(40+morph*20)})`;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(s*0.3, s*0.3, s*0.4, s*0.45);
    // Head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.22, s*0.16, s*0.16, 0, 0, Math.PI*2);
    ctx.fill();
    // Face — morphs from smiley to hostile
    ctx.fillStyle = morph > 0.5 ? '#ff0000' : '#00ff00';
    // Eyes
    ctx.fillRect(s*0.4, s*0.18, s*0.07, s*0.06);
    ctx.fillRect(s*0.52, s*0.18, s*0.07, s*0.06);
    // Mouth
    ctx.strokeStyle = morph > 0.5 ? '#ff0000' : '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (morph < 0.5) {
      ctx.arc(s*0.5, s*0.25, s*0.07, 0, Math.PI); // smile
    } else {
      ctx.arc(s*0.5, s*0.3, s*0.07, Math.PI, 0); // frown
    }
    ctx.stroke();
    // Config drift corruption patches
    if (morph > 0.3) {
      ctx.fillStyle = `rgba(255,0,100,${morph*0.6})`;
      ctx.fillRect(s*0.28, s*0.35, s*0.15, s*0.12);
      ctx.fillRect(s*0.55, s*0.5, s*0.18, s*0.1);
    }
    // Arms
    ctx.fillStyle = bodyColor;
    ctx.fillRect(s*0.12, s*0.32, s*0.18, s*0.12);
    ctx.fillRect(s*0.68, s*0.32, s*0.18, s*0.12);
  },

  cascade_titan(ctx, frame, s) {
    // Mini-boss: large, multi-component, chaotic
    const shake = Math.sin(frame * 3) * 2;
    // Main body — imposing
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(s*0.1, s*0.1, s*0.8, s*0.75);
    // Armor plating
    ctx.fillStyle = '#442200';
    ctx.fillRect(s*0.15, s*0.15, s*0.7, s*0.25);
    ctx.fillRect(s*0.15, s*0.45, s*0.7, s*0.25);
    // Head — screen face
    ctx.fillStyle = '#000000';
    ctx.fillRect(s*0.25, s*0.12 + shake, s*0.5, s*0.3);
    // Glitching screen
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(s*0.28, s*0.15 + shake, s*0.44, s*0.08);
    ctx.fillStyle = '#ffaa00';
    ctx.font = `${s*0.1}px monospace`;
    ctx.fillText('FAIL', s*0.3, s*0.28 + shake);
    // Cascade failure indicators
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ff2200' : '#ff8800';
      ctx.fillRect(s*(0.17+i*0.17), s*0.47, s*0.12, s*0.06);
    }
    // Massive fists
    const fistL = Math.sin(frame * 1.5) * 6;
    ctx.fillStyle = '#331100';
    ctx.fillRect(s*0.0, s*0.35 + fistL, s*0.12, s*0.3);
    ctx.fillRect(s*0.88, s*0.35 - fistL, s*0.12, s*0.3);
    // Spark effects
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < 3; i++) {
      if (Math.sin(frame * 4 + i) > 0.5) {
        ctx.fillRect(s*(0.2+i*0.25)+shake, s*0.08, 3, 3);
      }
    }
  },

  death(ctx, s) {
    // Generic death sprite — pile of debris/sparks
    ctx.fillStyle = '#333300';
    ctx.beginPath();
    ctx.ellipse(s*0.5, s*0.75, s*0.35, s*0.12, 0, 0, Math.PI*2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ff8800' : '#ffff00';
      const angle = (i / 6) * Math.PI * 2;
      const r = s * 0.2;
      ctx.fillRect(
        s*0.5 + Math.cos(angle)*r - 3,
        s*0.6 + Math.sin(angle)*r*0.4 - 3,
        6, 4
      );
    }
  },
};

// ---- SpriteSheet factory ----
// Returns a texture atlas with 9 frames: 8 directional + 1 death

export function buildSpriteSheet(enemyType) {
  const FRAMES = 9; // 8 dir + 1 death
  const canvas = makeCanvas(SIZE * FRAMES, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const painter = PAINTERS[enemyType];
  if (!painter) {
    // Fallback: magenta error square
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }

  for (let f = 0; f < 8; f++) {
    ctx.clearRect(f * SIZE, 0, SIZE, SIZE);
    ctx.save();
    ctx.translate(f * SIZE, 0);
    painter(ctx, f, SIZE);
    ctx.restore();
  }

  // Death frame
  ctx.save();
  ctx.translate(8 * SIZE, 0);
  if (PAINTERS.death) PAINTERS.death(ctx, SIZE);
  else painter(ctx, 0, SIZE);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

// ---- Billboard sprite mesh ----

export class BillboardSprite {
  constructor(spriteSheet, isBoss = false) {
    this._sheet = spriteSheet;
    this._frame = 0;
    this._isBoss = isBoss;

    // Sprites are taller than wide so enemies read clearly at close range.
    // Y offset raised so the sprite center sits at chest height, not ankle height.
    const scale = isBoss ? 2.8 : 1.5;
    const geo = new THREE.PlaneGeometry(scale, scale * 1.4);
    const mat = new THREE.MeshBasicMaterial({
      map: spriteSheet,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    // Center sprite at player eye height (1.65) so crosshair naturally aligns.
    // Boss sprites are taller so offset slightly higher.
    this.mesh.position.y = isBoss ? 1.8 : 1.65;

    this._updateUVs(0);
  }

  // frame: 0-7 directional, 8 = death
  setFrame(frame) {
    if (frame === this._frame) return;
    this._frame = frame;
    this._updateUVs(frame);
  }

  // Compute which of 8 directions to show based on angle between enemy facing and camera
  getDirectionalFrame(enemyYaw, cameraPos, enemyPos) {
    const dx = cameraPos.x - enemyPos.x;
    const dz = cameraPos.z - enemyPos.z;
    const angleToCamera = Math.atan2(dx, dz);
    let diff = ((angleToCamera - enemyYaw) + Math.PI * 2) % (Math.PI * 2);
    // 8 directions, each spanning 45 degrees
    return Math.floor((diff + Math.PI / 8) / (Math.PI / 4)) % 8;
  }

  _updateUVs(frame) {
    const FRAMES = 9;
    const uMin = frame / FRAMES;
    const uMax = (frame + 1) / FRAMES;
    const pos = this.mesh.geometry.attributes.uv;
    pos.setXY(0, uMin, 1);
    pos.setXY(1, uMax, 1);
    pos.setXY(2, uMin, 0);
    pos.setXY(3, uMax, 0);
    pos.needsUpdate = true;
  }

  // Billboard: always face camera, Y-axis only
  faceCamera(camera) {
    // FIX #9: guard against mesh not yet added to a parent group
    if (!this.mesh.parent) return;
    const dx = camera.position.x - this.mesh.parent.position.x;
    const dz = camera.position.z - this.mesh.parent.position.z;
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
