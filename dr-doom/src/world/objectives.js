// Objective system for Level 1
// Objectives are checked each frame against game state

export const OBJ_TYPE = {
  KILL_ALL_IN_ROOM: 'kill_all_in_room',
  ACTIVATE_CONSOLE: 'activate_console',
  SURVIVE_TIMER:    'survive_timer',
  REACH_ZONE:       'reach_zone',
};

export const OBJ_STATUS = {
  LOCKED:    'locked',    // prereq not met
  ACTIVE:    'active',    // available to complete
  COMPLETE:  'complete',
  FAILED:    'failed',
};

// Level 1 objective definitions
export const LEVEL1_OBJECTIVES = [
  {
    id: 'obj-restore-vms',
    label: 'RESTORE VM INFRASTRUCTURE',
    detail: 'Access the System Status console on the Main Server Floor',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-spawn-overview',
    prereqs: [],
  },
  {
    id: 'obj-verify-backups',
    label: 'VERIFY BACKUP CHAIN',
    detail: 'Access Backup Chain Status in the Storage Vault',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-storage-vault',
    prereqs: ['obj-restore-vms'],
  },
  {
    id: 'obj-check-hardened',
    label: 'CONFIRM HARDENED REPO',
    detail: 'Verify immutable backup target configuration',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-storage-hardened',
    prereqs: ['obj-restore-vms'],
  },
  {
    id: 'obj-restore-network',
    label: 'RESTORE NETWORK SPINE',
    detail: 'Access Network Topology console in the Network Core',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-network-core',
    prereqs: ['obj-check-hardened'],
  },
  {
    id: 'obj-check-env',
    label: 'CHECK ENVIRONMENTAL SYSTEMS',
    detail: 'Review Cold Aisle environmental monitoring',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-cold-aisle',
    prereqs: ['obj-restore-network'],
  },
  {
    id: 'obj-architect-kb',
    label: 'SYNC FIELD MANUAL',
    detail: 'Authenticate with AnyStack Architect knowledge base',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-architect-kb',
    prereqs: ['obj-check-env'],
  },
  {
    id: 'obj-clear-threats',
    label: 'COMPLETE FINAL CONTAINMENT SWEEP',
    detail: 'Clear the Emergency Exit corridor before you authorize the catacomb breach',
    type: OBJ_TYPE.KILL_ALL_IN_ROOM,
    navPoint: { x: 13.5 * 4, z: 26.5 * 4 },
    prereqs: [
      'obj-restore-vms',
      'obj-verify-backups',
      'obj-check-hardened',
      'obj-restore-network',
      'obj-check-env',
      'obj-architect-kb',
    ],
  },
  {
    id: 'obj-exit',
    label: 'AUTHORIZE CATACOMB DESCENT',
    detail: 'Access the Emergency Exit transfer console to trigger the first boss lockdown',
    type: OBJ_TYPE.ACTIVATE_CONSOLE,
    consoleId: 'console-exit-gate',
    requiresActiveAccess: true,
    prereqs: ['obj-clear-threats'],
  },
];

export class ObjectiveSystem {
  constructor() {
    this._objectives = LEVEL1_OBJECTIVES.map(def => ({
      ...def,
      status: def.prereqs.length === 0 ? OBJ_STATUS.ACTIVE : OBJ_STATUS.LOCKED,
      runtimeDetail: '',
      _accessedWhileActive: false,
    }));

    this._completedConsoles = new Set();
    this._onComplete = null; // callback when all complete
    this._onExitReached = null;
    this.levelComplete = false;
  }

  onLevelComplete(fn) { this._onComplete = fn; }
  onExitReached(fn)   { this._onExitReached = fn; }

  restoreBossCheckpoint() {
    this._objectives.forEach(obj => {
      obj.status = OBJ_STATUS.COMPLETE;
      obj.runtimeDetail = '';
      obj._accessedWhileActive = true;
    });
    this.levelComplete = true;
  }

  // Called when player accesses a console
  notifyConsoleAccessed(consoleId) {
    this._completedConsoles.add(consoleId);
    this._objectives.forEach(obj => {
      if (obj.type === OBJ_TYPE.ACTIVATE_CONSOLE && obj.consoleId === consoleId && obj.status === OBJ_STATUS.ACTIVE) {
        obj._accessedWhileActive = true;
      }
    });
  }

  update(playerPos, enemies) {
    if (this.levelComplete) return;

    for (const obj of this._objectives) {
      if (obj.status === OBJ_STATUS.COMPLETE) continue;

      // Check prereqs
      if (obj.status === OBJ_STATUS.LOCKED) {
        const allMet = obj.prereqs.every(pid =>
          this._objectives.find(o => o.id === pid)?.status === OBJ_STATUS.COMPLETE
        );
        if (allMet) {
          obj.status = OBJ_STATUS.ACTIVE;
          obj.runtimeDetail = obj.detail;
        }
        else continue;
      }

      // Evaluate
      if (obj.status === OBJ_STATUS.ACTIVE) {
        if (this._evaluate(obj, playerPos, enemies)) {
          obj.status = OBJ_STATUS.COMPLETE;
          this._onObjectiveComplete(obj);
        }
      }
    }

    // Check if all non-exit objectives complete — unlock exit
    const allCoreComplete = this._objectives
      .filter(o => o.id !== 'obj-exit')
      .every(o => o.status === OBJ_STATUS.COMPLETE);

    const exitObj = this._objectives.find(o => o.id === 'obj-exit');
    if (allCoreComplete && exitObj && exitObj.status === OBJ_STATUS.LOCKED) {
      exitObj.status = OBJ_STATUS.ACTIVE;
    }

    // Check exit objective
    if (exitObj?.status === OBJ_STATUS.ACTIVE) {
      if (this._evaluate(exitObj, playerPos, enemies)) {
        exitObj.status = OBJ_STATUS.COMPLETE;
        this.levelComplete = true;
        this._onExitReached?.();
        this._onComplete?.();
      }
    }
  }

  _evaluate(obj, playerPos, enemies) {
    switch (obj.type) {
      case OBJ_TYPE.ACTIVATE_CONSOLE:
        obj.runtimeDetail = obj.detail;
        if (obj.requiresActiveAccess) {
          return obj._accessedWhileActive;
        }
        return this._completedConsoles.has(obj.consoleId);

      case OBJ_TYPE.KILL_ALL_IN_ROOM: {
        const remaining = enemies.filter(e => !e.isDead).length;
        obj.runtimeDetail = remaining > 0
          ? `${obj.detail} // ${remaining} HOSTILES REMAINING`
          : `${obj.detail} // CORRIDOR SECURE`;
        return remaining === 0;
      }

      case OBJ_TYPE.REACH_ZONE: {
        const z = obj.zone;
        obj.runtimeDetail = obj.detail;
        return playerPos.x >= z.minX && playerPos.x <= z.maxX &&
               playerPos.z >= z.minZ && playerPos.z <= z.maxZ;
      }

      default: return false;
    }
  }

  _onObjectiveComplete(obj) {
    this._showCompletionToast(obj.label);
  }

  _showCompletionToast(label) {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 2px;
      color: #ffaa00;
      text-shadow: 0 0 10px #ffaa00;
      pointer-events: none;
      white-space: nowrap;
      animation: objToast 2.5s forwards;
    `;
    el.textContent = `✓ ${label}`;

    if (!document.getElementById('obj-toast-style')) {
      const s = document.createElement('style');
      s.id = 'obj-toast-style';
      s.textContent = `
        @keyframes objToast {
          0%   { opacity:0; transform: translateX(-50%) translateY(-8px); }
          12%  { opacity:1; transform: translateX(-50%) translateY(0); }
          75%  { opacity:1; }
          100% { opacity:0; }
        }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  getObjectives() { return this._objectives; }

  getCompletionFraction() {
    const total = this._objectives.length;
    const done  = this._objectives.filter(o => o.status === OBJ_STATUS.COMPLETE).length;
    return done / total;
  }

  isObjectiveActive(id) {
    return this._objectives.find(obj => obj.id === id)?.status === OBJ_STATUS.ACTIVE;
  }

  getPrimaryObjective() {
    const active = this._objectives.find(obj => obj.status === OBJ_STATUS.ACTIVE);
    if (active) return active;
    return this._objectives.find(obj => obj.status !== OBJ_STATUS.COMPLETE) ?? null;
  }

  getNavigationTarget() {
    const active = this.getPrimaryObjective();
    if (!active) return null;
    if (active.consoleId) {
      return { consoleId: active.consoleId, label: active.label };
    }
    if (active.navPoint) {
      return { position: { ...active.navPoint }, label: active.label };
    }
    if (active.zone) {
      return {
        position: {
          x: (active.zone.minX + active.zone.maxX) / 2,
          z: (active.zone.minZ + active.zone.maxZ) / 2,
        },
        label: active.label,
      };
    }
    return null;
  }
}
