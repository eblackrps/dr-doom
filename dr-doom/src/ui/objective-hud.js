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

    this._focus = document.createElement('div');
    this._focus.style.cssText = `
      margin-bottom: 8px;
      padding: 8px 9px;
      border: 1px solid #223322;
      background: rgba(0, 0, 0, 0.45);
    `;
    el.appendChild(this._focus);

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

  update(objectives, primaryObjective = null) {
    // Build state key to avoid unnecessary DOM updates
    const focusKey = primaryObjective
      ? `${primaryObjective.id}:${primaryObjective.status}:${primaryObjective.runtimeDetail ?? primaryObjective.detail ?? ''}`
      : 'none';
    const stateKey = objectives.map(o => o.status + o.id).join('') + focusKey;
    if (stateKey === this._lastState) return;
    this._lastState = stateKey;

    this._list.innerHTML = '';
    this._focus.innerHTML = primaryObjective ? `
      <div style="font-size:8px;letter-spacing:2px;color:#557755;margin-bottom:4px;">ACTIVE DIRECTIVE</div>
      <div style="font-size:10px;letter-spacing:2px;color:#ffaa00;text-shadow:0 0 8px #ffaa0055;">
        ${primaryObjective.label}
      </div>
      <div style="margin-top:6px;font-size:8px;line-height:1.7;letter-spacing:1px;color:#88aa88;">
        ${primaryObjective.runtimeDetail || primaryObjective.detail || 'Runbook synchronized.'}
      </div>
    ` : `
      <div style="font-size:8px;letter-spacing:2px;color:#557755;">ACTIVE DIRECTIVE</div>
      <div style="margin-top:6px;font-size:9px;letter-spacing:2px;color:#00ff41;">RUNBOOK COMPLETE</div>
    `;

    objectives.forEach(obj => {
      const isActive = primaryObjective?.id === obj.id;
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 5px;
        font-size: 9px;
        letter-spacing: 1px;
        line-height: 1.4;
        opacity: ${obj.status === OBJ_STATUS.LOCKED ? '0.3' : '1'};
        padding: ${isActive ? '3px 5px' : '0'};
        border: ${isActive ? '1px solid #ffaa0033' : '1px solid transparent'};
        background: ${isActive ? 'rgba(255, 170, 0, 0.06)' : 'transparent'};
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
