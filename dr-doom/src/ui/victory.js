import { saves } from '../save/save-system.js';

const PAR_TIMES = {
  intern: 14 * 60,
  sysadmin: 12 * 60,
  architect: 10 * 60,
  nightmare: 9 * 60,
};

const DIFF_BONUS = {
  intern: 0,
  sysadmin: 4,
  architect: 8,
  nightmare: 12,
};

const RANK_SCORE = {
  C: 1,
  B: 2,
  A: 3,
  S: 4,
};

export class VictoryScreen {
  constructor() {
    this._el = null;
    this._visible = false;
  }

  show(stats) {
    if (this._visible) return;
    this._visible = true;

    const diffId = saves.getDifficulty();
    const diffConfig = saves.getDifficultyConfig();
    const parTime = PAR_TIMES[diffId] ?? PAR_TIMES.sysadmin;
    const evaluation = this._evaluateRun(stats, diffId, parTime);
    const runStats = {
      ...stats,
      rank: evaluation.rank,
      medals: evaluation.medals,
      parTime,
    };

    const previousBestRank = saves.getBestRank('level-01');
    const previousBestTime = saves.getBestTime('level-01');
    saves.completeLevel('level-01', runStats);

    const bestTime = saves.getBestTime('level-01');
    const bestRank = saves.getBestRank('level-01');
    const secretPct = stats.secrets?.total
      ? Math.floor((stats.secrets.found / stats.secrets.total) * 100)
      : 0;
    const objectivePct = stats.objectives.length
      ? Math.floor((stats.objectives.filter((objective) => objective.complete).length / stats.objectives.length) * 100)
      : 0;
    const isNewBestRank = !previousBestRank || RANK_SCORE[bestRank] > RANK_SCORE[previousBestRank];
    const isNewBestTime = previousBestTime !== bestTime && bestTime === this._formatTime(stats.elapsed);

    const el = document.createElement('div');
    el.id = 'victory-screen';
    el.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.94);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 500;
      font-family: 'Courier New', monospace;
      color: #00ff41;
      opacity: 0;
      transition: opacity 0.8s;
      overflow-y: auto;
      padding: 24px;
      cursor: pointer;
    `;

    el.innerHTML = `
      <div style="
        border:1px solid #00ff41;
        box-shadow:0 0 40px #00ff4133;
        background:linear-gradient(180deg, rgba(2,10,5,0.98) 0%, rgba(1,3,2,0.98) 100%);
        padding:34px 40px;
        max-width:760px;
        width:min(94vw, 760px);
        text-align:center;
      ">
        <div style="font-size:9px;letter-spacing:4px;color:#555;margin-bottom:6px;">
          MISSION DEBRIEF // LEVEL 01 // ${diffConfig.label}
        </div>

        <div style="
          font-size:clamp(22px,3vw,32px);
          font-weight:bold;
          letter-spacing:6px;
          color:#00ff41;
          text-shadow:0 0 20px #00ff41;
          margin-bottom:4px;
        ">RECOVERY COMPLETE</div>

        <div style="font-size:10px;letter-spacing:3px;color:#ffaa00;margin-bottom:26px;">
          RTO MET — INFRASTRUCTURE RESTORED
        </div>

        <div style="
          display:grid;
          grid-template-columns:minmax(0, 1fr) 170px;
          gap:16px;
          align-items:stretch;
          margin-bottom:22px;
        ">
          <div style="
            border:1px solid #00ff4122;
            padding:16px 18px;
            display:grid;
            grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));
            gap:12px;
          ">
            ${[
              ['TIME', this._formatTime(stats.elapsed), '#ffaa00'],
              ['PAR', this._formatTime(parTime), '#556655'],
              ['KILLS', `${stats.kills}`, '#ff4400'],
              ['UPTIME', `${Math.floor(stats.health)}%`, '#00ff41'],
              ['SECRETS', `${secretPct}%`, '#00c2ff'],
              ['RUNBOOK', `${objectivePct}%`, '#88ff88'],
            ].map(([label, value, color]) => `
              <div style="text-align:center;">
                <div style="font-size:8px;letter-spacing:2px;color:#555;margin-bottom:4px;">${label}</div>
                <div style="font-size:clamp(15px,2.2vw,24px);font-weight:bold;color:${color};text-shadow:0 0 10px ${color}33;">${value}</div>
              </div>
            `).join('')}
          </div>

          <div style="
            border:1px solid ${this._rankColor(evaluation.rank)}44;
            background:${this._rankColor(evaluation.rank)}11;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            padding:16px 12px;
          ">
            <div style="font-size:8px;letter-spacing:3px;color:#556655;margin-bottom:8px;">RUN RANK</div>
            <div style="font-size:56px;line-height:1;color:${this._rankColor(evaluation.rank)};text-shadow:0 0 18px ${this._rankColor(evaluation.rank)}88;">${evaluation.rank}</div>
            <div style="margin-top:10px;font-size:8px;letter-spacing:2px;color:#6e8b6e;">${evaluation.summary}</div>
          </div>
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));
          gap:12px;
          margin-bottom:20px;
        ">
          <div style="border:1px solid #102316;background:rgba(0,0,0,0.35);padding:12px;text-align:left;">
            <div style="font-size:8px;letter-spacing:2px;color:#445544;margin-bottom:6px;">CAREER BESTS</div>
            <div style="font-size:10px;line-height:1.9;color:#7fa07f;">
              BEST TIME: <span style="color:${isNewBestTime ? '#00ff41' : '#ffaa00'};">${bestTime ?? '--:--'}${isNewBestTime ? ' NEW' : ''}</span><br>
              BEST RANK: <span style="color:${isNewBestRank ? '#00ff41' : this._rankColor(bestRank ?? 'C')};">${bestRank ?? '--'}${isNewBestRank ? ' NEW' : ''}</span><br>
              TOTAL KILLS: <span style="color:#ff8800;">${saves.getStats().totalKills}</span>
            </div>
          </div>
          <div style="border:1px solid #102316;background:rgba(0,0,0,0.35);padding:12px;text-align:left;">
            <div style="font-size:8px;letter-spacing:2px;color:#445544;margin-bottom:6px;">COMMENDATIONS</div>
            <div style="font-size:9px;line-height:1.9;color:#7fa07f;">
              ${evaluation.medals.length > 0
                ? evaluation.medals.map((medal) => `<div>✓ <span style="color:#00ff41;">${medal}</span></div>`).join('')
                : '<div>No commendations awarded this run.</div>'}
            </div>
          </div>
        </div>

        <div style="text-align:left;margin-bottom:20px;">
          <div style="font-size:8px;letter-spacing:2px;color:#445544;margin-bottom:8px;">DR RUNBOOK STATUS</div>
          ${stats.objectives.map((objective) => `
            <div style="font-size:9px;letter-spacing:1px;color:${objective.complete ? '#00ff41' : '#553333'};padding:2px 0;">
              ${objective.complete ? '✓' : '✗'} ${objective.label}
            </div>
          `).join('')}
        </div>

        <div style="
          background:#0a1a0e;
          border:1px solid #00ff4122;
          padding:12px 16px;
          margin-bottom:22px;
          text-align:left;
        ">
          <div style="font-size:8px;letter-spacing:2px;color:#ffaa00;margin-bottom:6px;">FIELD MANUAL</div>
          <div style="font-size:9px;color:#446644;line-height:1.8;">
            The DR procedures in this game reflect real-world infrastructure architecture.<br>
            Read the full runbook, Veeam guides, and VMware architecture at:<br>
            <span style="color:#00ff41;letter-spacing:1px;">anystackarchitect.com</span>
          </div>
        </div>

        <div style="
          border-top:1px solid #0a1a0a;
          padding-top:18px;
          text-align:center;
        ">
          <div style="font-size:8px;letter-spacing:3px;color:#334433;margin-bottom:10px;">CREDITS</div>
          <div style="font-size:9px;color:#334433;line-height:2.2;letter-spacing:1px;">
            CONCEPT, DESIGN &amp; DR CONTENT<br>
            <span style="color:#557755">ERIC // ANYSTACKARCHITECT.COM</span><br><br>
            ENGINE BUILT WITH THREE.JS &amp; VITE<br>
            <span style="color:#00ff41;">JOO CHUNG &amp; THE DR GANG</span>
          </div>
        </div>

        <div style="margin-top:22px;font-size:10px;letter-spacing:2px;color:#334433;animation:blink 1.2s step-end infinite;">
          ▸ PRESS ENTER OR CLICK TO RUN IT BACK
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this._el = el;
    requestAnimationFrame(() => { el.style.opacity = '1'; });

    const dismiss = (e) => {
      if (e && e.type === 'keydown' && !['Enter', 'Space'].includes(e.code)) return;
      window.removeEventListener('keydown', dismiss);
      this._dismiss();
    };

    window.addEventListener('keydown', dismiss);
    el.addEventListener('click', dismiss, { once: true });
    document.exitPointerLock?.();
  }

  _evaluateRun(stats, diffId, parTime) {
    const objectiveFraction = stats.objectives.length
      ? stats.objectives.filter((objective) => objective.complete).length / stats.objectives.length
      : 1;
    const secretFraction = stats.secrets?.total
      ? stats.secrets.found / stats.secrets.total
      : 0;
    const healthFraction = Math.max(0, Math.min(1, stats.health / 100));
    const timeBonus = stats.elapsed <= parTime
      ? 1
      : Math.max(0, 1 - ((stats.elapsed - parTime) / parTime));

    const score =
      objectiveFraction * 38 +
      secretFraction * 18 +
      healthFraction * 20 +
      timeBonus * 12 +
      (DIFF_BONUS[diffId] ?? 0);

    const rank = score >= 86 ? 'S' : score >= 74 ? 'A' : score >= 60 ? 'B' : 'C';

    const medals = [];
    if (objectiveFraction === 1) medals.push('RUNBOOK COMPLETE');
    if ((stats.secrets?.total ?? 0) > 0 && stats.secrets.found === stats.secrets.total) medals.push('SECRET HUNTER');
    if (stats.elapsed <= parTime) medals.push('PAR CLEAR');
    if (diffId === 'nightmare' && stats.health >= 40) medals.push('NIGHT WATCH');

    return {
      score,
      rank,
      medals,
      summary: rank === 'S'
        ? 'EXEMPLARY'
        : rank === 'A'
          ? 'CERTIFIED'
          : rank === 'B'
            ? 'STABLE'
            : 'RECOVERED',
    };
  }

  _rankColor(rank) {
    return {
      S: '#00ff41',
      A: '#88ff44',
      B: '#ffaa00',
      C: '#ff6600',
    }[rank] ?? '#556655';
  }

  _dismiss() {
    if (!this._el) return;
    this._el.style.opacity = '0';
    setTimeout(() => {
      this._el?.remove();
      location.reload();
    }, 600);
  }

  _formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  }
}
