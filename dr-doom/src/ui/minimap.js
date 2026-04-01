// Minimap — wire-frame network topology view of the level
// Drawn on the #minimap-canvas element each frame

import { TILE, ROWS as LEVEL_ROWS, COLS as LEVEL_COLS } from '../world/level.js';
import { WORLD_COLS, WORLD_ROWS } from '../world/boss-arenas.js';

// Draw a filled triangle centred at (cx, cy) pointing in the direction given by
// yaw (entity convention: forward = (sin yaw, cos yaw) in canvas space).
// tip   — distance from centre to tip
// wing  — half-width of the base (base is perpendicular, one `wing` behind centre)
function _tri(ctx, cx, cy, yaw, tip, wing) {
  const fdx =  Math.sin(yaw);
  const fdy =  Math.cos(yaw);
  ctx.beginPath();
  ctx.moveTo(cx + fdx * tip,                    cy + fdy * tip);
  ctx.lineTo(cx - fdx * wing - fdy * wing,      cy - fdy * wing + fdx * wing);
  ctx.lineTo(cx - fdx * wing + fdy * wing,      cy - fdy * wing - fdx * wing);
  ctx.closePath();
  ctx.fill();
}

// Room definitions for minimap labels
const ROOMS = [
  { label: 'MSF',  minC:1,  maxC:12, minR:1,  maxR:10 },
  { label: 'SV',   minC:14, maxC:27, minR:1,  maxR:10 },
  { label: 'NC',   minC:1,  maxC:11, minR:13, maxR:20 },
  { label: 'CA',   minC:13, maxC:19, minR:13, maxR:20 },
  { label: 'MC',   minC:21, maxC:27, minR:13, maxR:20 },
  { label: 'EXIT', minC:9,  maxC:18, minR:23, maxR:30 },
  { label: 'RK',   minC:29, maxC:42, minR:0,  maxR:11 },
  { label: 'AUD',  minC:29, maxC:42, minR:14, maxR:29 },
  { label: 'CT',   minC:0,  maxC:27, minR:33, maxR:46 },
];

export class Minimap {
  constructor(levelMap) {
    this._canvas = document.getElementById('minimap-canvas');
    this._ctx    = this._canvas ? this._canvas.getContext('2d') : null;
    this._map    = levelMap;
    this._size   = this._canvas?.width ?? 120;
    this._cellW  = this._size / WORLD_COLS;
    this._cellH  = this._size / WORLD_ROWS;
  }

  update(playerPos, playerYaw, enemies, objectiveTarget = null) {
    if (!this._ctx) return;
    const ctx  = this._ctx;
    const s    = this._size;
    const cW   = this._cellW;
    const cH   = this._cellH;

    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#020a04';
    ctx.fillRect(0, 0, s, s);

    if (!this._map) return;

    // Draw map cells
    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        if (!this._map[row]) continue;
        const cell = this._map[row][col];
        const x = col * cW;
        const y = row * cH;

        if (cell === 1) {
          ctx.fillStyle = '#1a2a1a';
          ctx.fillRect(x, y, cW, cH);
        }
      }
    }

    // Room highlight outlines
    ROOMS.forEach(room => {
      ctx.strokeStyle = '#00ff4111';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        room.minC * cW, room.minR * cH,
        (room.maxC - room.minC + 1) * cW,
        (room.maxR - room.minR + 1) * cH
      );
      // Room label
      ctx.fillStyle = '#00ff4122';
      ctx.font = `${Math.max(4, cW * 2)}px Courier New`;
      ctx.fillText(
        room.label,
        (room.minC + 0.5) * cW,
        (room.minR + 2) * cH
      );
    });

    if (objectiveTarget?.position) {
      const targetX = (objectiveTarget.position.x / (WORLD_COLS * TILE)) * s;
      const targetY = (objectiveTarget.position.z / (WORLD_ROWS * TILE)) * s;
      const pulse = 2.2 + Math.sin(performance.now() * 0.008) * 1.2;
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(targetX, targetY, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(targetX, targetY, Math.max(1.5, pulse - 2), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Enemies — directional triangles.
    // Yaw convention: forward = (-sin, 0, -cos) in world space.
    // Canvas mapping: world X → canvas x, world Z → canvas y.
    // So canvas forward direction = (-sin(yaw), -cos(yaw))... but entities face
    // the direction their velocity points, stored as atan2(vx, vz), meaning
    // canvas forward = (sin(yaw), cos(yaw)).
    // Colour: bright when chasing/attacking, dim when patrolling/idle.
    if (enemies) {
      enemies.forEach(e => {
        if (e.isDead) return;
        const ex = (e.position.x / (WORLD_COLS * TILE)) * s;
        const ey = (e.position.z / (WORLD_ROWS * TILE)) * s;
        const alerted = e.state === 'chase' || e.state === 'attack';
        ctx.fillStyle = alerted ? '#ff2200cc' : '#ff220044';
        _tri(ctx, ex, ey, e.yaw, 3.5, 2);
      });
    }

    // Player — bright green directional triangle
    if (playerPos) {
      const px = (playerPos.x / (WORLD_COLS * TILE)) * s;
      const py = (playerPos.z / (WORLD_ROWS * TILE)) * s;
      // Player forward in world space is (-sin yaw, -cos yaw), so add π to flip
      // the triangle to face the same direction as the camera.
      const facingYaw = playerYaw + Math.PI;
      ctx.fillStyle = '#00ff4166';
      _tri(ctx, px, py, facingYaw, 5, 3);
      ctx.fillStyle = '#00ff41';
      _tri(ctx, px, py, facingYaw, 4, 2.5);
    }
  }
}
