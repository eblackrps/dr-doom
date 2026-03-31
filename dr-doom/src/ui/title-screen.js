import { saves } from '../save/save-system.js';
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

const BUILD_VERSION = '1.3.0';

function checkpointLabel(arenaId) {
  return {
    'ransomware-king': 'RANSOMWARE KING',
    'cascade-titan': 'CASCADE TITAN',
    'the-audit': 'THE AUDIT',
  }[arenaId] ?? 'LEVEL CHECKPOINT';
}

export class TitleScreen {
  constructor() {
    this._el = null;
    this._animFrame = null;
    this._elapsed = 0;
    this._canvas = null;
    this._ctx = null;
    this._resolve = null;
    this._ready = false;
    this._defaultSelection = saves.hasCheckpoint() ? 'resume' : 'new-run';
  }

  show() {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this._build();
      this._startAnimation();
    });
  }

  _build() {
    const checkpoint = saves.getCheckpoint();
    const stats = saves.getStats();
    const diff = saves.getDifficultyConfig();
    const bestTime = saves.getBestTime('level-01') ?? '--:--';
    const bestRank = saves.getBestRank('level-01') ?? '--';

    const el = document.createElement('div');
    el.id = 'title-screen';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      overflow: hidden;
      font-family: 'Courier New', monospace;
    `;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.appendChild(canvas);
    this._canvas = canvas;

    const shell = document.createElement('div');
    shell.style.cssText = `
      position: relative;
      z-index: 2;
      width: min(960px, 92vw);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 28px;
      align-items: start;
    `;

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;text-align:left;';

    const ver = document.createElement('div');
    ver.id = 'title-ver';
    ver.style.cssText = 'font-size:9px;letter-spacing:5px;color:#ff220088;margin-bottom:14px;opacity:0;transition:opacity 0.6s;';
    ver.textContent = `CLASSIFIED // DR SYSTEMS INC. // BUILD ${BUILD_VERSION}`;
    left.appendChild(ver);

    const logo = document.createElement('pre');
    logo.id = 'title-logo';
    logo.style.cssText = `
      font-size: clamp(6px, 1vw, 11px);
      line-height: 1.08;
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
    left.appendChild(logo);

    const sub = document.createElement('div');
    sub.id = 'title-sub';
    sub.style.cssText = `
      font-size: clamp(10px, 1.25vw, 14px);
      letter-spacing: 6px;
      color: #8c8c8c;
      margin-top: 18px;
      opacity: 0;
      transition: opacity 0.6s 0.2s;
    `;
    sub.textContent = 'DISASTER RECOVERY: THE GAME';
    left.appendChild(sub);

    const tag = document.createElement('div');
    tag.id = 'title-tag';
    tag.style.cssText = `
      font-size: clamp(8px, 0.95vw, 10px);
      letter-spacing: 3px;
      color: #ff220088;
      margin-top: 6px;
      opacity: 0;
      transition: opacity 0.6s 0.35s;
    `;
    tag.textContent = 'RTO IS TICKING. YOUR RUNBOOK IS NOT A SUGGESTION.';
    left.appendChild(tag);

    const statsStrip = document.createElement('div');
    statsStrip.id = 'title-stats';
    statsStrip.style.cssText = `
      margin-top: 28px;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      opacity: 0;
      transition: opacity 0.6s 0.5s;
    `;
    [
      ['BEST TIME', bestTime, '#ffaa00'],
      ['BEST RANK', bestRank, '#00ff41'],
      ['TOTAL KILLS', `${stats.totalKills}`, '#ff4400'],
      ['SECRETS FOUND', `${stats.secretsFound}`, '#00c2ff'],
    ].forEach(([label, value, color]) => {
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 12px 14px;
        border: 1px solid #102316;
        background: rgba(0, 0, 0, 0.42);
      `;
      card.innerHTML = `
        <div style="font-size:8px;letter-spacing:2px;color:#365236;margin-bottom:6px;">${label}</div>
        <div style="font-size:20px;letter-spacing:2px;color:${color};text-shadow:0 0 12px ${color}44;">${value}</div>
      `;
      statsStrip.appendChild(card);
    });
    left.appendChild(statsStrip);

    const right = document.createElement('div');
    right.id = 'title-panel';
    right.style.cssText = `
      opacity: 0;
      transition: opacity 0.6s 0.7s;
      border: 1px solid #102316;
      background: linear-gradient(180deg, rgba(4, 12, 7, 0.9) 0%, rgba(2, 4, 3, 0.92) 100%);
      box-shadow: 0 0 28px #00ff410f;
      padding: 18px 18px 16px;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px;';
    header.innerHTML = `
      <div>
        <div style="font-size:8px;letter-spacing:2px;color:#365236;margin-bottom:5px;">DEPLOYMENT PROFILE</div>
        <div id="title-difficulty-readout" style="font-size:16px;letter-spacing:3px;color:${diff.color};text-shadow:0 0 10px ${diff.color}55;">${diff.label}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:8px;letter-spacing:2px;color:#365236;margin-bottom:5px;">STATUS</div>
        <div style="font-size:10px;letter-spacing:2px;color:${checkpoint ? '#00ff41' : '#88aa88'};">${checkpoint ? 'CHECKPOINT READY' : 'FRESH RUN'}</div>
      </div>
    `;
    right.appendChild(header);

    if (checkpoint) {
      const checkpointCard = document.createElement('div');
      checkpointCard.style.cssText = `
        border: 1px solid #14301c;
        background: rgba(0, 255, 65, 0.05);
        padding: 12px 12px 10px;
        margin-bottom: 14px;
      `;
      checkpointCard.innerHTML = `
        <div style="font-size:8px;letter-spacing:2px;color:#5b755b;margin-bottom:6px;">LAST CHECKPOINT</div>
        <div style="font-size:12px;letter-spacing:2px;color:#00ff41;margin-bottom:4px;">${checkpointLabel(checkpoint.arenaId)}</div>
        <div style="font-size:9px;line-height:1.8;letter-spacing:1px;color:#89a989;">
          UPTIME ${checkpoint.playerHp}% &nbsp;|&nbsp; REDUNDANCY ${checkpoint.playerArmor}%<br>
          SAVED ARSENAL SLOTS: ${(checkpoint.unlockedSlots ?? [1]).join(', ')}
        </div>
      `;
      right.appendChild(checkpointCard);
    }

    const diffWrap = document.createElement('div');
    diffWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;';
    const diffTitle = document.createElement('div');
    diffTitle.style.cssText = 'width:100%;font-size:8px;letter-spacing:2px;color:#365236;margin-bottom:2px;';
    diffTitle.textContent = 'MISSION DIFFICULTY';
    diffWrap.appendChild(diffTitle);

    const difficulties = [
      { id: 'intern', label: 'INTERN', color: '#00ff41' },
      { id: 'sysadmin', label: 'SYSADMIN', color: '#ffaa00' },
      { id: 'architect', label: 'ARCHITECT', color: '#ff8800' },
      { id: 'nightmare', label: 'NIGHTMARE', color: '#ff2200' },
    ];
    let selected = saves.getDifficulty();
    const refreshButtons = [];
    difficulties.forEach((difficulty) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.style.cssText = `
        padding: 4px 9px;
        border: 1px solid #1a2a1a;
        background: transparent;
        color: #334433;
        cursor: pointer;
        font-family: inherit;
        font-size: 8px;
        letter-spacing: 1px;
      `;
      button.textContent = difficulty.label;
      const refresh = () => {
        const active = selected === difficulty.id;
        button.style.color = active ? difficulty.color : '#334433';
        button.style.borderColor = active ? `${difficulty.color}55` : '#1a2a1a';
        button.style.background = active ? `${difficulty.color}11` : 'transparent';
      };
      button.addEventListener('click', () => {
        selected = difficulty.id;
        saves.setDifficulty(difficulty.id);
        const nextDiff = saves.getDifficultyConfig();
        const readout = document.getElementById('title-difficulty-readout');
        if (readout) {
          readout.textContent = nextDiff.label;
          readout.style.color = nextDiff.color;
          readout.style.textShadow = `0 0 10px ${nextDiff.color}55`;
        }
        refreshButtons.forEach((fn) => fn());
      });
      button.addEventListener('mouseenter', () => {
        if (selected !== difficulty.id) {
          button.style.color = difficulty.color;
          button.style.borderColor = `${difficulty.color}33`;
        }
      });
      button.addEventListener('mouseleave', refresh);
      refreshButtons.push(refresh);
      refresh();
      diffWrap.appendChild(button);
    });
    right.appendChild(diffWrap);

    const menu = document.createElement('div');
    menu.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    const items = checkpoint
      ? [
          ['resume', '▸ RESUME CHECKPOINT', '[ENTER]', '#00ff41'],
          ['new-run', '  START NEW RUN', '[N]', '#88cc88'],
          ['settings', '  CONFIGURE SYSTEMS', '[S]', '#88cc88'],
          ['credits', '  ABOUT', '[A]', '#88cc88'],
        ]
      : [
          ['new-run', '▸ DEPLOY ENGINEER', '[ENTER]', '#00ff41'],
          ['settings', '  CONFIGURE SYSTEMS', '[S]', '#88cc88'],
          ['credits', '  ABOUT', '[A]', '#88cc88'],
        ];

    items.forEach(([id, label, hotkey, color]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = `menu-${id}`;
      button.style.cssText = `
        width: 100%;
        padding: 11px 12px;
        border: 1px solid ${color}22;
        background: transparent;
        color: ${color};
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        font-size: 11px;
        letter-spacing: 2px;
      `;
      button.innerHTML = `${label} <span style="float:right;color:#4c684c;">${hotkey}</span>`;
      button.addEventListener('mouseenter', () => {
        button.style.background = `${color}11`;
        button.style.borderColor = color;
      });
      button.addEventListener('mouseleave', () => {
        button.style.background = 'transparent';
        button.style.borderColor = `${color}22`;
      });
      if (id === 'settings') button.addEventListener('click', () => this._showSettingsFromTitle());
      else if (id === 'credits') button.addEventListener('click', () => this._showCredits());
      else button.addEventListener('click', () => this._startGame(id));
      menu.appendChild(button);
    });
    right.appendChild(menu);

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:16px;font-size:9px;letter-spacing:1px;line-height:1.8;color:#486248;';
    footer.innerHTML = `
      <div>FIELD MANUAL: <span style="color:#7ca27c;">ANYSTACKARCHITECT.COM</span></div>
      <div>FULL CONTROL REMAPPING IS AVAILABLE FROM THE IN-GAME PAUSE MENU.</div>
    `;
    right.appendChild(footer);

    shell.appendChild(left);
    shell.appendChild(right);
    el.appendChild(shell);
    document.body.appendChild(el);
    this._el = el;

    setTimeout(() => {
      document.getElementById('title-ver').style.opacity = '1';
      document.getElementById('title-logo').style.opacity = '1';
      document.getElementById('title-sub').style.opacity = '1';
      document.getElementById('title-tag').style.opacity = '1';
      document.getElementById('title-stats').style.opacity = '1';
      document.getElementById('title-panel').style.opacity = '1';
      this._ready = true;
    }, 180);

    this._boundOnKey = this._onKey.bind(this);
    window.addEventListener('keydown', this._boundOnKey);
  }

  _onKey(e) {
    if (!this._ready) return;
    if (document.getElementById('title-settings-overlay')) {
      if (e.code === 'Escape') {
        document.getElementById('title-settings-overlay')?.remove();
      }
      return;
    }

    if (e.code === 'Enter' || e.code === 'Space') this._startGame(this._defaultSelection);
    if (e.code === 'KeyN') this._startGame('new-run');
    if (e.code === 'KeyR' && saves.hasCheckpoint()) this._startGame('resume');
    if (e.code === 'KeyS') this._showSettingsFromTitle();
    if (e.code === 'KeyA') this._showCredits();
  }

  _startGame(mode = this._defaultSelection) {
    if (!this._ready) return;
    this._ready = false;
    window.removeEventListener('keydown', this._boundOnKey);
    window.removeEventListener('resize', this._boundResize);
    cancelAnimationFrame(this._animFrame);

    this._el.style.transition = 'opacity 0.5s';
    this._el.style.opacity = '0';
    setTimeout(() => {
      this._el?.remove();
      this._resolve?.(mode);
    }, 500);
  }

  _showSettingsFromTitle() {
    if (document.getElementById('title-settings-overlay')) return;

    let gameplay = loadGameplaySettings();
    let audio = loadAudioSettings();
    let tab = 'gameplay';

    const overlay = document.createElement('div');
    overlay.id = 'title-settings-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      font-family: 'Courier New', monospace;
      padding: 24px;
    `;

    const render = () => {
      overlay.innerHTML = '';

      const panel = document.createElement('div');
      panel.style.cssText = `
        width: min(640px, 96vw);
        max-height: 88vh;
        overflow-y: auto;
        border: 1px solid #00ff4133;
        background: #030a05;
        box-shadow: 0 0 40px #00ff4111;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        background:#00ff41;
        color:#000;
        padding:8px 16px;
        font-size:11px;
        font-weight:bold;
        letter-spacing:3px;
        display:flex;
        justify-content:space-between;
        align-items:center;
      `;
      header.innerHTML = '<span>PRE-LAUNCH CONFIGURATION</span>';
      const close = document.createElement('button');
      close.type = 'button';
      close.style.cssText = 'border:none;background:transparent;color:#000;cursor:pointer;font:inherit;font-size:14px;';
      close.textContent = 'X';
      close.addEventListener('click', () => overlay.remove());
      header.appendChild(close);
      panel.appendChild(header);

      const tabs = document.createElement('div');
      tabs.style.cssText = 'display:flex;border-bottom:1px solid #00ff4122;';
      ['gameplay', 'audio'].forEach((tabId) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = `
          flex:1;
          padding:10px 8px;
          border:none;
          border-bottom:${tab === tabId ? '2px solid #00ff41' : '2px solid transparent'};
          background:${tab === tabId ? '#0a1a0a' : 'transparent'};
          color:${tab === tabId ? '#00ff41' : '#334433'};
          cursor:pointer;
          font-family:inherit;
          font-size:9px;
          letter-spacing:2px;
        `;
        button.textContent = tabId.toUpperCase();
        button.addEventListener('click', () => {
          tab = tabId;
          render();
        });
        tabs.appendChild(button);
      });
      panel.appendChild(tabs);

      const body = document.createElement('div');
      body.style.cssText = 'padding:20px;';

      if (tab === 'gameplay') {
        body.appendChild(this._buildTitleSlider(
          'LOOK SENSITIVITY',
          gameplay.mouseSensitivity,
          0.4,
          1.8,
          0.05,
          (value) => `${Number(value).toFixed(2)}x`,
          (value) => { gameplay = saveGameplaySettings({ mouseSensitivity: Number(value) }); },
        ));
        body.appendChild(this._buildTitleSlider(
          'FIELD OF VIEW',
          gameplay.fov,
          60,
          100,
          1,
          (value) => `${Math.round(Number(value))}°`,
          (value) => { gameplay = saveGameplaySettings({ fov: Number(value) }); },
        ));
        body.appendChild(this._buildTitleToggle(
          'INVERT LOOK Y-AXIS',
          gameplay.invertY,
          'Vertical look direction swaps on deploy.',
          () => {
            gameplay = saveGameplaySettings({ invertY: !gameplay.invertY });
            render();
          },
        ));

        const note = document.createElement('div');
        note.style.cssText = 'margin-top:16px;font-size:9px;line-height:1.8;letter-spacing:1px;color:#486248;';
        note.textContent = 'FULL KEY REMAPPING IS AVAILABLE AFTER DEPLOYMENT FROM THE PAUSE MENU.';
        body.appendChild(note);

        const reset = document.createElement('button');
        reset.type = 'button';
        reset.style.cssText = 'margin-top:14px;width:100%;padding:10px;border:1px solid #334433;background:transparent;color:#557755;cursor:pointer;font-family:inherit;font-size:9px;letter-spacing:2px;';
        reset.textContent = 'RESET GAMEPLAY SETTINGS';
        reset.addEventListener('click', () => {
          gameplay = saveGameplaySettings(DEFAULT_GAMEPLAY_SETTINGS);
          render();
        });
        body.appendChild(reset);
      } else {
        [
          ['MASTER VOLUME', 'master'],
          ['SFX BUS', 'sfx'],
          ['MUSIC BUS', 'music'],
          ['AMBIENT BUS', 'ambient'],
        ].forEach(([label, key]) => {
          body.appendChild(this._buildTitleSlider(
            label,
            audio[key],
            0,
            100,
            1,
            (value) => `${Math.round(Number(value))}%`,
            (value) => { audio = saveAudioSettings({ [key]: Number(value) }); },
          ));
        });

        body.appendChild(this._buildTitleToggle(
          'RETRO BITCRUSH',
          audio.bitcrush,
          'Keep the low-fi edge on the synthesized sound design.',
          () => {
            audio = saveAudioSettings({ bitcrush: !audio.bitcrush });
            render();
          },
        ));
        body.appendChild(this._buildTitleToggle(
          'SPATIAL AUDIO',
          audio.spatial,
          'Use positional sound cues for enemy and pickup placement.',
          () => {
            audio = saveAudioSettings({ spatial: !audio.spatial });
            render();
          },
        ));
        body.appendChild(this._buildTitleToggle(
          'MUTE ON FOCUS LOSS',
          audio.muteFocus,
          'Silence the mix when the tab loses focus.',
          () => {
            audio = saveAudioSettings({ muteFocus: !audio.muteFocus });
            render();
          },
        ));

        const reset = document.createElement('button');
        reset.type = 'button';
        reset.style.cssText = 'margin-top:14px;width:100%;padding:10px;border:1px solid #334433;background:transparent;color:#557755;cursor:pointer;font-family:inherit;font-size:9px;letter-spacing:2px;';
        reset.textContent = 'RESET AUDIO SETTINGS';
        reset.addEventListener('click', () => {
          audio = resetAudioSettings() ?? { ...DEFAULT_AUDIO_SETTINGS };
          render();
        });
        body.appendChild(reset);
      }

      panel.appendChild(body);
      overlay.appendChild(panel);
    };

    render();
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  _buildTitleSlider(labelText, value, min, max, step, format, onInput) {
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 0 12px;border-bottom:1px solid #0a1a0a;';

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px;letter-spacing:1px;color:#557755;';
    label.textContent = labelText;
    const display = document.createElement('div');
    display.style.cssText = 'font-size:10px;letter-spacing:1px;color:#00ff41;';
    display.textContent = format(value);
    top.appendChild(label);
    top.appendChild(display);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = `${min}`;
    slider.max = `${max}`;
    slider.step = `${step}`;
    slider.value = `${value}`;
    slider.style.cssText = 'width:100%;accent-color:#00ff41;cursor:pointer;';
    slider.addEventListener('input', () => {
      display.textContent = format(slider.value);
      onInput(slider.value);
    });

    row.appendChild(top);
    row.appendChild(slider);
    return row;
  }

  _buildTitleToggle(labelText, checked, description, onToggle) {
    const row = document.createElement('button');
    row.type = 'button';
    row.style.cssText = `
      width:100%;
      margin-top:10px;
      padding:10px 12px;
      border:1px solid #102316;
      background:rgba(0,0,0,0.35);
      display:flex;
      gap:12px;
      align-items:flex-start;
      cursor:pointer;
      font-family:inherit;
      text-align:left;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      width:16px;height:16px;
      border:1px solid ${checked ? '#00ff41' : '#334433'};
      color:#00ff41;
      display:flex;align-items:center;justify-content:center;
      background:${checked ? '#0a1a0a' : 'transparent'};
      flex-shrink:0;
      margin-top:1px;
    `;
    box.textContent = checked ? '✓' : '';

    const text = document.createElement('div');
    text.innerHTML = `
      <div style="font-size:10px;letter-spacing:1px;color:${checked ? '#00ff41' : '#557755'};">${labelText}</div>
      <div style="margin-top:4px;font-size:9px;line-height:1.7;letter-spacing:1px;color:#486248;">${description}</div>
    `;

    row.appendChild(box);
    row.appendChild(text);
    row.addEventListener('click', onToggle);
    return row;
  }

  _showCredits() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      font-family: 'Courier New', monospace;
      color: #00ff41;
      cursor: pointer;
      padding: 32px;
    `;
    overlay.innerHTML = `
      <div style="max-width:540px;text-align:center;padding:40px;border:1px solid #102316;background:rgba(0,0,0,0.45);">
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
          WHO HAS EVER BEEN PAGED AT 3AM
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
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    this._boundResize = resize;
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 88 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speed: 0.2 + Math.random() * 0.9,
      char: '01ABCDEF'.split('')[Math.floor(Math.random() * 8)],
      opacity: 0.18 + Math.random() * 0.6,
      color: Math.random() > 0.72 ? '#ff2200' : '#001d08',
    }));
    const glitchLines = [];

    let lastTs = 0;
    const tick = (ts) => {
      this._animFrame = requestAnimationFrame(tick);
      const dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
      lastTs = ts;
      this._elapsed = ts * 0.001;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const glow = ctx.createRadialGradient(
        canvas.width * 0.32, canvas.height * 0.42, 0,
        canvas.width * 0.32, canvas.height * 0.42, canvas.height * 0.72,
      );
      glow.addColorStop(0, 'rgba(120, 20, 0, 0.14)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = '12px Courier New';
      particles.forEach((particle) => {
        particle.y += particle.speed;
        if (particle.y > canvas.height + 16) {
          particle.y = -12;
          particle.x = Math.random() * canvas.width;
        }
        ctx.globalAlpha = particle.opacity * 0.42;
        ctx.fillStyle = particle.color;
        ctx.fillText(particle.char, particle.x, particle.y);
        if (Math.random() > 0.985) {
          particle.char = '01ABCDEF█▓░▒'.split('')[Math.floor(Math.random() * 12)];
        }
      });

      ctx.globalAlpha = 0.045;
      ctx.fillStyle = '#000';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 2);
      }

      if (Math.random() > 0.968) {
        glitchLines.push({
          y: Math.random() * canvas.height,
          life: 0.08 + Math.random() * 0.12,
          h: 1 + Math.floor(Math.random() * 3),
        });
      }
      glitchLines.forEach((glitch) => {
        glitch.life -= dt;
        ctx.globalAlpha = Math.max(0, glitch.life * 8);
        ctx.fillStyle = Math.random() > 0.45 ? '#ff2200' : '#00ff41';
        ctx.fillRect(Math.random() * 60, glitch.y, canvas.width * (0.3 + Math.random() * 0.65), glitch.h);
      });
      for (let i = glitchLines.length - 1; i >= 0; i--) {
        if (glitchLines[i].life <= 0) glitchLines.splice(i, 1);
      }

      ctx.globalAlpha = 1;
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.height * 0.2,
        canvas.width / 2, canvas.height / 2, canvas.height * 0.92,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.88)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pulse = 0.5 + Math.sin(this._elapsed * 0.8) * 0.5;
      const logo = document.getElementById('title-logo');
      if (logo) {
        logo.style.textShadow = `0 0 ${20 + pulse * 18}px #ff2200, 0 0 ${40 + pulse * 34}px #ff220044`;
      }
    };

    this._animFrame = requestAnimationFrame(tick);
  }
}
