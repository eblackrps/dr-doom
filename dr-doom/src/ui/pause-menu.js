import { DEFAULT_KEYMAP } from '../engine/input.js';

export class PauseMenu {
  constructor(input, audioSystem) {
    this._input  = input;
    this._audio  = audioSystem; // may be null until Phase 7
    this._el     = null;
    this._visible = false;
    this._tab    = 'main'; // main | controls | audio
    this._remapping = null; // { action, index } or null
    this._onResume  = null;
    this._onQuit    = null;

    this._build();
    this._bindEsc();
  }

  onResume(fn) { this._onResume = fn; }
  onQuit(fn)   { this._onQuit   = fn; }

  _build() {
    const el = document.createElement('div');
    el.id = 'pause-menu';
    el.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.88);
      display: none; align-items: center; justify-content: center;
      z-index: 300; font-family: 'Courier New', monospace;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _bindEsc() {
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;

      // If remapping, cancel
      if (this._remapping) {
        this._remapping = null;
        this._renderContent();
        return;
      }

      if (this._visible) {
        this.hide();
      } else {
        this.show();
      }
    });
  }

  show(tab = 'main') {
    this._visible = true;
    this._tab = tab;
    this._el.style.display = 'flex';
    document.exitPointerLock?.();
    this._renderContent();
  }

  hide() {
    this._visible = false;
    this._el.style.display = 'none';
    this._onResume?.();
  }

  openSettings() { this.show('controls'); }

  isVisible() { return this._visible; }

  _renderContent() {
    this._el.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 520px; max-height: 88vh; overflow-y: auto;
      border: 1px solid #00ff4133;
      box-shadow: 0 0 40px #00ff4111;
      background: #030a05;
      display: flex; flex-direction: column;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background: #00ff41; color: #000;
      padding: 7px 16px; font-size: 11px;
      font-weight: bold; letter-spacing: 3px;
      display: flex; justify-content: space-between;
    `;
    header.innerHTML = `
      <span>DR DOOM // PAUSED</span>
      <span style="opacity:0.5">ANYSTACKARCHITECT.COM</span>
    `;
    panel.appendChild(header);

    // Tab bar
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex; border-bottom: 1px solid #00ff4122;
    `;
    ['main', 'controls', 'audio'].forEach(tab => {
      const btn = document.createElement('div');
      btn.style.cssText = `
        flex: 1; padding: 8px; text-align: center;
        font-size: 9px; letter-spacing: 2px; cursor: pointer;
        color: ${this._tab === tab ? '#00ff41' : '#334433'};
        background: ${this._tab === tab ? '#0a1a0a' : 'transparent'};
        border-bottom: ${this._tab === tab ? '2px solid #00ff41' : '2px solid transparent'};
        transition: color 0.1s;
      `;
      btn.textContent = tab.toUpperCase();
      btn.addEventListener('click', () => { this._tab = tab; this._renderContent(); });
      tabs.appendChild(btn);
    });
    panel.appendChild(tabs);

    // Content
    const content = document.createElement('div');
    content.style.cssText = 'padding: 20px; flex: 1;';

    if (this._tab === 'main')     this._renderMainTab(content);
    if (this._tab === 'controls') this._renderControlsTab(content);
    if (this._tab === 'audio')    this._renderAudioTab(content);

    panel.appendChild(content);
    this._el.appendChild(panel);
  }

  _renderMainTab(content) {
    const items = [
      { label: 'RESUME MISSION',    action: () => this.hide(),         color: '#00ff41' },
      { label: 'CONFIGURE SYSTEMS', action: () => { this._tab = 'controls'; this._renderContent(); }, color: '#88aa88' },
      { label: 'AUDIO SETTINGS',    action: () => { this._tab = 'audio';    this._renderContent(); }, color: '#88aa88' },
      { label: 'ABORT MISSION',     action: () => this._quit(),            color: '#ff440066' },
    ];

    items.forEach(item => {
      const btn = document.createElement('div');
      btn.style.cssText = `
        padding: 12px 16px; margin-bottom: 6px;
        font-size: 11px; letter-spacing: 3px;
        color: ${item.color};
        border: 1px solid ${item.color}33;
        cursor: pointer;
        transition: background 0.1s, border-color 0.1s;
      `;
      btn.textContent = `▸ ${item.label}`;
      btn.addEventListener('mouseenter', () => { btn.style.background = `${item.color}11`; btn.style.borderColor = item.color; });
      btn.addEventListener('mouseleave', () => { btn.style.background = ''; btn.style.borderColor = `${item.color}33`; });
      btn.addEventListener('click', item.action);
      content.appendChild(btn);
    });

    // Stats divider
    const divider = document.createElement('div');
    divider.style.cssText = 'border-top: 1px solid #0a1a0a; margin: 20px 0 16px;';
    content.appendChild(divider);

    // Key reference
    const keyRef = document.createElement('div');
    keyRef.style.cssText = 'font-size: 9px; color: #223322; line-height: 2.2; letter-spacing: 1px;';
    keyRef.innerHTML = `
      <span style="color:#334433">WASD</span> MOVE &nbsp;&nbsp;
      <span style="color:#334433">MOUSE</span> LOOK &nbsp;&nbsp;
      <span style="color:#334433">1-7</span> WEAPONS &nbsp;&nbsp;
      <span style="color:#334433">E</span> INTERACT &nbsp;&nbsp;
      <span style="color:#334433">ESC</span> PAUSE
    `;
    content.appendChild(keyRef);
  }

  _renderControlsTab(content) {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:9px;letter-spacing:2px;color:#557755;margin-bottom:16px;';
    title.textContent = 'CLICK A BINDING TO REMAP — THEN PRESS ANY KEY';
    content.appendChild(title);

    const actions = [
      { key: 'moveForward',  label: 'MOVE FORWARD'  },
      { key: 'moveBackward', label: 'MOVE BACKWARD' },
      { key: 'moveLeft',     label: 'STRAFE LEFT'   },
      { key: 'moveRight',    label: 'STRAFE RIGHT'  },
      { key: 'jump',         label: 'JUMP'          },
      { key: 'interact',     label: 'INTERACT'      },
      { key: 'weapon1',      label: 'WEAPON 1'      },
      { key: 'weapon2',      label: 'WEAPON 2'      },
      { key: 'weapon3',      label: 'WEAPON 3'      },
      { key: 'weapon4',      label: 'WEAPON 4'      },
      { key: 'weapon5',      label: 'WEAPON 5'      },
      { key: 'weapon6',      label: 'WEAPON 6'      },
      { key: 'weapon7',      label: 'WEAPON 7'      },
    ];

    actions.forEach(action => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 0; border-bottom: 1px solid #0a1a0a;
        font-size: 10px;
      `;

      const label = document.createElement('div');
      label.style.cssText = 'color: #557755; letter-spacing: 1px;';
      label.textContent = action.label;

      const bindings = this._input.keymap[action.key] ?? DEFAULT_KEYMAP[action.key] ?? [];
      const bindingEl = document.createElement('div');
      bindingEl.style.cssText = 'display: flex; gap: 6px;';

      const isRemapping = this._remapping?.action === action.key;

      bindings.forEach((code, idx) => {
        const btn = document.createElement('div');
        const displayKey = code.replace('Key', '').replace('Digit', '').replace('Arrow', '↑').replace('Left','←').replace('Right','→').replace('Up','↑').replace('Down','↓').replace('Space','SPC').replace('ShiftLeft','LSHFT').replace('ShiftRight','RSHFT');
        btn.style.cssText = `
          border: 1px solid ${isRemapping && this._remapping.index === idx ? '#00ff41' : '#223322'};
          padding: 2px 8px; font-size: 9px; letter-spacing: 1px;
          color: ${isRemapping && this._remapping.index === idx ? '#00ff41' : '#445544'};
          cursor: pointer; background: ${isRemapping && this._remapping.index === idx ? '#0a1a0a' : 'transparent'};
          min-width: 50px; text-align: center;
        `;
        btn.textContent = isRemapping && this._remapping.index === idx ? '...' : displayKey;

        btn.addEventListener('click', () => {
          this._remapping = { action: action.key, index: idx };
          this._renderContent();
          // Listen for next keydown
          const handler = (e) => {
            e.preventDefault();
            window.removeEventListener('keydown', handler, true);
            if (e.code === 'Escape') { this._remapping = null; this._renderContent(); return; }
            const newBindings = [...(this._input.keymap[action.key] ?? [])];
            newBindings[idx] = e.code;
            this._input.remap(action.key, newBindings);
            this._remapping = null;
            this._renderContent();
          };
          window.addEventListener('keydown', handler, true);
        });

        bindingEl.appendChild(btn);
      });

      row.appendChild(label);
      row.appendChild(bindingEl);
      content.appendChild(row);
    });

    // Reset button
    const reset = document.createElement('div');
    reset.style.cssText = `
      margin-top: 16px; padding: 8px 16px; font-size: 9px;
      letter-spacing: 2px; color: #334433; border: 1px solid #223322;
      cursor: pointer; text-align: center;
    `;
    reset.textContent = 'RESET TO DEFAULTS';
    reset.addEventListener('click', () => {
      Object.keys(DEFAULT_KEYMAP).forEach(k => {
        this._input.remap(k, DEFAULT_KEYMAP[k]);
      });
      this._renderContent();
    });
    content.appendChild(reset);
  }

  _renderAudioTab(content) {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:9px;letter-spacing:2px;color:#557755;margin-bottom:20px;';
    title.textContent = 'AUDIO CONFIGURATION — PHASE 7 PENDING';
    content.appendChild(title);

    const settings = [
      { label: 'MASTER VOLUME',    key: 'master',   default: 80 },
      { label: 'SFX VOLUME',       key: 'sfx',      default: 100 },
      { label: 'MUSIC VOLUME',     key: 'music',    default: 70 },
      { label: 'AMBIENT VOLUME',   key: 'ambient',  default: 60 },
    ];

    const stored = JSON.parse(localStorage.getItem('dr-doom-audio') ?? '{}');

    settings.forEach(setting => {
      const val = stored[setting.key] ?? setting.default;

      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; gap: 16px;
        padding: 8px 0; border-bottom: 1px solid #0a1a0a;
      `;

      const label = document.createElement('div');
      label.style.cssText = 'color:#557755;font-size:10px;letter-spacing:1px;width:140px;flex-shrink:0;';
      label.textContent = setting.label;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0'; slider.max = '100'; slider.value = val;
      slider.style.cssText = `
        flex: 1; accent-color: #00ff41; cursor: pointer;
      `;

      const valDisplay = document.createElement('div');
      valDisplay.style.cssText = 'color:#00ff41;font-size:10px;width:30px;text-align:right;';
      valDisplay.textContent = val;

      slider.addEventListener('input', () => {
        valDisplay.textContent = slider.value;
        const s = JSON.parse(localStorage.getItem('dr-doom-audio') ?? '{}');
        s[setting.key] = parseInt(slider.value);
        localStorage.setItem('dr-doom-audio', JSON.stringify(s));
      });

      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(valDisplay);
      content.appendChild(row);
    });

    // Toggle checkboxes
    const toggles = [
      { label: 'RETRO BITCRUSH FILTER', key: 'bitcrush', default: true  },
      { label: 'SPATIAL AUDIO',         key: 'spatial',  default: true  },
      { label: 'MUTE ON FOCUS LOSS',    key: 'muteFocus',default: true  },
    ];

    toggles.forEach(toggle => {
      const stored2 = JSON.parse(localStorage.getItem('dr-doom-audio') ?? '{}');
      const checked = stored2[toggle.key] ?? toggle.default;

      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; gap: 12px;
        padding: 8px 0; border-bottom: 1px solid #0a1a0a;
        cursor: pointer;
      `;

      const box = document.createElement('div');
      box.style.cssText = `
        width: 14px; height: 14px; border: 1px solid #334433;
        display: flex; align-items: center; justify-content: center;
        color: #00ff41; font-size: 10px;
        background: ${checked ? '#0a1a0a' : 'transparent'};
        flex-shrink: 0;
      `;
      box.textContent = checked ? '✓' : '';

      const label = document.createElement('div');
      label.style.cssText = 'color:#557755;font-size:10px;letter-spacing:1px;';
      label.textContent = toggle.label;

      row.addEventListener('click', () => {
        const s = JSON.parse(localStorage.getItem('dr-doom-audio') ?? '{}');
        s[toggle.key] = !(s[toggle.key] ?? toggle.default);
        localStorage.setItem('dr-doom-audio', JSON.stringify(s));
        this._renderContent();
      });

      row.appendChild(box);
      row.appendChild(label);
      content.appendChild(row);
    });

    const note = document.createElement('div');
    note.style.cssText = 'margin-top:20px;font-size:9px;color:#223322;letter-spacing:1px;line-height:1.8;';
    note.textContent = 'AUDIO ENGINE INITIALIZES IN PHASE 7. SETTINGS ARE SAVED AND WILL APPLY AUTOMATICALLY.';
    content.appendChild(note);
  }

  _quit() {
    this._el.style.display = 'none';
    this._onQuit?.();
    // Reload for now — Phase 8 adds proper state reset
    setTimeout(() => location.reload(), 300);
  }
}
