// Ammo type definitions and starting quantities
export const AMMO_TYPES = {
  STORAGE_UNITS:    { name: 'STORAGE',   max: 200, start: 120 }, // Snapshot Pistol
  REPLICA_CHARGES:  { name: 'REPLICA',   max: 50,  start: 24  }, // Replication Shotgun
  BACKUP_CAPACITY:  { name: 'BACKUP',    max: 300, start: 180 }, // Backup Beam (beam ticks)
  FAILOVER_TOKENS:  { name: 'FAILOVER',  max: 20,  start: 8   }, // Failover Launcher
  IMMUTABLE_LOCKS:  { name: 'IMMUTABLE', max: 15,  start: 8   }, // Immutable Railgun
  CDP_POINTS:       { name: 'CDP',       max: 400, start: 180 }, // CDP Chaingun
  BFR_CELLS:        { name: 'BFR',       max: 3,   start: 1   }, // BFR-9000
};

function _normalizeAmmoAmount(type, amount, fallback = 0) {
  if (!(type in AMMO_TYPES)) return null;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(AMMO_TYPES[type].max, Math.floor(numeric)));
}

export class AmmoPool {
  constructor() {
    this.counts = {};
    for (const [key, def] of Object.entries(AMMO_TYPES)) {
      this.counts[key] = def.start;
    }
  }

  get(type) {
    return Number.isFinite(this.counts[type]) ? this.counts[type] : 0;
  }

  consume(type, amount = 1) {
    if (this.counts[type] === undefined) return false;
    if (this.counts[type] < amount) return false;
    this.counts[type] -= amount;
    return true;
  }

  add(type, amount) {
    if (this.counts[type] === undefined) return;
    const normalized = _normalizeAmmoAmount(type, amount, 0);
    if (normalized == null || normalized <= 0) return;
    this.counts[type] = Math.min(AMMO_TYPES[type].max, this.get(type) + normalized);
  }

  set(type, amount) {
    if (this.counts[type] === undefined) return;
    const normalized = _normalizeAmmoAmount(type, amount, this.get(type));
    if (normalized == null) return;
    this.counts[type] = normalized;
  }

  isEmpty(type) {
    return (this.counts[type] ?? 0) <= 0;
  }
}
