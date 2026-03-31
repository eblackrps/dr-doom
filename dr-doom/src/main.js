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
import { RansomwareKingArena, CascadeTitanArena, AuditArena } from './world/boss-arenas.js';
import { boot }              from './ui/boot.js';
import { audio }             from './audio/engine.js';
import { AmbientAudio }      from './audio/ambient.js';
import { MusicSystem }       from './audio/music.js';
import { WeaponSounds }      from './audio/weapons.js';
import { EnemySounds }       from './audio/enemies.js';
import { saves }             from './save/save-system.js';

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
  title.show().then(() => boot().then(() => launchGame()));
}

function launchGame() {
  const canvas          = document.getElementById('game-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const hudEl           = document.getElementById('hud');
  const lockPrompt      = document.getElementById('lock-prompt');

  canvasContainer.style.display = 'block';
  hudEl.style.display = 'block';
  lockPrompt.style.display = 'flex';

  const diff = saves.getDifficultyConfig();

  const renderer    = new Renderer(canvas);
  const input       = new InputHandler(canvas, lockPrompt);
  const consoleUI   = new ConsoleUI();
  // consoleUI passed explicitly — no window global needed
  const interaction = new InteractionSystem(renderer.camera, renderer.scene, consoleUI);
  const level       = new Level(renderer.scene, interaction);
  const player      = new Player(renderer.camera, input);
  const weapons     = new WeaponSystem(renderer.weaponScene, renderer.scene);
  const enemies     = new EnemyManager(renderer.scene, weapons);
  const hazards     = new HazardSystem(renderer.scene);
  const objectives  = new ObjectiveSystem();
  const secrets     = new SecretManager(renderer.scene, interaction, saves, consoleUI);
  const objHUD      = new ObjectiveHUD();
  const bossHUD     = new BossHUD();
  const victory     = new VictoryScreen();
  const hud         = new HUD();
  const pauseMenu   = new PauseMenu(input, null);
  const minimap     = new Minimap(level._map ?? null);
  const ambient     = new AmbientAudio();
  const music       = new MusicSystem();

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
    if (checkpoint.ammo) {
      Object.entries(checkpoint.ammo).forEach(([k, v]) => {
        weapons.ammo.counts[k] = v;
      });
    }
    const checkpointPos = checkpoint.position ?? _getCheckpointSpawn(checkpoint.arenaId);
    if (checkpointPos) {
      player.position.set(checkpointPos.x, checkpointPos.y, checkpointPos.z);
    }
    _showCheckpointToast(checkpoint.arenaId);
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
      pauseMenu._audio = audio;
    }
  });

  const origHide = pauseMenu.hide.bind(pauseMenu);
  pauseMenu.hide = () => { origHide(); audio.applySettings(); };

  consoleUI.setOnOpen(id => {
    objectives.notifyConsoleAccessed(id);
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
  player.takeDamage = (amount, type) => {
    origTakeDamage(amount * diff.playerDamageReceiveMult, type);
    if (audio.ready) {
      player.health < 20 ? EnemySounds.playerCritical() : EnemySounds.playerHurt();
    }
  };

  // BFR secret pickup via custom event
  window.addEventListener('bfr-secret-found', () => {
    weapons.ammo.add('BFR_CELLS', 2);
    EnemySounds.pickupAmmo();
  });

  const saveCheckpoint = (arenaId) =>
    saves.saveCheckpoint(arenaId, player, weapons, _getCheckpointSpawn(arenaId));

  // Boss sequence
  rkArena.onDefeat(() => {
    bossHUD.hide(); hud.faceCam?.notifyBossExit();
    music.setState('explore'); ambient.triggerAlarm(1.5);
    enemies.suppressWaves();
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
    auditArena.activate();
    saveCheckpoint('the-audit');
    bossHUD.show('THE AUDIT');
    hud.faceCam?.notifyBossEntry();
    music.setState('boss');
  });

  auditArena.onComplete(() => {
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
      });
    }, 1500);
  });

  objectives.onLevelComplete(() => {
    enemies.suppressWaves();
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

    if (arenaId === 'ransomware-king') {
      rkArena.activate();
      bossHUD.show(rkArena.boss.name);
    } else if (arenaId === 'cascade-titan') {
      ctArena.activate();
      bossHUD.show(ctArena.boss.name);
    } else if (arenaId === 'the-audit') {
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
    enemies.spawnAll();
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
        if (objectives.levelComplete && !levelDone) levelDone = true;

        updateMusicState(dt);
        if (audio.ready && Math.random() < dt * 0.15) ambient.triggerElectricArc();

        if      (auditArena._active) { auditArena.update(dt, player, renderer.camera); bossHUD.update(auditArena.boss); }
        else if (ctArena._active)    { ctArena.update(dt, player, renderer.camera);    bossHUD.update(ctArena.boss);   }
        else if (rkArena._active)    { rkArena.update(dt, player, renderer.camera);    bossHUD.update(rkArena.boss);   }

        if (audio.ready) audio.updateListener(player.position.x, player.position.y, player.position.z, player.yaw);
      }
    }

    level.update(dt);
    hud.update(player, weapons, elapsed, inBossFight(), enemies.getWaveState(), dt);
    objHUD.update(objectives.getObjectives());
    minimap.update(player.getPosition(), player.yaw, enemies.getAllEnemyEntities());

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

function _showGameOverOverlay() {
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
  title.textContent = 'SYSTEM DOWN';

  const sub = document.createElement('div');
  sub.style.cssText = `
    font-size:12px; letter-spacing:3px;
    color:#aa4400; margin-bottom:40px;
  `;
  sub.textContent = 'RTO BREACHED — ALL SYSTEMS LOST';

  const prompt = document.createElement('div');
  prompt.style.cssText = `
    font-size:10px; letter-spacing:2px;
    color:#445544; opacity:0; transition:opacity 0.5s;
  `;
  prompt.textContent = 'CLICK TO REBOOT';

  el.appendChild(title);
  el.appendChild(sub);
  el.appendChild(prompt);
  document.body.appendChild(el);

  setTimeout(() => { prompt.style.opacity = '1'; }, 2000);
  el.addEventListener('click', () => location.reload());
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
  switch (arenaId) {
    case 'ransomware-king':
      return { x: 112, y: 1.65, z: 22 };
    case 'cascade-titan':
      return { x: 68, y: 1.65, z: 136 };
    case 'the-audit':
      return { x: 124, y: 1.65, z: 88 };
    default:
      return null;
  }
}
