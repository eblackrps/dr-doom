import { saves } from '../save/save-system.js';

export class TitleScreen {
  constructor() {
    this._el = null;
    this._animFrame = null;
    this._elapsed = 0;
    this._canvas = null;
    this._ctx = null;
    this._resolve = null;
    this._ready = false;
  }

  show() {
    return new Promise(resolve => {
      this._resolve = resolve;
      this._build();
      this._startAnimation();
    });
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'title-screen';
    el.style.cssText = `
      position: fixed; inset: 0; background: #000;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 1000; overflow: hidden; cursor: pointer;
      font-family: 'Courier New', monospace;
    `;

    // Background canvas for animated effects
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: absolute; inset: 0;
      width: 100%; height: 100%;
    `;
    el.appendChild(canvas);
    this._canvas = canvas;

    // Content layer
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative; z-index: 2;
      display: flex; flex-direction: column;
      align-items: center; gap: 0;
      text-align: center;
    `;

    // Version tag
    const ver = document.createElement('div');
    ver.style.cssText = `
      font-size: 9px; letter-spacing: 5px; color: #ff220088;
      margin-bottom: 12px;
    `;
    ver.textContent = 'CLASSIFIED // DR SYSTEMS INC. // BUILD 1.0.0';
    content.appendChild(ver);

    // Main ASCII logo
    const logo = document.createElement('pre');
    logo.id = 'title-logo';
    logo.style.cssText = `
      font-size: clamp(6px, 1.1vw, 11px);
      line-height: 1.1;
      color: #ff2200;
      text-shadow: 0 0 20px #ff2200, 0 0 40px #ff220044;
      margin: 0;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
      opacity: 0;
      transition: opacity 0.6s;
    `;
    logo.textContent = [
      '██████╗ ██████╗     ██████╗  ██████╗  ██████╗ ███╗   ███╗',
      '██╔══██╗██╔══██╗    ██╔══██╗██╔═══██╗██╔═══██╗████╗ ████║',
      '██║  ██║██████╔╝    ██║  ██║██║   ██║██║   ██║██╔████╔██║',
      '██║  ██║██╔══██╗    ██║  ██║██║   ██║██║   ██║██║╚██╔╝██║',
      '██████╔╝██║  ██║    ██████╔╝╚██████╔╝╚██████╔╝██║ ╚═╝ ██║',
      '╚═════╝ ╚═╝  ╚═╝    ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝     ╚═╝',
    ].join('\n');
    content.appendChild(logo);

    // Subtitle
    const sub = document.createElement('div');
    sub.style.cssText = `
      font-size: clamp(9px, 1.2vw, 13px);
      letter-spacing: 6px; color: #888;
      margin-top: 16px; margin-bottom: 4px;
      opacity: 0; transition: opacity 0.6s 0.4s;
    `;
    sub.id = 'title-sub';
    sub.textContent = 'DISASTER RECOVERY: THE GAME';
    content.appendChild(sub);

    // Tagline
    const tag = document.createElement('div');
    tag.style.cssText = `
      font-size: clamp(8px, 0.9vw, 10px);
      letter-spacing: 3px; color: #ff220066;
      margin-bottom: 40px;
      opacity: 0; transition: opacity 0.6s 0.6s;
    `;
    tag.id = 'title-tag';
    tag.textContent = 'RTO IS TICKING, ENGINEER.';
    content.appendChild(tag);

    // Stats strip
    const stats = document.createElement('div');
    stats.style.cssText = `
      display: flex; gap: 40px; margin-bottom: 40px;
      opacity: 0; transition: opacity 0.6s 0.8s;
    `;
    stats.id = 'title-stats';
    [
      ['7', 'WEAPONS'],
      ['7', 'ENEMIES'],
      ['3', 'BOSS FIGHTS'],
      ['1', 'DR RUNBOOK'],
    ].forEach(([num, label]) => {
      const stat = document.createElement('div');
      stat.style.cssText = 'text-align: center;';
      stat.innerHTML = `
        <div style="font-size:clamp(18px,2.5vw,28px);color:#ff2200;text-shadow:0 0 10px #ff220066;font-weight:bold;">${num}</div>
        <div style="font-size:8px;letter-spacing:2px;color:#444;">${label}</div>
      `;
      stats.appendChild(stat);
    });
    content.appendChild(stats);

    // Difficulty selector
    const diffWrap = document.createElement('div');
    diffWrap.style.cssText = `
      display:flex; gap:8px; margin-bottom:28px; align-items:center;
      opacity:0; transition:opacity 0.6s 0.9s;
    `;
    diffWrap.id = 'title-diff';

    const diffLabel = document.createElement('div');
    diffLabel.style.cssText = 'font-size:8px;letter-spacing:2px;color:#334433;';
    diffLabel.textContent = 'DIFFICULTY:';
    diffWrap.appendChild(diffLabel);

    const difficulties = [
      { id:'intern',    label:'INTERN',     color:'#00ff41' },
      { id:'sysadmin',  label:'SYSADMIN',   color:'#ffaa00' },
      { id:'architect', label:'ARCHITECT',  color:'#ff8800' },
      { id:'nightmare', label:'NIGHTMARE',  color:'#ff2200' },
    ];

    {
      let selected = saves.getDifficulty();
      const btns = [];
      difficulties.forEach(d => {
        const btn = document.createElement('div');
        const isSelected = () => selected === d.id;
        const update = () => {
          btn.style.color       = isSelected() ? d.color : '#334433';
          btn.style.borderColor = isSelected() ? d.color + '44' : '#1a2a1a';
          btn.style.background  = isSelected() ? d.color + '11' : 'transparent';
        };
        btn.style.cssText = `
          font-size:8px; letter-spacing:1px; padding:3px 8px;
          border:1px solid #1a2a1a; cursor:pointer; transition:all 0.1s;
        `;
        btn.textContent = d.label;
        btn.addEventListener('click', () => {
          selected = d.id;
          saves.setDifficulty(d.id);
          btns.forEach(b => b());
        });
        btn.addEventListener('mouseenter', () => {
          if (!isSelected()) { btn.style.color = d.color; btn.style.borderColor = d.color + '33'; }
        });
        btn.addEventListener('mouseleave', update);
        diffWrap.appendChild(btn);
        btns.push(update);
        update();
      });
    }
    content.appendChild(diffWrap);
    setTimeout(() => { const d = document.getElementById('title-diff'); if(d) d.style.opacity='1'; }, 900);


    // Menu items
    const menu = document.createElement('div');
    menu.style.cssText = `
      display: flex; flex-direction: column; gap: 8px; align-items: center;
      opacity: 0; transition: opacity 0.6s 1.0s;
    `;
    menu.id = 'title-menu';

    const menuItems = [
      { id: 'menu-start',    label: '▸ DEPLOY ENGINEER',      key: 'ENTER',   primary: true  },
      { id: 'menu-settings', label: '  CONFIGURE SYSTEMS',    key: 'S',       primary: false },
      { id: 'menu-credits',  label: '  ABOUT',                key: 'A',       primary: false },
    ];

    menuItems.forEach(item => {
      const el = document.createElement('div');
      el.id = item.id;
      el.style.cssText = `
        font-size: clamp(10px, 1.1vw, 12px);
        letter-spacing: 3px;
        color: ${item.primary ? '#00ff41' : '#445544'};
        text-shadow: ${item.primary ? '0 0 10px #00ff4166' : 'none'};
        padding: 4px 16px;
        cursor: pointer;
        transition: color 0.15s, text-shadow 0.15s;
        border: 1px solid ${item.primary ? '#00ff4122' : 'transparent'};
      `;
      el.textContent = `${item.label}  [${item.key}]`;
      el.addEventListener('mouseenter', () => {
        el.style.color = '#00ff41';
        el.style.textShadow = '0 0 10px #00ff4166';
        el.style.borderColor = '#00ff4122';
      });
      el.addEventListener('mouseleave', () => {
        el.style.color = item.primary ? '#00ff41' : '#445544';
        el.style.textShadow = item.primary ? '0 0 10px #00ff4166' : 'none';
        el.style.borderColor = item.primary ? '#00ff4122' : 'transparent';
      });
      menu.appendChild(el);
    });
    content.appendChild(menu);

    // Blog callout
    const blog = document.createElement('div');
    blog.style.cssText = `
      margin-top: 32px; font-size: 9px; letter-spacing: 2px;
      color: #223322;
      opacity: 0; transition: opacity 0.6s 1.2s;
    `;
    blog.id = 'title-blog';
    blog.innerHTML = 'FIELD MANUAL &amp; DR ARCHITECTURE: <span style="color:#334433">ANYSTACKARCHITECT.COM</span>';
    content.appendChild(blog);

    el.appendChild(content);
    document.body.appendChild(el);
    this._el = el;

    // Trigger fade-ins after brief delay
    setTimeout(() => {
      document.getElementById('title-logo').style.opacity = '1';
      document.getElementById('title-sub').style.opacity = '1';
      document.getElementById('title-tag').style.opacity = '1';
      document.getElementById('title-stats').style.opacity = '1';
      document.getElementById('title-menu').style.opacity = '1';
      document.getElementById('title-blog').style.opacity = '1';
      this._ready = true;
    }, 200);

    // Input handlers
    document.getElementById('menu-start').addEventListener('click', () => this._startGame());

    document.getElementById('menu-settings').addEventListener('click', () => {
      // Settings will be handled by pause menu reuse — show placeholder
      this._showSettingsFromTitle();
    });

    document.getElementById('menu-credits').addEventListener('click', () => {
      this._showCredits();
    });

    this._boundOnKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._boundOnKey);
  }

  _onKey(e) {
    if (!this._ready) return;
    if (e.code === 'Enter' || e.code === 'Space') this._startGame();
    if (e.code === 'KeyS') this._showSettingsFromTitle();
    if (e.code === 'KeyA') this._showCredits();
  }

  _startGame() {
    if (!this._ready) return;
    this._ready = false;
    window.removeEventListener('keydown', this._boundOnKey);
    window.removeEventListener('resize', this._boundResize);
    cancelAnimationFrame(this._animFrame);

    this._el.style.transition = 'opacity 0.5s';
    this._el.style.opacity = '0';
    setTimeout(() => {
      this._el?.remove();
      this._resolve?.();
    }, 500);
  }

  _showSettingsFromTitle() {
    // Inline audio settings panel — reads/writes localStorage directly,
    // same keys the in-game PauseMenu and audio engine use.
    if (document.getElementById('title-settings-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'title-settings-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.92);
      display:flex;align-items:center;justify-content:center;
      z-index:1100;font-family:'Courier New',monospace;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width:400px;border:1px solid #00ff4133;background:#030a05;
      box-shadow:0 0 40px #00ff4111;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background:#00ff41;color:#000;padding:7px 16px;
      font-size:11px;font-weight:bold;letter-spacing:3px;
      display:flex;justify-content:space-between;align-items:center;
    `;
    header.innerHTML = `<span>AUDIO CONFIGURATION</span>`;
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'cursor:pointer;font-size:14px;';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'padding:20px;';

    const sliders = [
      { label: 'MASTER VOLUME',  key: 'master',  default: 80  },
      { label: 'SFX VOLUME',     key: 'sfx',     default: 100 },
      { label: 'MUSIC VOLUME',   key: 'music',   default: 70  },
      { label: 'AMBIENT VOLUME', key: 'ambient', default: 60  },
    ];
    const stored = JSON.parse(localStorage.getItem('dr-doom-audio') ?? '{}');

    sliders.forEach(s => {
      const val = stored[s.key] ?? s.default;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #0a1a0a;';
      const lbl = document.createElement('div');
      lbl.style.cssText = 'color:#557755;font-size:10px;letter-spacing:1px;width:130px;flex-shrink:0;';
      lbl.textContent = s.label;
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = val;
      slider.style.cssText = 'flex:1;accent-color:#00ff41;cursor:pointer;';
      const display = document.createElement('div');
      display.style.cssText = 'color:#00ff41;font-size:10px;width:30px;text-align:right;';
      display.textContent = val;
      slider.addEventListener('input', () => {
        display.textContent = slider.value;
        const data = JSON.parse(localStorage.getItem('dr-doom-audio') ?? '{}');
        data[s.key] = parseInt(slider.value);
        localStorage.setItem('dr-doom-audio', JSON.stringify(data));
      });
      row.appendChild(lbl); row.appendChild(slider); row.appendChild(display);
      body.appendChild(row);
    });

    const note = document.createElement('div');
    note.style.cssText = 'margin-top:16px;font-size:9px;color:#334433;letter-spacing:1px;line-height:1.8;';
    note.textContent = 'SETTINGS SAVED AUTOMATICALLY AND APPLIED ON GAME START.';
    body.appendChild(note);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  _showCredits() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.92);
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; z-index: 2000;
      font-family: 'Courier New', monospace; color: #00ff41;
      cursor: pointer;
    `;
    overlay.innerHTML = `
      <div style="max-width:500px; text-align:center; padding: 40px;">
        <div style="font-size:11px;letter-spacing:4px;color:#ff2200;margin-bottom:20px;">CREDITS</div>
        <div style="font-size:10px;color:#557755;line-height:2.2;letter-spacing:1px;">
          CONCEPT, DESIGN &amp; DR CONTENT<br>
          <span style="color:#00ff41;">ERIC // ANYSTACKARCHITECT.COM</span><br><br>
          ENGINE BUILT WITH<br>
          <span style="color:#00ff41;">THREE.JS + VITE</span><br><br>
          SPECIAL THANKS<br>
          <span style="color:#00ff41;font-size:13px;letter-spacing:2px;">JOO CHUNG &amp; THE DR GANG</span><br>
          <span style="color:#334433;font-size:9px;">FOR KEEPING THE LIGHTS ON AND THE BACKUPS RUNNING</span><br><br>
          DEDICATED TO EVERY ENGINEER<br>
          WHO HAS EVER BEEN PAGED AT 3AM<br><br>
        </div>
        <div style="font-size:9px;color:#333;margin-top:20px;letter-spacing:2px;">[CLICK TO CLOSE]</div>
      </div>
    `;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  _startAnimation() {
    const canvas = this._canvas;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    this._boundResize = resize;
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speed: 0.2 + Math.random() * 0.8,
      char: '01ABCDEF'.split('')[Math.floor(Math.random() * 8)],
      opacity: Math.random(),
      color: Math.random() > 0.7 ? '#ff2200' : '#001a00',
    }));

    const glitchLines = [];

    let _lastTs = 0;
    const tick = (ts) => {
      this._animFrame = requestAnimationFrame(tick);
      const dt = _lastTs ? (ts - _lastTs) / 1000 : 0.016;
      _lastTs = ts;
      this._elapsed = ts * 0.001;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Matrix rain effect — falling code characters
      ctx.font = '12px Courier New';
      particles.forEach(p => {
        p.y += p.speed;
        if (p.y > canvas.height) { p.y = -12; p.x = Math.random() * canvas.width; }
        ctx.globalAlpha = p.opacity * 0.4;
        ctx.fillStyle = p.color;
        ctx.fillText(p.char, p.x, p.y);
        // Occasionally change character
        if (Math.random() > 0.98) {
          p.char = '01ABCDEF█▓░▒'.split('')[Math.floor(Math.random() * 12)];
        }
      });

      // Horizontal scanlines
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#000';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 2);
      }

      // Glitch horizontal tear lines
      if (Math.random() > 0.97) {
        glitchLines.push({
          y: Math.random() * canvas.height,
          life: 0.08 + Math.random() * 0.12,
          h: 1 + Math.floor(Math.random() * 4),
        });
      }
      glitchLines.forEach((g, i) => {
        g.life -= dt;
        ctx.globalAlpha = g.life * 8;
        ctx.fillStyle = Math.random() > 0.5 ? '#ff2200' : '#00ff41';
        ctx.fillRect(Math.random() * 50, g.y, canvas.width * (0.3 + Math.random() * 0.7), g.h);
      });
      for (let i = glitchLines.length - 1; i >= 0; i--) {
        if (glitchLines[i].life <= 0) glitchLines.splice(i, 1);
      }

      // Vignette
      ctx.globalAlpha = 1;
      const vignette = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, canvas.height * 0.2,
        canvas.width/2, canvas.height/2, canvas.height * 0.9
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Slow red pulse on logo glow
      const pulse = 0.5 + Math.sin(this._elapsed * 0.8) * 0.5;
      const logo = document.getElementById('title-logo');
      if (logo) {
        logo.style.textShadow = `0 0 ${20 + pulse * 20}px #ff2200, 0 0 ${40 + pulse * 40}px #ff220044`;
      }
    };

    this._animFrame = requestAnimationFrame(tick);
  }
}
