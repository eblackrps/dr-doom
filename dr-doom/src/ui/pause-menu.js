import { DEFAULT_KEYMAP } from '../engine/input.js';
import {
  DEFAULT_GAMEPLAY_SETTINGS,
  loadGameplaySettings,
  saveGameplaySettings,
} from '../settings/gameplay-settings.js';
import {
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  saveAudioSettings,
  resetAudioSettings,
} from '../settings/audio-settings.js';

const TAB_LABELS = {
  main: 'MISSION',
  controls: 'CONTROLS',
  gameplay: 'GAMEPLAY',
  audio: 'AUDIO',
};

function formatBinding(code) {
  return code
    .replace('Key', '')
    .replace('Digit', '')
    .replace('ArrowUp', 'UP')
    .replace('ArrowDown', 'DOWN')
    .replace('ArrowLeft', 'LEFT')
    .replace('ArrowRight', 'RIGHT')
    .replace('ShiftLeft', 'LSHFT')
    .replace('ShiftRight', 'RSHFT')
    .replace('Space', 'SPACE');
}

export class PauseMenu {
  constructor(input, audioSystem, systems = {}) {
    this._input = input;
    this._audio = audioSystem;
    this._systems = systems;
    this._el = null;
    this._visible = false;
    this._tab = 'main';
    this._remapping = null;
    this._onResume = null;
    this._onQuit = null;
    this._gameplaySettings = loadGameplaySettings();
    this._audioSettings = loadAudioSettings();

    this._build();
    this._bindEsc();
  }

  onResume(fn) { this._onResume = fn; }
  onQuit(fn) { this._onQuit = fn; }

  setAudioSystem(audioSystem) {
    this._audio = audioSystem;
  }

  show(tab = 'main') {
    this._visible = true;
    this._tab = tab;
    this._gameplaySettings = loadGameplaySettings();
    this._audioSettings = loadAudioSettings();
    this._el.style.display = 'flex';
    document.exitPointerLock?.();
    this._renderContent();
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    this._el.style.display = 'none';
    this._onResume?.();
  }

  openSettings() {
    this.show('gameplay');
  }

  isVisible() {
    return this._visible;
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'pause-menu';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 300;
      font-family: 'Courier New', monospace;
      padding: 24px;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _bindEsc() {
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;

      if (this._remapping) {
        this._remapping = null;
        this._renderContent();
        return;
      }

      if (this._visible) this.hide();
      else this.show();
    });
  }

  _renderContent() {
    this._el.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: min(720px, 96vw);
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid #00ff4133;
      box-shadow: 0 0 40px #00ff4111;
      background: linear-gradient(180deg, #031109 0%, #020603 100%);
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(90deg, #00ff41 0%, #75ff9e 100%);
      color: #000;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: bold;
      letter-spacing: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>DR DOOM // SYSTEM PAUSE</span>
      <span style="opacity:0.6">${TAB_LABELS[this._tab]}</span>
    `;
    panel.appendChild(header);

    const tabs = document.createElement('div');
    tabs.style.cssText = 'display:flex;border-bottom:1px solid #00ff4122;';
    ['main', 'controls', 'gameplay', 'audio'].forEach((tab) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = `
        flex: 1;
        padding: 10px 8px;
        border: none;
        border-bottom: ${this._tab === tab ? '2px solid #00ff41' : '2px solid transparent'};
        background: ${this._tab === tab ? '#09150c' : 'transparent'};
        color: ${this._tab === tab ? '#00ff41' : '#385338'};
        cursor: pointer;
        font-family: inherit;
        font-size: 9px;
        letter-spacing: 2px;
      `;
      btn.textContent = TAB_LABELS[tab];
      btn.addEventListener('click', () => {
        this._tab = tab;
        this._renderContent();
      });
      tabs.appendChild(btn);
    });
    panel.appendChild(tabs);

    const content = document.createElement('div');
    content.style.cssText = 'padding:20px 22px 22px;';

    if (this._tab === 'main') this._renderMainTab(content);
    if (this._tab === 'controls') this._renderControlsTab(content);
    if (this._tab === 'gameplay') this._renderGameplayTab(content);
    if (this._tab === 'audio') this._renderAudioTab(content);

    panel.appendChild(content);
    this._el.appendChild(panel);
  }

  _renderMainTab(content) {
    const actions = [
      { label: 'RESUME MISSION', tab: null, action: () => this.hide(), color: '#00ff41' },
      { label: 'GAMEPLAY SETTINGS', tab: 'gameplay', action: () => this._switchTab('gameplay'), color: '#88cc88' },
      { label: 'CONTROL MAPPING', tab: 'controls', action: () => this._switchTab('controls'), color: '#88cc88' },
      { label: 'AUDIO MIX', tab: 'audio', action: () => this._switchTab('audio'), color: '#88cc88' },
      { label: 'ABORT MISSION', tab: null, action: () => this._quit(), color: '#ff6644' },
    ];

    actions.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = `
        width: 100%;
        margin-bottom: 8px;
        padding: 12px 14px;
        border: 1px solid ${item.color}33;
        background: transparent;
        color: ${item.color};
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        font-size: 11px;
        letter-spacing: 3px;
      `;
      btn.textContent = `▸ ${item.label}`;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = `${item.color}11`;
        btn.style.borderColor = item.color;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        btn.style.borderColor = `${item.color}33`;
      });
      btn.addEventListener('click', item.action);
      content.appendChild(btn);
    });

    const summary = document.createElement('div');
    summary.style.cssText = `
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #0a1a0a;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    `;

    [
      ['LOOK SENS', `${this._gameplaySettings.mouseSensitivity.toFixed(2)}x`, '#00ff41'],
      ['FIELD OF VIEW', `${Math.round(this._gameplaySettings.fov)}°`, '#ffaa00'],
      ['MASTER MIX', `${this._audioSettings.master}%`, '#00c2ff'],
      ['INVERT Y', this._gameplaySettings.invertY ? 'ENABLED' : 'OFF', '#88aa88'],
    ].forEach(([label, value, color]) => {
      const card = document.createElement('div');
      card.style.cssText = `
        border: 1px solid #102316;
        background: rgba(0, 0, 0, 0.35);
        padding: 12px;
      `;
      card.innerHTML = `
        <div style="font-size:8px;letter-spacing:2px;color:#385338;margin-bottom:6px;">${label}</div>
        <div style="font-size:18px;letter-spacing:2px;color:${color};text-shadow:0 0 10px ${color}55;">${value}</div>
      `;
      summary.appendChild(card);
    });
    content.appendChild(summary);

    const note = document.createElement('div');
    note.style.cssText = 'margin-top:16px;font-size:9px;letter-spacing:1px;line-height:1.8;color:#4d674d;';
    note.textContent = 'CONTROL, GAMEPLAY, AND AUDIO SETTINGS SAVE AUTOMATICALLY AND APPLY LIVE WHEN POSSIBLE.';
    content.appendChild(note);
  }

  _renderControlsTab(content) {
    const title = document.createElement('div');
    title.style.cssText = 'font-size:9px;letter-spacing:2px;color:#557755;margin-bottom:16px;';
    title.textContent = 'CLICK A BINDING, THEN PRESS THE NEW KEY. ESC CANCELS THE ACTIVE REMAP.';
    content.appendChild(title);

    const actions = [
      ['moveForward', 'MOVE FORWARD'],
      ['moveBackward', 'MOVE BACKWARD'],
      ['moveLeft', 'STRAFE LEFT'],
      ['moveRight', 'STRAFE RIGHT'],
      ['jump', 'JUMP'],
      ['interact', 'INTERACT'],
      ['weapon1', 'WEAPON 1'],
      ['weapon2', 'WEAPON 2'],
      ['weapon3', 'WEAPON 3'],
      ['weapon4', 'WEAPON 4'],
      ['weapon5', 'WEAPON 5'],
      ['weapon6', 'WEAPON 6'],
      ['weapon7', 'WEAPON 7'],
      ['pause', 'PAUSE MENU'],
    ];

    actions.forEach(([actionKey, labelText]) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:center;
        padding:8px 0;
        border-bottom:1px solid #0a1a0a;
        font-size:10px;
      `;

      const label = document.createElement('div');
      label.style.cssText = 'color:#5b755b;letter-spacing:1px;';
      label.textContent = labelText;

      const bindings = this._input.keymap[actionKey] ?? DEFAULT_KEYMAP[actionKey] ?? [];
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;';

      bindings.forEach((code, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        const activeRemap = this._remapping?.action === actionKey && this._remapping.index === index;
        button.style.cssText = `
          min-width:56px;
          padding:4px 8px;
          border:1px solid ${activeRemap ? '#00ff41' : '#223322'};
          background:${activeRemap ? '#0b1a0f' : 'transparent'};
          color:${activeRemap ? '#00ff41' : '#486248'};
          cursor:pointer;
          font-family:inherit;
          font-size:9px;
          letter-spacing:1px;
        `;
        button.textContent = activeRemap ? '...' : formatBinding(code);
        button.addEventListener('click', () => this._beginRemap(actionKey, index));
        wrap.appendChild(button);
      });

      row.appendChild(label);
      row.appendChild(wrap);
      content.appendChild(row);
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.style.cssText = `
      margin-top: 16px;
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #334433;
      background: transparent;
      color: #5b755b;
      cursor: pointer;
      font-family: inherit;
      font-size: 9px;
      letter-spacing: 2px;
    `;
    reset.textContent = 'RESET KEYMAP TO DEFAULTS';
    reset.addEventListener('click', () => {
      this._input.resetKeymap();
      this._renderContent();
    });
    content.appendChild(reset);
  }

  _renderGameplayTab(content) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:9px;letter-spacing:2px;color:#557755;margin-bottom:18px;';
    hint.textContent = 'LOOK SETTINGS APPLY LIVE. FOV UPDATES THE WORLD CAMERA AND WEAPON CAMERA TOGETHER.';
    content.appendChild(hint);

    this._renderSlider(content, {
      label: 'LOOK SENSITIVITY',
      value: this._gameplaySettings.mouseSensitivity,
      min: 0.4,
      max: 1.8,
      step: 0.05,
      display: (value) => `${Number(value).toFixed(2)}x`,
      onInput: (value) => {
        this._gameplaySettings = saveGameplaySettings({ mouseSensitivity: Number(value) });
        this._systems.player?.applyLookSettings(this._gameplaySettings);
      },
    });

    this._renderSlider(content, {
      label: 'FIELD OF VIEW',
      value: this._gameplaySettings.fov,
      min: 60,
      max: 100,
      step: 1,
      display: (value) => `${Math.round(Number(value))}°`,
      onInput: (value) => {
        this._gameplaySettings = saveGameplaySettings({ fov: Number(value) });
        this._systems.renderer?.setFov(this._gameplaySettings.fov);
      },
    });

    this._renderToggle(content, {
      label: 'INVERT LOOK Y-AXIS',
      checked: this._gameplaySettings.invertY,
      description: 'Swap vertical mouse look direction.',
      onToggle: () => {
        this._gameplaySettings = saveGameplaySettings({
          invertY: !this._gameplaySettings.invertY,
        });
        this._systems.player?.applyLookSettings(this._gameplaySettings);
        this._renderContent();
      },
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.style.cssText = `
      margin-top: 16px;
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #334433;
      background: transparent;
      color: #5b755b;
      cursor: pointer;
      font-family: inherit;
      font-size: 9px;
      letter-spacing: 2px;
    `;
    reset.textContent = 'RESET GAMEPLAY SETTINGS';
    reset.addEventListener('click', () => {
      this._gameplaySettings = saveGameplaySettings(DEFAULT_GAMEPLAY_SETTINGS);
      this._systems.player?.applyLookSettings(this._gameplaySettings);
      this._systems.renderer?.setFov(this._gameplaySettings.fov);
      this._renderContent();
    });
    content.appendChild(reset);
  }

  _renderAudioTab(content) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:9px;letter-spacing:2px;color:#557755;margin-bottom:18px;';
    hint.textContent = 'AUDIO MIX SAVES IMMEDIATELY. IF THE AUDIO CONTEXT IS ACTIVE, CHANGES APPLY LIVE.';
    content.appendChild(hint);

    [
      ['MASTER VOLUME', 'master'],
      ['SFX BUS', 'sfx'],
      ['MUSIC BUS', 'music'],
      ['AMBIENT BUS', 'ambient'],
    ].forEach(([label, key]) => {
      this._renderSlider(content, {
        label,
        value: this._audioSettings[key],
        min: 0,
        max: 100,
        step: 1,
        display: (value) => `${Math.round(Number(value))}%`,
        onInput: (value) => {
          this._audioSettings = saveAudioSettings({ [key]: Number(value) });
          this._audio?.applySettings?.();
        },
      });
    });

    [
      ['RETRO BITCRUSH', 'bitcrush', 'Applies the low-fi grit to synthesized effects when supported.'],
      ['SPATIAL AUDIO', 'spatial', 'Switch between positional 3D sound and flat output.'],
      ['MUTE ON FOCUS LOSS', 'muteFocus', 'Silence the mix when the tab loses focus.'],
    ].forEach(([label, key, description]) => {
      this._renderToggle(content, {
        label,
        checked: !!this._audioSettings[key],
        description,
        onToggle: () => {
          this._audioSettings = saveAudioSettings({ [key]: !this._audioSettings[key] });
          this._audio?.applySettings?.();
          this._renderContent();
        },
      });
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.style.cssText = `
      margin-top: 16px;
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #334433;
      background: transparent;
      color: #5b755b;
      cursor: pointer;
      font-family: inherit;
      font-size: 9px;
      letter-spacing: 2px;
    `;
    reset.textContent = 'RESET AUDIO SETTINGS';
    reset.addEventListener('click', () => {
      this._audioSettings = resetAudioSettings();
      this._audio?.applySettings?.();
      this._renderContent();
    });
    content.appendChild(reset);
  }

  _renderSlider(content, config) {
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 0 12px;border-bottom:1px solid #0a1a0a;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;';

    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;letter-spacing:1px;color:#5b755b;';
    label.textContent = config.label;

    const value = document.createElement('div');
    value.style.cssText = 'font-size:10px;letter-spacing:1px;color:#00ff41;';
    value.textContent = config.display(config.value);

    labelRow.appendChild(label);
    labelRow.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = `${config.min}`;
    slider.max = `${config.max}`;
    slider.step = `${config.step}`;
    slider.value = `${config.value}`;
    slider.style.cssText = 'width:100%;accent-color:#00ff41;cursor:pointer;';
    slider.addEventListener('input', () => {
      value.textContent = config.display(slider.value);
      config.onInput(slider.value);
    });

    row.appendChild(labelRow);
    row.appendChild(slider);
    content.appendChild(row);
  }

  _renderToggle(content, config) {
    const row = document.createElement('button');
    row.type = 'button';
    row.style.cssText = `
      width: 100%;
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid #102316;
      background: rgba(0, 0, 0, 0.35);
      display: flex;
      gap: 12px;
      align-items: flex-start;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      width: 16px;
      height: 16px;
      border: 1px solid ${config.checked ? '#00ff41' : '#334433'};
      color: #00ff41;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${config.checked ? '#0b1a0f' : 'transparent'};
      flex-shrink: 0;
      margin-top: 1px;
    `;
    box.textContent = config.checked ? '✓' : '';

    const text = document.createElement('div');
    text.innerHTML = `
      <div style="font-size:10px;letter-spacing:1px;color:${config.checked ? '#00ff41' : '#5b755b'};">${config.label}</div>
      <div style="margin-top:4px;font-size:9px;line-height:1.7;letter-spacing:1px;color:#425a42;">${config.description}</div>
    `;

    row.appendChild(box);
    row.appendChild(text);
    row.addEventListener('click', config.onToggle);
    content.appendChild(row);
  }

  _beginRemap(action, index) {
    this._remapping = { action, index };
    this._renderContent();

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('keydown', handler, true);

      if (e.code === 'Escape') {
        this._remapping = null;
        this._renderContent();
        return;
      }

      const next = [...(this._input.keymap[action] ?? [])];
      next[index] = e.code;
      this._input.remap(action, next);
      this._remapping = null;
      this._renderContent();
    };

    window.addEventListener('keydown', handler, true);
  }

  _switchTab(tab) {
    this._tab = tab;
    this._renderContent();
  }

  _quit() {
    this._el.style.display = 'none';
    this._onQuit?.();
    setTimeout(() => location.reload(), 300);
  }
}
