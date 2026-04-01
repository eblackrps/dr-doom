export class BossHUD {
  constructor() {
    this._el      = null;
    this._bar     = null;
    this._visible = false;
    this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'boss-hud';
    el.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 380px;
      font-family: 'Courier New', monospace;
      pointer-events: none;
      display: none;
      z-index: 35;
      text-align: center;
    `;

    el.innerHTML = `
      <div id="boss-name" style="
        font-size: 11px;
        letter-spacing: 4px;
        color: #ff2200;
        text-shadow: 0 0 10px #ff220066;
        margin-bottom: 5px;
      ">BOSS</div>
      <div style="
        height: 10px;
        background: #111;
        border: 1px solid #ff220044;
        position: relative;
        overflow: hidden;
      ">
        <div id="boss-health-bar" style="
          height: 100%;
          background: #ff2200;
          width: 100%;
          transition: width 0.15s, background 0.3s;
          box-shadow: 0 0 8px #ff2200;
        "></div>
      </div>
      <div id="boss-phase" style="
        font-size: 9px;
        letter-spacing: 2px;
        color: #ff440066;
        margin-top: 4px;
      ">PHASE 1</div>
      <div id="boss-hint" style="
        margin-top: 6px;
        font-size: 8px;
        letter-spacing: 1px;
        color: #778877;
      "></div>
    `;

    document.body.appendChild(el);
    this._el    = el;
    this._bar   = document.getElementById('boss-health-bar');
    this._name  = document.getElementById('boss-name');
    this._phase = document.getElementById('boss-phase');
    this._hint  = document.getElementById('boss-hint');
  }

  show(name) {
    this._name.textContent = name;
    this._el.style.display = 'block';
    this._visible = true;
  }

  hide() {
    this._el.style.display = 'none';
    this._visible = false;
  }

  update(boss) {
    if (!this._visible || !boss) return;
    const pct = Math.max(0, (boss.health / boss.maxHealth) * 100);
    this._bar.style.width = pct + '%';

    // Color shifts by phase
    const colors = ['#ff2200', '#ff8800', '#ffff00', '#ff00ff'];
    const color = colors[Math.min(boss.phase - 1, colors.length - 1)];
    this._bar.style.background = color;
    this._bar.style.boxShadow = `0 0 8px ${color}`;

    // Phase dots
    const dots = Array.from({ length: boss.maxPhases }, (_, i) =>
      `<span style="color:${i < boss.phase ? color : '#333'}">●</span>`
    ).join(' ');
    this._phase.innerHTML = `PHASE ${boss.phase} &nbsp; ${dots}`;

    // Vulnerable window flash
    if (boss.isVulnerable?.()) {
      this._name.style.animation = 'blink 0.3s step-end infinite';
      this._name.style.color = '#00ff41';
    } else {
      this._name.style.animation = '';
      this._name.style.color = '#ff2200';
    }

    const hint =
      boss.type === 'ransomware_king'
        ? (boss.isVulnerable?.() ? 'Core exposed. Dump damage before the shield returns.' : 'Shoot all three decryption nodes to open the damage window.')
        : boss.type === 'cascade_titan_full'
          ? (boss._isCharging ? 'Charge lane live. Break laterally before impact.' : boss.phase >= 3 ? 'Watch the floor lanes. Electrified strips will punish static play.' : 'Bait the charge and punish the recovery.')
          : boss.type === 'the_audit'
            ? 'Follow the highlighted task beacon and clear each console before the RTO expires.'
            : '';
    this._hint.textContent = hint;
  }
}
