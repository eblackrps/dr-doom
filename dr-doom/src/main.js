import { Renderer }          from './engine/renderer.js';
import { GameLoop }          from './engine/gameloop.js';
import { InputHandler }      from './engine/input.js';
import { InteractionSystem } from './engine/interaction.js';
import { Player }            from './entities/player.js';
import { EnemyManager }      from './entities/enemy-manager.js';
import { Level }             from './world/level.js';
import { WeaponSystem }      from './weapons/weapon-system.js';
import { HazardSystem }      from './world/hazards.js';
import { ObjectiveSystem }   from './world/objectives.js';
import { SecretManager }     from './world/secrets.js';
import { HUD }               from './ui/hud.js';
import { ConsoleUI }         from './ui/console-ui.js';
import { ObjectiveHUD }      from './ui/objective-hud.js';
import { BossHUD }           from './ui/boss-hud.js';
import { VictoryScreen }     from './ui/victory.js';
import { TitleScreen }       from './ui/title-screen.js';
import { PauseMenu }         from './ui/pause-menu.js';
import { Minimap }           from './ui/minimap.js';
import { RansomwareKingArena, CascadeTitanArena, AuditArena, BOSS_ARENA_LAYOUTS } from './world/boss-arenas.js';
import { boot }              from './ui/boot.js';
import { audio }             from './audio/engine.js';
import { AmbientAudio }      from './audio/ambient.js';
import { MusicSystem }       from './audio/music.js';
import { WeaponSounds }      from './audio/weapons.js';
import { EnemySounds }       from './audio/enemies.js';
import { saves }             from './save/save-system.js';
import { loadGameplaySettings } from './settings/gameplay-settings.js';
import { EncounterDirector } from './world/encounters.js';

const ALL_WEAPON_SLOTS = [1, 2, 3, 4, 5, 6, 7];

const STARTING_ARSENAL = {
  health: 100,
  armor: 30,
  currentSlot: 1,
  ammo: {
    STORAGE_UNITS: 120,
    REPLICA_CHARGES: 24,
    BACKUP_CAPACITY: 180,
    FAILOVER_TOKENS: 8,
    IMMUTABLE_LOCKS: 8,
    CDP_POINTS: 180,
    BFR_CELLS: 1,
  },
  toast: 'ARSENAL SYNC // FULL LOADOUT ONLINE',
};

const RUNBOOK_DOOR_UNLOCKS = {
  'console-spawn-overview': {
    doorId: 'door-ab',
    toast: 'VAULT ACCESS UNSEALED',
  },
  'console-storage-hardened': {
    doorId: 'door-ac',
    toast: 'NETWORK CORE ROUTE OPEN',
  },
  'console-network-core': {
    doorId: 'door-cd',
    toast: 'COLD AISLE CONTAINMENT RELEASED',
  },
  'console-cold-aisle': {
    doorId: 'door-be',
    toast: 'MANAGEMENT ACCESS AUTHORIZED',
  },
  'console-architect-kb': {
    doorId: 'door-df',
    toast: 'EMERGENCY EXIT UNSEALED',
  },
};

const BOSS_LOADOUTS = {
  'ransomware-king': {
    health: 80,
    armor: 55,
    unlockSlots: ALL_WEAPON_SLOTS,
    ammo: {
      REPLICA_CHARGES: 18,
      FAILOVER_TOKENS: 5,
      IMMUTABLE_LOCKS: 5,
    },
    toast: 'BOSS LOADOUT SYNC // DECRYPTION PACKAGE READY',
  },
  'cascade-titan': {
    health: 95,
    armor: 75,
    unlockSlots: ALL_WEAPON_SLOTS,
    ammo: {
      REPLICA_CHARGES: 20,
      BACKUP_CAPACITY: 160,
      FAILOVER_TOKENS: 8,
      IMMUTABLE_LOCKS: 8,
      CDP_POINTS: 180,
    },
    toast: 'BOSS LOADOUT SYNC // CASCADE RESPONSE KIT READY',
  },
  'the-audit': {
    health: 100,
    armor: 85,
    unlockSlots: ALL_WEAPON_SLOTS,
    ammo: {
      REPLICA_CHARGES: 24,
      BACKUP_CAPACITY: 180,
      FAILOVER_TOKENS: 10,
      IMMUTABLE_LOCKS: 9,
      CDP_POINTS: 220,
      BFR_CELLS: 1,
    },
    toast: 'BOSS LOADOUT SYNC // CERTIFICATION PACKAGE READY',
  },
};

// Touch device gate — must run before anything else.
// Pointer lock + keyboard + mouse are required; touch-only devices cannot play.
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (isTouchDevice) {
  const gate       = document.getElementById('mobile-gate');
  const bootScreen = document.getElementById('boot-screen');
  if (gate)       gate.style.display       = 'flex';
  if (bootScreen) bootScreen.style.display = 'none';
  // Stop — do not initialize the game on touch devices
} else {
  // Normal desktop path
  const title = new TitleScreen();
  title.show().then((selection) => {
    if (selection === 'new-run') {
      saves.clearCheckpoint();
    }
    boot().then(() => launchGame(selection));
  });
}

function launchGame(startMode = 'resume') {
  const canvas          = document.getElementById('game-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const hudEl           = document.getElementById('hud');
  const lockPrompt      = document.getElementById('lock-prompt');

  canvasContainer.style.display = 'block';
  hudEl.style.display = 'block';
  lockPrompt.style.display = 'flex';

  const diff = saves.getDifficultyConfig();
  const gameplaySettings = loadGameplaySettings();

  const renderer    = new Renderer(canvas, gameplaySettings);
  const input       = new InputHandler(canvas, lockPrompt);
  const consoleUI   = new ConsoleUI();
  // consoleUI passed explicitly — no window global needed
  const interaction = new InteractionSystem(renderer.camera, renderer.scene, consoleUI);
  const level       = new Level(renderer.scene, interaction);
  const player      = new Player(renderer.camera, input, gameplaySettings);
  const weapons     = new WeaponSystem(renderer.weaponScene, renderer.scene);
  const enemies     = new EnemyManager(renderer.scene, weapons);
  const hazards     = new HazardSystem(renderer.scene);
  const objectives  = new ObjectiveSystem();
  const secrets     = new SecretManager(renderer.scene, interaction, saves, consoleUI);
  const objHUD      = new ObjectiveHUD();
  const bossHUD     = new BossHUD();
  const victory     = new VictoryScreen();
  const hud         = new HUD();
  const pauseMenu   = new PauseMenu(input, null, { renderer, player });
  const minimap     = new Minimap(level._map ?? null);
  const ambient     = new AmbientAudio();
  const music       = new MusicSystem();
  const encounters  = new EncounterDirector(enemies, weapons);

  // Boss arenas
  const sharedSolid = [];
  const rkArena     = new RansomwareKingArena(renderer.scene, interaction, sharedSolid);
  const ctArena     = new CascadeTitanArena(renderer.scene, interaction, sharedSolid);
  const auditArena  = new AuditArena(renderer.scene, interaction, sharedSolid);
  let gameElapsed = 0, totalKills = 0, levelDone = false, gameOver = false;

  // Patch level collision to include arena walls
  const origCollide = level.collidesAABB.bind(level);
  level.collidesAABB = (pos, radius, height) => {
    if (origCollide(pos, radius, height)) return true;
    const minX=pos.x-radius, maxX=pos.x+radius;
    const minY=pos.y-height, maxY=pos.y;
    const minZ=pos.z-radius, maxZ=pos.z+radius;
    for (const c of sharedSolid) {
      if (maxX>c.minX && minX<c.maxX &&
          maxY>c.minY && minY<c.maxY &&
          maxZ>c.minZ && minZ<c.maxZ) return true;
    }
    return false;
  };

  const origHasLOS = level.hasLOS.bind(level);
  level.hasLOS = (from, to) => {
    if (!origHasLOS(from, to)) return false;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.001) return true;
    const nx = dx / dist;
    const nz = dz / dist;
    for (let d = 1.0; d < dist - 0.5; d += 1.0) {
      const tx = from.x + nx * d;
      const tz = from.z + nz * d;
      for (const cell of sharedSolid) {
        if (tx > cell.minX && tx < cell.maxX &&
            1.0 > cell.minY && 1.0 < cell.maxY &&
            tz > cell.minZ && tz < cell.maxZ) return false;
      }
    }
    return true;
  };

  // Apply difficulty after spawnAll, exactly once
  let difficultyApplied = false;
  const origSpawn = enemies.spawnAll.bind(enemies);
  enemies.spawnAll = () => {
    origSpawn();
    if (!difficultyApplied) {
      difficultyApplied = true;
      enemies.getAllEnemyEntities().forEach(e => {
        e.speed  *= diff.enemySpeedMult;
        e.damage *= diff.enemyDamageMult;
      });
    }
  };

  // Apply difficulty to Audit RTO
  if (auditArena.boss) {
    auditArena.boss.rtoTimer *= diff.rtoMultiplier;
    auditArena.boss.tasks.forEach(t => { t.timeLimit *= diff.rtoMultiplier; });
    auditArena.boss._taskTimer = auditArena.boss.tasks[0]?.timeLimit ?? auditArena.boss._taskTimer;
  }

  const applyBossDifficulty = (boss) => {
    if (!boss) return;
    boss.maxHealth = Math.round(boss.maxHealth * (diff.bossHealthMult ?? 1));
    boss.health = boss.maxHealth;
    boss.damage *= diff.bossDamageMult ?? 1;
    boss.speed *= diff.bossSpeedMult ?? diff.enemySpeedMult;
  };

  applyBossDifficulty(rkArena.boss);
  applyBossDifficulty(ctArena.boss);

  enemies._diffConfig = diff;
  auditArena.setWaveSpawner((spawns, options) => enemies.spawnScriptedWave(spawns, options));

  player.setPosition(level.spawnPoint);
  player.weaponSystem = weapons;
  weapons.setLevel(level);
  weapons.setEnemies(() => [
    ...enemies.getAllEnemyEntities(),
    rkArena.boss,
    ctArena.boss,
    auditArena.boss,
  ].filter(Boolean));
  enemies.setPlayerWeaponRef(player, weapons);

  // Restore from checkpoint
  const checkpoint = saves.getCheckpoint();
  if (checkpoint) {
    player.health = checkpoint.playerHp;
    player.armor  = checkpoint.playerArmor;
    weapons.restoreUnlockedSlots(checkpoint.unlockedSlots ?? ALL_WEAPON_SLOTS);
    if (checkpoint.ammo) {
      Object.entries(checkpoint.ammo).forEach(([k, v]) => {
        weapons.ammo.counts[k] = v;
      });
    }
    const checkpointPos = checkpoint.position ?? _getCheckpointSpawn(checkpoint.arenaId);
    if (checkpointPos) {
      player.position.set(checkpointPos.x, checkpointPos.y, checkpointPos.z);
    }
    applyStartingArsenal({
      silent: true,
      preserveAmmo: true,
      preserveVitals: true,
      currentSlot: checkpoint.currentSlot ?? STARTING_ARSENAL.currentSlot,
    });
    unlockAllProgressionDoors({ silent: true });
    applyBossLoadout(checkpoint.arenaId, { silent: true });
    _showCheckpointToast(checkpoint.arenaId);
  } else {
    applyStartingArsenal({ silent: true, currentSlot: STARTING_ARSENAL.currentSlot });
  }

  // Init audio on first pointer lock (user gesture required by Web Audio API)
  let audioStarted = false;
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement && !audioStarted) {
      audioStarted = true;
      audio.init();
      ambient.start();
      music.start();
      if (checkpoint?.arenaId) {
        music.setState('boss');
      }
      audio.applySettings();
      pauseMenu.setAudioSystem(audio);
    }
  });

  const origHide = pauseMenu.hide.bind(pauseMenu);
  pauseMenu.hide = () => { origHide(); audio.applySettings(); };

  consoleUI.setOnOpen(id => {
    const isEarlyExitGate = id === 'console-exit-gate' && !objectives.isObjectiveActive('obj-exit');
    if (!isEarlyExitGate) {
      objectives.notifyConsoleAccessed(id);
    } else {
      _showSystemToast('EXIT GATE STANDBY // CLEAR THE FINAL SWEEP FIRST', '#ffaa00');
    }
    unlockDoorFromConsole(id);
    encounters.handleConsoleAccessed(id);
    EnemySounds.consoleAccess();
  });

  // Weapon fire sounds
  let lastWeaponFiring = false;
  const origWeaponUpdate = weapons.update.bind(weapons);
  weapons.update = (dt, inp, cam) => {
    origWeaponUpdate(dt, inp, cam);
    const w      = weapons.current;
    const firing = inp.isMouseButtonDown(0) && w.switchState === 'idle';
    if (firing && !lastWeaponFiring && audio.ready) {
      const slot = weapons.getSlot();
      [null,
        () => WeaponSounds.snapshotPistol(),
        () => WeaponSounds.replicationShotgun(),
        () => WeaponSounds.backupBeamStart(),
        () => WeaponSounds.failoverLaunch(),
        () => WeaponSounds.immutableRailgun(),
        () => WeaponSounds.cdpChaingunShot(),
        () => WeaponSounds.bfr9000Fire(),
      ][slot]?.();
    }
    lastWeaponFiring = firing;
  };

  // Objective completion sounds
  let lastObjCount = 0;
  const origObjUpdate = objectives.update.bind(objectives);
  objectives.update = (pos, enms) => {
    origObjUpdate(pos, enms);
    const done = objectives.getObjectives().filter(o => o.status === 'complete').length;
    if (done > lastObjCount) { EnemySounds.objectiveComplete(); lastObjCount = done; }
  };

  // Player damage — playerDamageReceiveMult >1 means squishier (Nightmare), <1 means tankier (Intern)
  const origTakeDamage = player.takeDamage.bind(player);
  let lastPlayerDamageSoundAt = -Infinity;
  player.takeDamage = (amount, type) => {
    origTakeDamage(amount * diff.playerDamageReceiveMult, type);
    if (audio.ready) {
      const now = performance.now() * 0.001;
      const interval = player.health < 20 ? 0.45 : 0.16;
      if (now - lastPlayerDamageSoundAt >= interval) {
        player.health < 20 ? EnemySounds.playerCritical() : EnemySounds.playerHurt();
        lastPlayerDamageSoundAt = now;
      }
    }
  };

  const origApplyStatus = player.applyStatus.bind(player);
  player.applyStatus = (name, duration) => {
    origApplyStatus(name, duration);
    if (name === 'slowed' && audio.ready) {
      EnemySounds.statusSlow();
    }
  };

  // BFR secret pickup via custom event
  window.addEventListener('bfr-secret-found', () => {
    const unlocked = weapons.unlockSlot(7, { ammoType: 'BFR_CELLS', amount: 2 });
    EnemySounds.pickupAmmo();
    _showSystemToast(
      unlocked ? 'ARSENAL OVERRIDE // BFR-9000 AUTHORIZED' : 'BFR CACHE // CELLS REPLENISHED',
      '#00ff41',
    );
  });

  const saveCheckpoint = (arenaId) =>
    saves.saveCheckpoint(arenaId, player, weapons, _getCheckpointSpawn(arenaId));

  function applyStartingArsenal(options = {}) {
    weapons.restoreUnlockedSlots(ALL_WEAPON_SLOTS);
    Object.entries(STARTING_ARSENAL.ammo).forEach(([ammoType, amount]) => {
      if (options.preserveAmmo) {
        weapons.ammo.set(ammoType, Math.max(weapons.ammo.get(ammoType), amount));
      } else {
        weapons.ammo.set(ammoType, amount);
      }
    });
    if (!options.preserveVitals) {
      player.health = Math.max(player.health, STARTING_ARSENAL.health);
      player.armor = Math.max(player.armor, STARTING_ARSENAL.armor);
    }
    if (options.currentSlot != null) {
      weapons.setCurrentSlot(options.currentSlot);
    }
    if (!options.silent) {
      EnemySounds.pickupAmmo();
      _showSystemToast(STARTING_ARSENAL.toast, '#00ff41');
    }
  }

  function unlockAllProgressionDoors(options = {}) {
    Object.values(RUNBOOK_DOOR_UNLOCKS).forEach(({ doorId }) => {
      level.unlockDoor(doorId, { silent: options.silent ?? true });
    });
  }

  function unlockDoorFromConsole(consoleId) {
    const unlock = RUNBOOK_DOOR_UNLOCKS[consoleId];
    if (!unlock) return;
    const changed = level.unlockDoor(unlock.doorId, { silent: true });
    if (changed) {
      _showSystemToast(`RUNBOOK UPDATE // ${unlock.toast}`, '#00ff41');
    }
  }

  function applyBossLoadout(arenaId, options = {}) {
    const loadout = BOSS_LOADOUTS[arenaId];
    if (!loadout) return;

    applyStartingArsenal({ silent: true, preserveAmmo: true, preserveVitals: true });
    player.health = Math.max(player.health, loadout.health);
    player.armor = Math.max(player.armor, loadout.armor);
    loadout.unlockSlots.forEach(slot => weapons.unlockSlot(slot));
    Object.entries(loadout.ammo).forEach(([ammoType, amount]) => {
      weapons.ammo.set(ammoType, Math.max(weapons.ammo.get(ammoType), amount));
    });

    if (!options.silent) {
      EnemySounds.pickupAmmo();
      _showSystemToast(loadout.toast, '#ffaa00');
    }
  }

  function getNavigationTarget() {
    if (auditArena._active && !auditArena._complete) {
      const pos = auditArena.getNavigationTarget();
      return pos ? { position: pos, label: 'THE AUDIT', kind: 'boss' } : null;
    }
    if (ctArena._active && !ctArena._bossDefeated) {
      const pos = ctArena.getNavigationTarget();
      return pos ? { position: pos, label: ctArena.boss?.name ?? 'CASCADE FAILURE TITAN', kind: 'boss' } : null;
    }
    if (rkArena._active && !rkArena._bossDefeated) {
      const pos = rkArena.getNavigationTarget();
      return pos ? { position: pos, label: rkArena.boss?.name ?? 'RANSOMWARE KING', kind: 'boss' } : null;
    }

    const target = objectives.getNavigationTarget();
    if (!target) return null;
    if (target.consoleId) {
      const pos = level.getConsolePosition(target.consoleId);
      return pos ? { position: pos, label: target.label, kind: 'objective' } : null;
    }
    if (target.position) {
      return { position: target.position, label: target.label, kind: 'objective' };
    }
    return null;
  }

  // Boss sequence
  rkArena.onDefeat(() => {
    bossHUD.hide(); hud.faceCam?.notifyBossExit();
    music.setState('explore'); ambient.triggerAlarm(1.5);
    enemies.suppressWaves();
    applyBossLoadout('cascade-titan');
    ctArena.activate();
    saveCheckpoint('cascade-titan');
    bossHUD.show(ctArena.boss.name);
    hud.faceCam?.notifyBossEntry();
    music.setState('boss');
  });

  ctArena.onDefeat(() => {
    bossHUD.hide(); hud.faceCam?.notifyBossExit();
    music.setState('explore'); ambient.triggerAlarm(1.5);
    enemies.suppressWaves();
    applyBossLoadout('the-audit');
    auditArena.activate();
    saveCheckpoint('the-audit');
    bossHUD.show('THE AUDIT');
    hud.faceCam?.notifyBossEntry();
    music.setState('boss');
  });

  auditArena.onSuccess(() => {
    bossHUD.hide(); hud.faceCam?.notifyBossExit();
    music.stop(); saves.clearCheckpoint();
    setTimeout(() => {
      victory.show({
        elapsed:    gameElapsed,
        kills:      totalKills,
        health:     Math.floor(player.health),
        objectives: objectives.getObjectives().map(o => ({
          label:    o.label,
          complete: o.status === 'complete',
        })),
        secrets: {
          found: secrets.getFoundCount(),
          total: secrets.getTotalCount(),
        },
        difficulty: diff.label,
      });
    }, 1500);
  });

  auditArena.onFailure(() => {
    bossHUD.hide(); hud.faceCam?.notifyBossExit();
    gameOver = true;
    document.exitPointerLock?.();
    if (audioStarted) {
      music.stop();
      ambient.stop();
    }
    _showGameOverOverlay(
      'AUDIT FAILED',
      'RTO BREACHED — CHECKPOINT RETAINED',
      saves.hasCheckpoint() ? 'CLICK TO RESUME CHECKPOINT' : 'CLICK TO REBOOT'
    );
  });

  objectives.onExitReached(() => {
    enemies.suppressWaves();
    unlockAllProgressionDoors({ silent: true });
    applyBossLoadout('ransomware-king');
    rkArena.activate();
    saveCheckpoint('ransomware-king');
    bossHUD.show(rkArena.boss.name);
    hud.faceCam?.notifyBossEntry();
    ambient.triggerAlarm(2.0);
    music.setState('boss');
  });

  const restoreBossCheckpoint = (arenaId) => {
    objectives.restoreBossCheckpoint();
    enemies.suppressWaves();
    levelDone = true;
    unlockAllProgressionDoors({ silent: true });

    if (arenaId === 'ransomware-king') {
      rkArena.activate();
      bossHUD.show(rkArena.boss.name);
    } else if (arenaId === 'cascade-titan') {
      rkArena.resolveCheckpointDefeat?.();
      ctArena.activate();
      bossHUD.show(ctArena.boss.name);
    } else if (arenaId === 'the-audit') {
      rkArena.resolveCheckpointDefeat?.();
      ctArena.resolveCheckpointDefeat?.();
      auditArena.activate();
      bossHUD.show('THE AUDIT');
    }

    hud.faceCam?.notifyBossEntry();
    if (audio.ready) {
      music.setState('boss');
    }
  };

  if (checkpoint?.arenaId) {
    restoreBossCheckpoint(checkpoint.arenaId);
  } else {
    encounters.startMission();
  }

  const hudTitle  = document.getElementById('hud-title');
  let prevCount   = enemies.getEnemyCount();
  let musicStateTimer = 0;
  const enemySoundTimers = new Map();
  const enemySoundNextDelay = new Map();

  const inBossFight = () =>
    (rkArena._active  && !rkArena._bossDefeated)  ||
    (ctArena._active  && !ctArena._bossDefeated)  ||
    (auditArena._active && !auditArena._complete);

  const updateMusicState = (dt) => {
    if (inBossFight()) return;
    musicStateTimer -= dt;
    if (musicStateTimer > 0) return;
    musicStateTimer = 2.0;
    const near = enemies.getAllEnemyEntities().filter(e =>
      !e.isDead && e.position.distanceTo(player.position) < 16
    ).length;
    music.setState(near > 0 ? 'combat' : 'explore');
  };

  pauseMenu.onResume(() => { lockPrompt.style.display = 'flex'; });

  const loop = new GameLoop((dt, elapsed) => {
    if (!levelDone && !gameOver) gameElapsed += dt;
    input.update();

    const paused = pauseMenu.isVisible() || consoleUI.isOpen();

    if (!paused && !gameOver) {
      player.update(dt, level);

      // Death check — runs immediately after player update
      if (player.health <= 0 && !gameOver) {
        gameOver = true;
        document.exitPointerLock?.();
        // Guard audio calls — only safe if audio context was started
        if (audioStarted) {
          music.stop();
          ambient.stop();
        }
        _showGameOverOverlay();
      }

      if (!gameOver) {
        interaction.update(dt, input);
        weapons.update(dt, input, renderer.camera);
        enemies.update(dt, player, level);
        hazards.update(dt, player);
        ambient.update(dt);
        music.update(dt);

        const cur = enemies.getEnemyCount();
        if (cur < prevCount) {
          totalKills += prevCount - cur;
          if (audio.ready) EnemySounds.genericDeath(player.position.x, 0, player.position.z);
        }
        prevCount = cur;

        // Periodic enemy idle sounds
        enemies.getAllEnemyEntities().forEach(e => {
          if (e.isDead) return;
          const last = enemySoundTimers.get(e) ?? 0;
          const next = enemySoundNextDelay.get(e) ?? (3 + Math.random() * 4);
          if (elapsed - last < next) return;
          enemySoundTimers.set(e, elapsed);
          enemySoundNextDelay.set(e, 3 + Math.random() * 4);
          if (!audio.ready) return;
          if      (e.type === 'corruption_crawler')                     EnemySounds.crawlerIdle(e.position.x, 0.5, e.position.z);
          else if (e.type === 'ransomware_wraith' && Math.random()>0.5) EnemySounds.wraithAlert(e.position.x, 0.5, e.position.z);
          else if (e.type === 'hardware_gremlin')                       EnemySounds.gremlinCharge(e.position.x, 0.5, e.position.z);
          else if (e.type === 'network_phantom')                        EnemySounds.phantomTeleport(e.position.x, 0.5, e.position.z);
        });

        // Purge dead enemies from the sound timer map to prevent memory leak
        for (const key of enemySoundTimers.keys()) {
          if (key.isDead) { enemySoundTimers.delete(key); enemySoundNextDelay.delete(key); }
        }

        objectives.update(player.position, enemies.getAllEnemyEntities());
        encounters.update(player.position, objectives.getObjectives());
        if (objectives.levelComplete && !levelDone) levelDone = true;

        updateMusicState(dt);
        if (audio.ready && Math.random() < dt * 0.15) ambient.triggerElectricArc();

        if      (auditArena._active) { auditArena.update(dt, player, renderer.camera, level); bossHUD.update(auditArena.boss); }
        else if (ctArena._active)    { ctArena.update(dt, player, renderer.camera, level);    bossHUD.update(ctArena.boss);   }
        else if (rkArena._active)    { rkArena.update(dt, player, renderer.camera, level);    bossHUD.update(rkArena.boss);   }

        if (audio.ready) audio.updateListener(player.position.x, player.position.y, player.position.z, player.yaw);
      }
    }

    level.update(dt);
    const activeBoss =
      auditArena._active ? auditArena.boss :
      ctArena._active ? ctArena.boss :
      rkArena._active ? rkArena.boss :
      null;
    const navigationTarget = getNavigationTarget();
    hud.update(player, weapons, elapsed, inBossFight(), enemies.getWaveState(), dt, {
      ...player.getStatusState(),
      ...weapons.getStatusState(),
      bossVulnerable: activeBoss?.isVulnerable?.() ?? false,
    }, navigationTarget);
    objHUD.update(objectives.getObjectives(), objectives.getPrimaryObjective());
    minimap.update(player.getPosition(), player.yaw, enemies.getAllEnemyEntities(), navigationTarget);

    if (hudTitle) {
      const count = enemies.getEnemyCount();
      const prog  = Math.floor(objectives.getCompletionFraction() * 100);
      const m = Math.floor(gameElapsed / 60);
      const s = Math.floor(gameElapsed % 60).toString().padStart(2, '0');
      hudTitle.innerHTML =
        `DR DOOM // L01 &nbsp;|&nbsp; <span style="color:${diff.color}">${diff.label}</span>` +
        ` &nbsp;|&nbsp; <span style="color:#ff4400">${count} THREATS</span>` +
        ` &nbsp;|&nbsp; <span style="color:#ffaa00">${prog}%</span>` +
        ` &nbsp;|&nbsp; <span style="color:#333">${m}:${s}</span>` +
        `<br><span style="color:#1a2a1a;font-size:9px;letter-spacing:2px;">FIELD MANUAL: ANYSTACKARCHITECT.COM</span>`;
    }

    renderer.render();
  });

  loop.start();
  window.addEventListener('resize', () => renderer.onResize());
}

function _showGameOverOverlay(titleText = 'SYSTEM DOWN', subText = 'RTO BREACHED — ALL SYSTEMS LOST', promptText = 'CLICK TO REBOOT') {
  const el = document.createElement('div');
  el.id = 'game-over-overlay';
  el.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.9);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    z-index:600; font-family:'Courier New',monospace;
    cursor:pointer;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-size:28px; font-weight:bold;
    letter-spacing:8px; color:#ff2200;
    text-shadow:0 0 20px #ff2200, 0 0 40px #ff220055;
    margin-bottom:16px;
  `;
  title.textContent = titleText;

  const sub = document.createElement('div');
  sub.style.cssText = `
    font-size:12px; letter-spacing:3px;
    color:#aa4400; margin-bottom:40px;
  `;
  sub.textContent = subText;

  const prompt = document.createElement('div');
  prompt.style.cssText = `
    font-size:10px; letter-spacing:2px;
    color:#445544; opacity:0; transition:opacity 0.5s;
  `;
  prompt.textContent = promptText;

  el.appendChild(title);
  el.appendChild(sub);
  el.appendChild(prompt);
  document.body.appendChild(el);

  setTimeout(() => { prompt.style.opacity = '1'; }, 2000);
  el.addEventListener('click', () => location.reload());
}

function _showSystemToast(text, color = '#ffaa00') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:32%; left:50%; transform:translateX(-50%);
    padding:10px 14px; border:1px solid ${color}33;
    background:rgba(0,0,0,0.82); font-family:'Courier New',monospace;
    font-size:11px; letter-spacing:2px; color:${color};
    text-shadow:0 0 10px ${color}; pointer-events:none;
    white-space:nowrap; z-index:520; animation:objToast 3s forwards;
  `;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function _showCheckpointToast(arenaId) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:40%; left:50%; transform:translateX(-50%);
    font-family:'Courier New',monospace; font-size:12px; letter-spacing:3px;
    color:#ffaa00; text-shadow:0 0 10px #ffaa00;
    pointer-events:none; white-space:nowrap;
    animation:objToast 3s forwards;
  `;
  el.textContent = `💾 CHECKPOINT RESTORED — ${arenaId.toUpperCase().replace(/-/g, ' ')}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function _getCheckpointSpawn(arenaId) {
  return BOSS_ARENA_LAYOUTS[arenaId]?.checkpoint ?? null;
}
