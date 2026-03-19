import { OBJ_STATUS } from '../world/objectives.js';

export class ObjectiveHUD {
  constructor() {
    this._el = this._build();
    this._lastState = '';
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'objective-hud';
    el.style.cssText = `
      position: fixed;
      top: 40px;
      right: 20px;
      width: 220px;
      font-family: 'Courier New', monospace;
      pointer-events: none;
      z-index: 30;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: 9px;
      letter-spacing: 3px;
      color: #ffaa00;
      border-bottom: 1px solid #ffaa0033;
      padding-bottom: 4px;
      margin-bottom: 6px;
    `;
    header.textContent = 'DR RUNBOOK // OBJECTIVES';
    el.appendChild(header);

    this._list = document.createElement('div');
    this._list.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    el.appendChild(this._list);

    // Progress bar
    const barWrap = document.createElement('div');
    barWrap.style.cssText = `
      margin-top: 8px;
      height: 3px;
      background: #111;
      border: 1px solid #222;
    `;
    this._progressBar = document.createElement('div');
    this._progressBar.style.cssText = `
      height: 100%;
      background: #ffaa00;
      width: 0%;
      transition: width 0.4s;
    `;
    barWrap.appendChild(this._progressBar);
    el.appendChild(barWrap);

    document.body.appendChild(el);
    return el;
  }

  update(objectives) {
    // Build state key to avoid unnecessary DOM updates
    const stateKey = objectives.map(o => o.status + o.id).join('');
    if (stateKey === this._lastState) return;
    this._lastState = stateKey;

    this._list.innerHTML = '';

    objectives.forEach(obj => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 5px;
        font-size: 9px;
        letter-spacing: 1px;
        line-height: 1.4;
        opacity: ${obj.status === OBJ_STATUS.LOCKED ? '0.3' : '1'};
      `;

      const icon = document.createElement('span');
      icon.style.cssText = 'flex-shrink: 0; margin-top: 1px;';
      icon.textContent =
        obj.status === OBJ_STATUS.COMPLETE  ? '✓' :
        obj.status === OBJ_STATUS.LOCKED    ? '○' :
        obj.status === OBJ_STATUS.ACTIVE    ? '▸' : '✗';

      const color =
        obj.status === OBJ_STATUS.COMPLETE  ? '#00ff41' :
        obj.status === OBJ_STATUS.LOCKED    ? '#444' :
        obj.status === OBJ_STATUS.ACTIVE    ? '#ffaa00' : '#ff2200';

      icon.style.color = color;

      const label = document.createElement('span');
      label.style.color = color;
      label.textContent = obj.label;

      row.appendChild(icon);
      row.appendChild(label);
      this._list.appendChild(row);
    });

    // Progress bar
    const done = objectives.filter(o => o.status === OBJ_STATUS.COMPLETE).length;
    const pct = (done / objectives.length) * 100;
    this._progressBar.style.width = pct + '%';

    // Change bar color at completion
    if (pct >= 100) {
      this._progressBar.style.background = '#00ff41';
    }
  }
}
