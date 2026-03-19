// Ammo type definitions and starting quantities
export const AMMO_TYPES = {
  STORAGE_UNITS:    { name: 'STORAGE',   max: 200, start: 200 }, // Snapshot Pistol
  REPLICA_CHARGES:  { name: 'REPLICA',   max: 50,  start: 50  }, // Replication Shotgun
  BACKUP_CAPACITY:  { name: 'BACKUP',    max: 300, start: 300 }, // Backup Beam (beam ticks)
  FAILOVER_TOKENS:  { name: 'FAILOVER',  max: 20,  start: 20  }, // Failover Launcher
  IMMUTABLE_LOCKS:  { name: 'IMMUTABLE', max: 15,  start: 15  }, // Immutable Railgun
  CDP_POINTS:       { name: 'CDP',       max: 400, start: 400 }, // CDP Chaingun
  BFR_CELLS:        { name: 'BFR',       max: 3,   start: 3   }, // BFR-9000
};

export class AmmoPool {
  constructor() {
    this.counts = {};
    for (const [key, def] of Object.entries(AMMO_TYPES)) {
      this.counts[key] = def.start;
    }
  }

  get(type) {
    return this.counts[type] ?? 0;
  }

  consume(type, amount = 1) {
    if (this.counts[type] === undefined) return false;
    if (this.counts[type] < amount) return false;
    this.counts[type] -= amount;
    return true;
  }

  add(type, amount) {
    if (this.counts[type] === undefined) return;
    this.counts[type] = Math.min(AMMO_TYPES[type].max, this.counts[type] + amount);
  }

  isEmpty(type) {
    return (this.counts[type] ?? 0) <= 0;
  }
}
