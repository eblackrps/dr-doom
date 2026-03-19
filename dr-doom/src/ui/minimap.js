// Minimap — wire-frame network topology view of the level
// Drawn on the #minimap-canvas element each frame

const TILE  = 4;
const ROWS  = 32;
const COLS  = 28;

// Room definitions for minimap labels
const ROOMS = [
  { label: 'MSF',  minC:1,  maxC:12, minR:1,  maxR:10 },
  { label: 'SV',   minC:14, maxC:27, minR:1,  maxR:10 },
  { label: 'NC',   minC:1,  maxC:11, minR:13, maxR:20 },
  { label: 'CA',   minC:13, maxC:19, minR:13, maxR:20 },
  { label: 'MC',   minC:21, maxC:27, minR:13, maxR:20 },
  { label: 'EXIT', minC:9,  maxC:18, minR:23, maxR:30 },
];

export class Minimap {
  constructor(levelMap) {
    this._canvas = document.getElementById('minimap-canvas');
    this._ctx    = this._canvas ? this._canvas.getContext('2d') : null;
    this._map    = levelMap;
    this._size   = 120;
    this._cellW  = this._size / COLS;
    this._cellH  = this._size / ROWS;
  }

  update(playerPos, enemies) {
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
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
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

    // Enemies — red dots
    if (enemies) {
      enemies.forEach(e => {
        if (e.isDead) return;
        const ex = (e.position.x / (COLS * TILE)) * s;
        const ey = (e.position.z / (ROWS * TILE)) * s;
        ctx.fillStyle = '#ff220099';
        ctx.fillRect(ex - 1, ey - 1, 2, 2);
      });
    }

    // Player — bright green triangle
    if (playerPos) {
      const px = (playerPos.x / (COLS * TILE)) * s;
      const py = (playerPos.z / (ROWS * TILE)) * s;
      ctx.fillStyle = '#00ff41';
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      // Glow
      ctx.fillStyle = '#00ff4144';
      ctx.fillRect(px - 3, py - 3, 6, 6);
    }
  }
}
