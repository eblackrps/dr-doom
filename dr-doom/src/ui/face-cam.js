// Face cam — sysadmin portrait reacting to health, damage, weapons, boss encounters
// Drawn procedurally on a canvas element in the HUD bottom bar

const SIZE = 48;

export class FaceCam {
  constructor() {
    this._canvas = null;
    this._ctx    = null;
    this._state  = 'normal'; // normal | hurt | pain | critical | rage | dead | boss | pickup
    this._stateTimer = 0;
    this._blinkTimer = 0;
    this._blinking   = false;
    this._elapsed    = 0;
    this._lastHp     = 100;
    this._build();
  }

  _build() {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex; flex-direction: column;
      align-items: center; gap: 2px;
    `;

    const label = document.createElement('div');
    label.className = 'hud-label';
    label.textContent = 'ENGINEER';

    const canvas = document.createElement('canvas');
    canvas.width  = SIZE;
    canvas.height = SIZE;
    canvas.style.cssText = `
      width: ${SIZE}px; height: ${SIZE}px;
      border: 1px solid #1a2a1a;
      image-rendering: pixelated;
    `;

    wrap.appendChild(label);
    wrap.appendChild(canvas);

    // Insert into hud-bottom after armor stat
    const hudBottom = document.getElementById('hud-bottom');
    if (hudBottom) {
      // Insert after the armor stat (index 1)
      const stats = hudBottom.querySelectorAll('.hud-stat');
      if (stats[1]) {
        stats[1].after(wrap);
      } else {
        hudBottom.appendChild(wrap);
      }
    }

    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');
    this._draw();
  }

  update(dt, player, isBossFight) {
    this._elapsed += dt;
    this._stateTimer = Math.max(0, this._stateTimer - dt);
    this._blinkTimer -= dt;

    const hp = player.health;

    // Determine state
    if (hp <= 0) {
      this._state = 'dead';
    } else if (this._stateTimer > 0) {
      // Keep current temporary state
    } else if (hp <= 15) {
      this._state = 'critical';
    } else if (hp <= 40) {
      this._state = 'pain';
    } else if (isBossFight) {
      this._state = 'boss';
    } else {
      this._state = 'normal';
    }

    // React to damage
    if (hp < this._lastHp - 1) {
      const dmg = this._lastHp - hp;
      if (dmg > 30) {
        this._setState('rage', 0.6);
      } else {
        this._setState('hurt', 0.4);
      }
    }
    this._lastHp = hp;

    // Blink randomly
    if (this._blinkTimer <= 0) {
      this._blinking = true;
      this._blinkTimer = 3 + Math.random() * 5;
      setTimeout(() => { this._blinking = false; this._draw(); }, 120);
    }

    this._draw();
  }

  _setState(state, duration) {
    this._state = state;
    this._stateTimer = duration;
  }

  notifyPickup()   { this._setState('pickup', 0.5); }
  notifyBossEntry(){ this._setState('boss',   999);  }
  notifyBossExit() { this._stateTimer = 0; }

  _draw() {
    const ctx = this._ctx;
    const s = SIZE;
    ctx.clearRect(0, 0, s, s);

    // Background
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, s, s);

    const state = this._state;

    // Face colors per state
    const skinColor  = state === 'dead'     ? '#334433' :
                       state === 'critical' ? '#553333' :
                       state === 'pain'     ? '#445544' : '#3a5a3a';
    const eyeColor   = state === 'rage'     ? '#ff2200' :
                       state === 'boss'     ? '#ffaa00' :
                       state === 'pickup'   ? '#00ff41' :
                       state === 'dead'     ? '#334433' : '#00cc33';
    const mouthState = state;

    // Head shape
    ctx.fillStyle = skinColor;
    ctx.fillRect(s*0.2, s*0.12, s*0.6, s*0.65);
    // Ears
    ctx.fillRect(s*0.1, s*0.25, s*0.12, s*0.2);
    ctx.fillRect(s*0.78, s*0.25, s*0.12, s*0.2);

    // Hair — dark, short
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(s*0.2, s*0.12, s*0.6, s*0.1);
    ctx.fillRect(s*0.2, s*0.1, s*0.06, s*0.06); // sideburn L
    ctx.fillRect(s*0.74, s*0.1, s*0.06, s*0.06); // sideburn R

    // Eyes
    if (!this._blinking) {
      ctx.fillStyle = eyeColor;
      const eyeH = state === 'pain' || state === 'critical' ? s*0.05 : s*0.08;
      ctx.fillRect(s*0.28, s*0.3, s*0.14, eyeH);
      ctx.fillRect(s*0.58, s*0.3, s*0.14, eyeH);

      // Pupils
      ctx.fillStyle = '#000';
      ctx.fillRect(s*0.33, s*0.32, s*0.05, s*0.05);
      ctx.fillRect(s*0.63, s*0.32, s*0.05, s*0.05);

      // Angry brows
      if (state === 'rage' || state === 'boss') {
        ctx.fillStyle = '#1a1a1a';
        // Angled inward
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(s*0.28+i*3, s*(0.24-i*0.01), s*0.05, s*0.03);
          ctx.fillRect(s*0.68-i*3, s*(0.24-i*0.01), s*0.05, s*0.03);
        }
      } else if (state === 'pain' || state === 'critical') {
        // Furrowed
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(s*0.28, s*0.24, s*0.14, s*0.03);
        ctx.fillRect(s*0.58, s*0.24, s*0.14, s*0.03);
      } else {
        // Normal brows
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(s*0.28, s*0.25, s*0.14, s*0.03);
        ctx.fillRect(s*0.58, s*0.25, s*0.14, s*0.03);
      }
    } else {
      // Blinking — closed eyes
      ctx.fillStyle = skinColor;
      ctx.fillRect(s*0.28, s*0.3, s*0.14, s*0.06);
      ctx.fillRect(s*0.58, s*0.3, s*0.14, s*0.06);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(s*0.28, s*0.34, s*0.14, s*0.02);
      ctx.fillRect(s*0.58, s*0.34, s*0.14, s*0.02);
    }

    // Nose
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(s*0.46, s*0.4, s*0.08, s*0.1);
    ctx.fillRect(s*0.4, s*0.48, s*0.06, s*0.04);
    ctx.fillRect(s*0.54, s*0.48, s*0.06, s*0.04);

    // Mouth
    ctx.fillStyle = '#1a2a1a';
    if (mouthState === 'normal' || mouthState === 'boss') {
      // Neutral / determined
      ctx.fillRect(s*0.34, s*0.58, s*0.32, s*0.04);
    } else if (mouthState === 'hurt' || mouthState === 'pain') {
      // Grimace
      ctx.fillRect(s*0.34, s*0.6, s*0.32, s*0.03);
      ctx.fillRect(s*0.34, s*0.57, s*0.04, s*0.06);
      ctx.fillRect(s*0.62, s*0.57, s*0.04, s*0.06);
    } else if (mouthState === 'rage') {
      // Open yell
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(s*0.34, s*0.56, s*0.32, s*0.1);
      ctx.fillStyle = '#553333';
      ctx.fillRect(s*0.38, s*0.6, s*0.24, s*0.04);
    } else if (mouthState === 'critical' || mouthState === 'dead') {
      // Slack jaw
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(s*0.38, s*0.57, s*0.24, s*0.1);
    } else if (mouthState === 'pickup') {
      // Grin
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(s*0.34, s*0.59, s*0.32, s*0.03);
      // Upturned corners
      ctx.fillRect(s*0.34, s*0.56, s*0.04, s*0.06);
      ctx.fillRect(s*0.62, s*0.56, s*0.04, s*0.06);
    }

    // Headset/headphones
    ctx.fillStyle = '#111a11';
    ctx.fillRect(s*0.08, s*0.2, s*0.08, s*0.25);
    ctx.fillRect(s*0.84, s*0.2, s*0.08, s*0.25);
    ctx.fillRect(s*0.1, s*0.15, s*0.8, s*0.07);

    // Mic boom
    ctx.fillStyle = '#0d150d';
    ctx.fillRect(s*0.08, s*0.4, s*0.18, s*0.03);
    ctx.fillRect(s*0.08, s*0.43, s*0.06, s*0.06);

    // Shoulders / collar
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(s*0.1, s*0.78, s*0.8, s*0.22);
    // Collar detail
    ctx.fillStyle = '#223322';
    ctx.fillRect(s*0.38, s*0.77, s*0.24, s*0.12);

    // Critical/dead overlay tint
    if (state === 'critical') {
      ctx.fillStyle = 'rgba(255,0,0,0.12)';
      ctx.fillRect(0, 0, s, s);
    } else if (state === 'dead') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, s, s);
      // X eyes
      ctx.strokeStyle = '#ff2200';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s*0.28,s*0.28); ctx.lineTo(s*0.42,s*0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.42,s*0.28); ctx.lineTo(s*0.28,s*0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.58,s*0.28); ctx.lineTo(s*0.72,s*0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.72,s*0.28); ctx.lineTo(s*0.58,s*0.38); ctx.stroke();
    } else if (state === 'boss') {
      // Tense glow
      ctx.fillStyle = 'rgba(255,170,0,0.06)';
      ctx.fillRect(0, 0, s, s);
    } else if (state === 'pickup') {
      ctx.fillStyle = 'rgba(0,255,65,0.08)';
      ctx.fillRect(0, 0, s, s);
    }

    // Border glow based on state
    const borderColor = state === 'dead'     ? '#ff2200' :
                        state === 'critical' ? '#ff4400' :
                        state === 'pain'     ? '#885500' :
                        state === 'boss'     ? '#ffaa00' :
                        state === 'pickup'   ? '#00ff41' : '#1a2a1a';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, s, s);
  }
}
