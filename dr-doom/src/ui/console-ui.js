import { CONSOLE_DATA } from '../world/consoles.js';

export class ConsoleUI {
  constructor() {
    this._el = null;
    this._visible = false;
    this._currentId = null;
    this._onClose = null;

    this._build();
    this._bindKeys();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'console-ui';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.82);
      z-index: 200;
      font-family: 'Courier New', monospace;
    `;

    el.innerHTML = `
      <div id="console-panel" style="
        width: 580px;
        max-height: 88vh;
        border: 1px solid #00ff41;
        box-shadow: 0 0 30px #00ff4133, inset 0 0 60px #00000088;
        background: #050a07;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Header bar -->
        <div id="console-header" style="
          background: #00ff41;
          color: #000;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 2px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span id="console-title">TERMINAL</span>
          <span style="opacity:0.6;">[E] CLOSE</span>
        </div>

        <!-- Subtitle bar -->
        <div id="console-subtitle" style="
          background: #0a1a0e;
          color: #00aa2a;
          padding: 4px 14px;
          font-size: 9px;
          letter-spacing: 3px;
          border-bottom: 1px solid #00ff4122;
        ">NODE</div>

        <!-- Status lines -->
        <div id="console-status" style="
          padding: 12px 14px;
          border-bottom: 1px solid #00ff4122;
          display: flex;
          flex-direction: column;
          gap: 4px;
        "></div>

        <!-- Tip section -->
        <div style="padding: 14px; flex: 1; overflow-y: auto;">
          <div id="console-tip-heading" style="
            color: #ffaa00;
            font-size: 10px;
            letter-spacing: 2px;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #ffaa0033;
          "></div>
          <div id="console-tip-body" style="
            color: #88bb88;
            font-size: 11px;
            line-height: 1.7;
            white-space: pre-wrap;
          "></div>
        </div>

        <!-- Footer -->
        <div style="
          background: #0a1a0e;
          color: #1a3a1a;
          padding: 5px 14px;
          font-size: 9px;
          letter-spacing: 2px;
          border-top: 1px solid #00ff4122;
          display: flex;
          justify-content: space-between;
        ">
          <span>ERIC BLACK // FIELD MANUAL v3.1</span>
          <span id="console-clock"></span>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this._el = el;

    // Clock tick
    setInterval(() => {
      const cl = document.getElementById('console-clock');
      if (cl) cl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this._visible) return;
      if (e.code === 'KeyE' || e.code === 'Escape') {
        this.close();
      }
    });
  }

  setOnOpen(fn) { this._onOpen = fn; }

  open(consoleId, onClose) {
    const data = CONSOLE_DATA[consoleId];
    if (!data) return;

    this._currentId = consoleId;
    this._visible = true;
    this._onClose = onClose || null;

    // Populate
    document.getElementById('console-title').textContent = data.title;
    document.getElementById('console-subtitle').textContent = data.subtitle;

    // Status lines
    const statusEl = document.getElementById('console-status');
    statusEl.innerHTML = '';
    (data.lines || []).forEach(({ label, value, status }) => {
      const color = status === 'ok' ? '#00ff41' : status === 'warn' ? '#ffaa00' : '#ff2200';
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        letter-spacing: 1px;
        padding: 2px 0;
        border-bottom: 1px solid #0a1a0e;
      `;
      row.innerHTML = `
        <span style="color:#336633;">${label}</span>
        <span style="color:${color};">${value}</span>
      `;
      statusEl.appendChild(row);
    });

    // Tip
    document.getElementById('console-tip-heading').textContent = data.tip.heading;
    document.getElementById('console-tip-body').textContent = data.tip.body.join('\n');

    this._el.style.display = 'flex';
    if (this._onOpen) this._onOpen(consoleId);

    // Animate in
    const panel = document.getElementById('console-panel');
    panel.style.transform = 'scale(0.95)';
    panel.style.opacity = '0';
    panel.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
    requestAnimationFrame(() => {
      panel.style.transform = 'scale(1)';
      panel.style.opacity = '1';
    });
  }

  close() {
    if (!this._visible) return;
    this._visible = false;
    this._el.style.display = 'none';
    if (this._onClose) this._onClose();
  }

  isOpen() {
    return this._visible;
  }
}
