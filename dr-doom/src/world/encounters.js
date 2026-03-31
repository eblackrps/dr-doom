import { EnemySounds } from '../audio/enemies.js';

const ROOM_ZONES = {
  'server-floor': {
    label: 'MAIN SERVER FLOOR',
    hint: 'Snapshot Pistol online. Clear crawlers first, then force the wraiths off their lanes.',
    minX: 1 * 4,  maxX: 12 * 4,
    minZ: 1 * 4,  maxZ: 10 * 4,
  },
  'storage-vault': {
    label: 'STORAGE VAULT',
    hint: 'Replication Shotgun deployed. Use it to thin the leeches before the gremlins can close.',
    minX: 14 * 4, maxX: 27 * 4,
    minZ: 1 * 4,  maxZ: 10 * 4,
  },
  'network-core': {
    label: 'NETWORK CORE',
    hint: 'Immutable Railgun authorized. Phantoms and drift specters fold when you pierce the lane.',
    minX: 1 * 4,  maxX: 11 * 4,
    minZ: 13 * 4, maxZ: 20 * 4,
  },
  'cold-aisle': {
    label: 'COLD AISLE',
    hint: 'Failover Launcher unlocked. Splash clustered threats before they pin you on the raised floor.',
    minX: 13 * 4, maxX: 19 * 4,
    minZ: 13 * 4, maxZ: 20 * 4,
  },
  'management': {
    label: 'MANAGEMENT CONSOLES',
    hint: 'CDP Chaingun spun up. Keep pressure on morphing targets before they flood the room.',
    minX: 21 * 4, maxX: 27 * 4,
    minZ: 13 * 4, maxZ: 20 * 4,
  },
  'exit-corridor': {
    label: 'EMERGENCY EXIT',
    hint: 'Final containment sweep. Clear the corridor and expect a heavy contact at the gate.',
    minX: 9 * 4,  maxX: 18 * 4,
    minZ: 23 * 4, maxZ: 30 * 4,
  },
};

const CONSOLE_PROGRESS = {
  'console-spawn-overview': {
    weapon: {
      slot: 2,
      name: 'REPLICATION SHOTGUN',
      ammoType: 'REPLICA_CHARGES',
      amount: 14,
      reason: 'Storage vault breach confirmed',
    },
    encounter: {
      id: 'storage-vault',
      message: 'STORAGE VAULT BREACH // GREMLINS AND LEECHES RELEASED',
    },
  },
  'console-storage-vault': {
    weapon: {
      slot: 3,
      name: 'BACKUP BEAM',
      ammoType: 'BACKUP_CAPACITY',
      amount: 120,
      reason: 'Incremental restore channel online',
    },
  },
  'console-storage-hardened': {
    weapon: {
      slot: 5,
      name: 'IMMUTABLE RAILGUN',
      ammoType: 'IMMUTABLE_LOCKS',
      amount: 6,
      reason: 'Hardened repository validated',
    },
    encounter: {
      id: 'network-core',
      message: 'NETWORK CORE ALERT // PHANTOM SIGNALS DETECTED',
    },
  },
  'console-network-core': {
    weapon: {
      slot: 4,
      name: 'FAILOVER LAUNCHER',
      ammoType: 'FAILOVER_TOKENS',
      amount: 5,
      reason: 'Spine route restored',
    },
    encounter: {
      id: 'cold-aisle',
      message: 'COLD AISLE BREACH // MIXED CONTACTS ADVANCING',
    },
  },
  'console-cold-aisle': {
    weapon: {
      slot: 6,
      name: 'CDP CHAINGUN',
      ammoType: 'CDP_POINTS',
      amount: 120,
      reason: 'Thermal control stable',
    },
    encounter: {
      id: 'management',
      message: 'MANAGEMENT CORE COMPROMISED // DRIFT SIGNATURES ESCALATING',
    },
  },
};

export class EncounterDirector {
  constructor(enemyManager, weaponSystem) {
    this.enemies = enemyManager;
    this.weapons = weaponSystem;
    this._visitedRooms = new Set();
    this._handledConsoles = new Set();
    this._finalSweepTriggered = false;
  }

  startMission() {
    this.enemies.setAmbientWavesEnabled(false);
    this.enemies.spawnEncounter('server-floor', {
      message: 'MAIN SERVER FLOOR HOT // INITIAL CONTACTS ON YOUR LEVEL',
    });
  }

  handleConsoleAccessed(consoleId) {
    if (this._handledConsoles.has(consoleId)) return;
    this._handledConsoles.add(consoleId);

    const progress = CONSOLE_PROGRESS[consoleId];
    if (!progress) return;

    if (progress.weapon) {
      const unlocked = this.weapons.unlockSlot(progress.weapon.slot, {
        ammoType: progress.weapon.ammoType,
        amount: progress.weapon.amount,
      });
      this._showToast(
        unlocked
          ? `ARSENAL UPGRADE // ${progress.weapon.name} ONLINE`
          : `${progress.weapon.name} RESUPPLIED`,
        '#00ff41',
        progress.weapon.reason,
      );
      EnemySounds.pickupAmmo();
    }

    if (progress.encounter) {
      this.enemies.spawnEncounter(progress.encounter.id, {
        message: progress.encounter.message,
      });
    }
  }

  update(playerPos, objectives) {
    this._showRoomBriefings(playerPos);
    this._triggerFinalSweep(objectives);
  }

  _showRoomBriefings(playerPos) {
    Object.entries(ROOM_ZONES).forEach(([id, zone]) => {
      if (this._visitedRooms.has(id)) return;
      if (!this.enemies.isEncounterSpawned(id)) return;
      if (playerPos.x < zone.minX || playerPos.x > zone.maxX) return;
      if (playerPos.z < zone.minZ || playerPos.z > zone.maxZ) return;

      this._visitedRooms.add(id);
      this._showToast(`${zone.label} // THREAT BRIEF`, '#ffaa00', zone.hint);
    });
  }

  _triggerFinalSweep(objectives) {
    if (this._finalSweepTriggered) return;

    const required = [
      'obj-restore-vms',
      'obj-verify-backups',
      'obj-check-hardened',
      'obj-restore-network',
      'obj-check-env',
      'obj-architect-kb',
    ];

    const completeIds = new Set(
      objectives
        .filter(obj => obj.status === 'complete')
        .map(obj => obj.id),
    );

    if (!required.every(id => completeIds.has(id))) return;

    this._finalSweepTriggered = true;
    this.enemies.spawnEncounter('exit-corridor', {
      message: 'FINAL SWEEP // EXIT CORRIDOR CONTACTS DEPLOYED',
    });
    this._showToast(
      'RUNBOOK UPDATE // FINAL CONTAINMENT SWEEP',
      '#ff8800',
      'All systems restored. Clear the exit corridor before you trigger the boss lockdown.',
    );
  }

  _showToast(title, color = '#ffaa00', detail = '') {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 34%;
      left: 50%;
      transform: translateX(-50%);
      max-width: 420px;
      padding: 12px 16px;
      border: 1px solid ${color}33;
      background: rgba(0, 0, 0, 0.82);
      font-family: 'Courier New', monospace;
      text-align: center;
      pointer-events: none;
      z-index: 120;
      animation: objToast 3.4s forwards;
    `;
    el.innerHTML = `
      <div style="font-size:11px; letter-spacing:3px; color:${color}; text-shadow:0 0 10px ${color};">
        ${title}
      </div>
      ${detail ? `
        <div style="margin-top:6px; font-size:9px; line-height:1.7; letter-spacing:1px; color:#88aa88;">
          ${detail}
        </div>
      ` : ''}
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }
}
