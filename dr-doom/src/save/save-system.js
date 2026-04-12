import { AMMO_TYPES } from '../weapons/ammo.js';

// DR DOOM Save System
// DOOM-style: no mid-level saves except boss checkpoints
// Persists: difficulty, level completion, best times, kill counts, secrets found

const SAVE_KEY = 'dr-doom-save';
const VERSION  = '1.5.0';
const VALID_DIFFICULTIES = new Set(['intern', 'sysadmin', 'architect', 'nightmare']);
const VALID_RANKS = new Set(['C', 'B', 'A', 'S']);
const VALID_CHECKPOINT_ARENAS = new Set(['ransomware-king', 'cascade-titan', 'the-audit']);

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

function _toNonNegativeInt(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function _uniqueStrings(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === 'string' && item.length > 0))];
}

function _sanitizeNumberMap(value) {
  const next = {};
  if (!value || typeof value !== 'object') return next;
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof key !== 'string' || key.length === 0) return;
    const numeric = _toNonNegativeInt(entry, -1);
    if (numeric >= 0) next[key] = numeric;
  });
  return next;
}

function _sanitizeRankMap(value) {
  const next = {};
  if (!value || typeof value !== 'object') return next;
  Object.entries(value).forEach(([key, entry]) => {
    if (typeof key !== 'string' || key.length === 0) return;
    if (VALID_RANKS.has(entry)) next[key] = entry;
  });
  return next;
}

function _sanitizeAmmoSnapshot(value) {
  const ammo = {};
  if (!value || typeof value !== 'object') return ammo;

  Object.entries(AMMO_TYPES).forEach(([ammoType, def]) => {
    const numeric = Number(value[ammoType]);
    if (!Number.isFinite(numeric)) return;
    ammo[ammoType] = Math.max(0, Math.min(def.max, Math.floor(numeric)));
  });

  return ammo;
}

function _sanitizeCheckpointPosition(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const z = Number(value.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

function _sanitizeCheckpoint(value) {
  if (!value || typeof value !== 'object') return null;
  if (!VALID_CHECKPOINT_ARENAS.has(value.arenaId)) return null;

  const unlockedSlots = Array.isArray(value.unlockedSlots)
    ? [...new Set(
      value.unlockedSlots
        .map(slot => Number(slot))
        .filter(slot => Number.isInteger(slot) && slot >= 1 && slot <= 7),
    )].sort((a, b) => a - b)
    : [];
  const currentSlot = Number.isInteger(Number(value.currentSlot))
    ? Math.max(1, Math.min(7, Number(value.currentSlot)))
    : 1;

  return {
    arenaId: value.arenaId,
    playerHp: _toNonNegativeInt(value.playerHp, 100),
    playerArmor: _toNonNegativeInt(value.playerArmor, 0),
    ammo: _sanitizeAmmoSnapshot(value.ammo),
    unlockedSlots: unlockedSlots.length > 0 ? unlockedSlots : [1],
    currentSlot,
    position: _sanitizeCheckpointPosition(value.position),
    savedAt: _toNonNegativeInt(value.savedAt, Date.now()),
  };
}

function _cloneCheckpoint(value) {
  if (!value) return null;
  return {
    ...value,
    ammo: { ...value.ammo },
    unlockedSlots: [...value.unlockedSlots],
    position: value.position ? { ...value.position } : null,
  };
}

function _normalizeSaveData(value) {
  if (!value || typeof value !== 'object') return { ...DEFAULTS };
  return {
    version: VERSION,
    difficulty: VALID_DIFFICULTIES.has(value.difficulty) ? value.difficulty : DEFAULTS.difficulty,
    levelsComplete: _uniqueStrings(value.levelsComplete),
    bestTimes: _sanitizeNumberMap(value.bestTimes),
    bestKills: _sanitizeNumberMap(value.bestKills),
    bestRanks: _sanitizeRankMap(value.bestRanks),
    secretsFound: _uniqueStrings(value.secretsFound),
    totalKills: _toNonNegativeInt(value.totalKills, DEFAULTS.totalKills),
    totalPlayTime: _toNonNegativeInt(value.totalPlayTime, DEFAULTS.totalPlayTime),
    checkpoint: _sanitizeCheckpoint(value.checkpoint),
    firstPlay: typeof value.firstPlay === 'boolean' ? value.firstPlay : DEFAULTS.firstPlay,
  };
}

export class SaveSystem {
  constructor() {
    this._data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return _normalizeSaveData(parsed);
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

    this._data.checkpoint = _sanitizeCheckpoint({
      arenaId,
      playerHp:    Math.floor(player.health),
      playerArmor: Math.floor(player.armor),
      ammo: { ...weapons.ammo.counts },
      unlockedSlots: weapons.getUnlockedSlots?.() ?? [1],
      currentSlot: weapons.getSlot?.() ?? 1,
      position: pos,
      savedAt: Date.now(),
    });
    this._save();

    // Show confirmation toast
    this._showToast(`CHECKPOINT SAVED — ${arenaId.toUpperCase()}`);
  }

  getCheckpoint() {
    return _cloneCheckpoint(this._data.checkpoint);
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
