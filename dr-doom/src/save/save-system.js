// DR DOOM Save System
// DOOM-style: no mid-level saves except boss checkpoints
// Persists: difficulty, level completion, best times, kill counts, secrets found

const SAVE_KEY = 'dr-doom-save';
const VERSION  = '1.4.0';

const DEFAULTS = {
  version:      VERSION,
  difficulty:   'sysadmin',
  levelsComplete: [],
  bestTimes:    {},      // levelId -> seconds
  bestKills:    {},      // levelId -> count
  bestRanks:    {},      // levelId -> grade
  secretsFound: [],      // secret IDs
  totalKills:   0,
  totalPlayTime: 0,
  checkpoint:   null,    // { levelId, arenaId, playerHp, playerArmor, ammo }
  firstPlay:    true,
};

export class SaveSystem {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields in updates
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  _save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn('DR DOOM: Save failed', e);
    }
  }

  // ---- Difficulty ----

  getDifficulty() { return this._data.difficulty; }

  setDifficulty(diff) {
    const valid = ['intern', 'sysadmin', 'architect', 'nightmare'];
    if (!valid.includes(diff)) return;
    this._data.difficulty = diff;
    this._save();
  }

  getDifficultyConfig() {
    return DIFFICULTY_CONFIGS[this._data.difficulty] ?? DIFFICULTY_CONFIGS.sysadmin;
  }

  // ---- Level completion ----

  completeLevel(levelId, stats) {
    if (!this._data.levelsComplete.includes(levelId)) {
      this._data.levelsComplete.push(levelId);
    }

    // Best time
    const prev = this._data.bestTimes[levelId] ?? Infinity;
    if (stats.elapsed < prev) {
      this._data.bestTimes[levelId] = Math.floor(stats.elapsed);
    }

    // Best kills
    const prevK = this._data.bestKills[levelId] ?? 0;
    if (stats.kills > prevK) {
      this._data.bestKills[levelId] = stats.kills;
    }

    const prevRank = this._data.bestRanks[levelId] ?? null;
    if (!prevRank || _rankScore(stats.rank) > _rankScore(prevRank)) {
      this._data.bestRanks[levelId] = stats.rank;
    }

    this._data.totalKills    += stats.kills;
    this._data.totalPlayTime += Math.floor(stats.elapsed);
    this._data.firstPlay      = false;
    this._data.checkpoint     = null; // clear checkpoint on completion
    this._save();
  }

  isLevelComplete(levelId) {
    return this._data.levelsComplete.includes(levelId);
  }

  getBestTime(levelId) {
    const t = this._data.bestTimes[levelId];
    if (t == null) return null;
    const m = Math.floor(t / 60);
    const s = (t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  getBestRank(levelId) {
    return this._data.bestRanks[levelId] ?? null;
  }

  // ---- Boss checkpoints ----

  saveCheckpoint(arenaId, player, weapons, checkpointPosition = null) {
    const pos = checkpointPosition ?? {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };

    this._data.checkpoint = {
      arenaId,
      playerHp:    Math.floor(player.health),
      playerArmor: Math.floor(player.armor),
      ammo: { ...weapons.ammo.counts },
      unlockedSlots: weapons.getUnlockedSlots?.() ?? [1],
      position: pos,
      savedAt: Date.now(),
    };
    this._save();

    // Show confirmation toast
    this._showToast(`CHECKPOINT SAVED — ${arenaId.toUpperCase()}`);
  }

  getCheckpoint() {
    return this._data.checkpoint;
  }

  clearCheckpoint() {
    this._data.checkpoint = null;
    this._save();
  }

  hasCheckpoint() {
    return !!this._data.checkpoint;
  }

  // ---- Secrets ----

  findSecret(secretId) {
    if (this._data.secretsFound.includes(secretId)) return false;
    this._data.secretsFound.push(secretId);
    this._save();
    return true; // true = first time finding it
  }

  isSecretFound(secretId) {
    return this._data.secretsFound.includes(secretId);
  }

  getSecretCount() {
    return this._data.secretsFound.length;
  }

  // ---- Stats ----

  getStats() {
    return {
      difficulty:   this._data.difficulty,
      totalKills:   this._data.totalKills,
      totalPlayTime: this._data.totalPlayTime,
      secretsFound: this._data.secretsFound.length,
      levelsComplete: this._data.levelsComplete.length,
    };
  }

  isFirstPlay() { return this._data.firstPlay; }

  // ---- Reset ----

  reset() {
    this._data = { ...DEFAULTS };
    this._save();
  }

  _showToast(msg) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:160px; left:50%; transform:translateX(-50%);
      font-family:'Courier New',monospace; font-size:10px; letter-spacing:2px;
      color:#ffaa00; text-shadow:0 0 8px #ffaa00;
      pointer-events:none; white-space:nowrap;
      animation:objToast 2.5s forwards;
    `;
    el.textContent = `💾 ${msg}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
}

// ---- Difficulty configurations ----

export const DIFFICULTY_CONFIGS = {
  intern: {
    label:                  'INTERN',
    description:            'Learning the runbook. Enemies deal less damage, more health drops.',
    enemyDamageMult:        0.6,
    enemySpeedMult:         0.8,
    healthDropMult:         1.5,
    armorDropMult:          1.5,
    rtoMultiplier:          1.5,
    playerDamageReceiveMult: 0.75,  // player takes 25% less damage
    bossHealthMult:         0.9,
    bossDamageMult:         0.85,
    bossSpeedMult:          0.9,
    color:                  '#00ff41',
  },
  sysadmin: {
    label:                  'SYSADMIN',
    description:            'Standard DR exercise. Balanced.',
    enemyDamageMult:        1.0,
    enemySpeedMult:         1.0,
    healthDropMult:         1.0,
    armorDropMult:          1.0,
    rtoMultiplier:          1.0,
    playerDamageReceiveMult: 1.0,
    bossHealthMult:         1.0,
    bossDamageMult:         1.0,
    bossSpeedMult:          1.0,
    color:                  '#ffaa00',
  },
  architect: {
    label:                  'ARCHITECT',
    description:            'You designed the system. You know where it fails.',
    enemyDamageMult:        1.4,
    enemySpeedMult:         1.2,
    healthDropMult:         0.75,
    armorDropMult:          0.75,
    rtoMultiplier:          0.8,
    playerDamageReceiveMult: 1.15,  // player takes 15% more damage
    bossHealthMult:         1.1,
    bossDamageMult:         1.15,
    bossSpeedMult:          1.1,
    color:                  '#ff8800',
  },
  nightmare: {
    label:                  'NIGHTMARE ON-CALL',
    description:            'No armor drops. Faster enemies. Shorter RTO. You are on your own.',
    enemyDamageMult:        1.8,
    enemySpeedMult:         1.4,
    healthDropMult:         0.5,
    armorDropMult:          0,
    rtoMultiplier:          0.6,
    playerDamageReceiveMult: 1.25,  // player takes 25% more damage
    bossHealthMult:         1.2,
    bossDamageMult:         1.25,
    bossSpeedMult:          1.2,
    color:                  '#ff2200',
  },
};

function _rankScore(rank) {
  return {
    C: 1,
    B: 2,
    A: 3,
    S: 4,
  }[rank] ?? 0;
}

// Singleton
export const saves = new SaveSystem();
