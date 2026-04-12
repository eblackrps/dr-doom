import { saves } from '../save/save-system.js';

export class VictoryScreen {
  constructor() {
    this._el = null;
    this._visible = false;
  }

  show(stats) {
    if (this._visible) return;
    this._visible = true;

    // Save to persistent store
    saves.completeLevel('level-01', stats);

    const el = document.createElement('div');
    el.id = 'victory-screen';
    el.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.94);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      z-index:500; font-family:'Courier New',monospace; color:#00ff41;
      opacity:0; transition:opacity 0.8s; overflow-y:auto; padding:20px;
    `;

    const timeStr    = this._formatTime(stats.elapsed);
    const bestTime   = saves.getBestTime('level-01');
    const diffConfig = saves.getDifficultyConfig();
    const secretPct  = stats.secrets
      ? Math.floor((stats.secrets.found / stats.secrets.total) * 100) : 0;

    el.innerHTML = `
      <div style="
        border:1px solid #00ff41; box-shadow:0 0 40px #00ff4133;
        padding:36px 48px; max-width:600px; width:90%; text-align:center;
      ">
        <div style="font-size:9px;letter-spacing:4px;color:#555;margin-bottom:6px;">
          MISSION DEBRIEF // LEVEL 01 // ${diffConfig.label}
        </div>

        <div style="
          font-size:clamp(20px,3vw,28px); font-weight:bold; letter-spacing:6px;
          color:#00ff41; text-shadow:0 0 20px #00ff41; margin-bottom:4px;
        ">RECOVERY COMPLETE</div>

        <div style="font-size:10px;letter-spacing:3px;color:#ffaa00;margin-bottom:28px;">
          RTO MET — INFRASTRUCTURE RESTORED
        </div>

        <!-- Stats row -->
        <div style="
          border-top:1px solid #00ff4122; border-bottom:1px solid #00ff4122;
          padding:16px 0; margin-bottom:22px;
          display:flex; justify-content:space-around; flex-wrap:wrap; gap:12px;
        ">
          ${[
            ['TIME',    timeStr,              '#ffaa00'],
            ['BEST',    bestTime ?? '--:--',  '#556655'],
            ['KILLS',   stats.kills,          '#ff4400'],
            ['UPTIME',  stats.health + '%',   '#00ff41'],
            ['SECRETS', secretPct + '%',      '#0088ff'],
          ].map(([l,v,c]) => `
            <div style="text-align:center;">
              <div style="font-size:8px;letter-spacing:2px;color:#555;">${l}</div>
              <div style="font-size:clamp(16px,2.5vw,24px);color:${c};font-weight:bold;">${v}</div>
            </div>
          `).join('')}
        </div>

        <!-- Objectives -->
        <div style="text-align:left;margin-bottom:20px;">
          <div style="font-size:8px;letter-spacing:2px;color:#445544;margin-bottom:8px;">DR RUNBOOK STATUS</div>
          ${stats.objectives.map(o => `
            <div style="font-size:9px;letter-spacing:1px;
              color:${o.complete?'#00ff41':'#442222'};padding:2px 0;">
              ${o.complete?'✓':'✗'} ${o.label}
            </div>
          `).join('')}
        </div>

        <!-- Blog callout -->
        <div style="
          background:#0a1a0e; border:1px solid #00ff4122;
          padding:12px 16px; margin-bottom:22px; text-align:left;
        ">
          <div style="font-size:8px;letter-spacing:2px;color:#ffaa00;margin-bottom:6px;">FIELD MANUAL</div>
          <div style="font-size:9px;color:#446644;line-height:1.8;">
            The DR procedures in this game reflect real-world infrastructure architecture.<br>
            Read the broader DR tooling and project context on GitHub:<br>
            <span style="color:#00ff41;letter-spacing:1px;">github.com/eblackrps</span>
          </div>
        </div>

        <!-- Credits -->
        <div style="
          border-top:1px solid #0a1a0a; padding-top:18px; margin-bottom:20px;
          text-align:center;
        ">
          <div style="font-size:8px;letter-spacing:3px;color:#334433;margin-bottom:12px;">CREDITS</div>

          <div style="font-size:9px;color:#334433;line-height:2.4;letter-spacing:1px;">
            CONCEPT, DESIGN &amp; DR CONTENT<br>
            <span style="color:#557755">ERIC BLACK // DR CONTENT</span><br><br>

            ENGINE BUILT WITH<br>
            <span style="color:#557755">THREE.JS &amp; VITE</span><br><br>

            SPECIAL THANKS<br>
            <span style="color:#00ff41;font-size:10px;letter-spacing:2px;">
              JOO CHUNG &amp; THE DR GANG
            </span><br>
            <span style="color:#334433;font-size:8px;">
              FOR KEEPING THE LIGHTS ON AND THE BACKUPS RUNNING
            </span><br><br>

            DEDICATED TO EVERY ENGINEER<br>
            WHO HAS EVER BEEN PAGED AT 3AM<br>
            <span style="color:#334433;font-size:8px;">
              YOUR RTO IS SOMEONE ELSE'S SLA
            </span>
          </div>
        </div>

        <div style="
          font-size:10px;letter-spacing:2px;color:#334433;
          animation:blink 1.2s step-end infinite;
        ">▸ PRESS ENTER TO PLAY AGAIN</div>

        <div style="font-size:8px;color:#1a2a1a;margin-top:6px;letter-spacing:1px;">
          DIFFICULTY: ${diffConfig.label} &nbsp;|&nbsp;
          SECRETS: ${stats.secrets?.found ?? 0}/${stats.secrets?.total ?? 4} &nbsp;|&nbsp;
          TOTAL KILLS: ${saves.getStats().totalKills}
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this._el = el;
    requestAnimationFrame(() => { el.style.opacity = '1'; });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') this._dismiss();
    }, { once: true });

    document.exitPointerLock?.();
  }

  _dismiss() {
    if (!this._el) return;
    this._el.style.opacity = '0';
    setTimeout(() => { this._el?.remove(); location.reload(); }, 600);
  }

  _formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2,'0')}`;
  }
}
