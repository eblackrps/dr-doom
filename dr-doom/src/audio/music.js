import { audio } from './engine.js';

// Dynamic music system
// Three states: exploration (ambient drone), combat (drums + bass), boss (full intensity)
// Each state fades in/out its layers smoothly
// All synthesized — no files
//
// Scheduling uses a Web Audio lookahead pattern instead of setTimeout to avoid
// drift: each update() pre-schedules any notes within the next LOOKAHEAD seconds
// using ctx.currentTime (sample-accurate), not wall-clock time.

const BPM      = 128;
const BEAT     = 60 / BPM;       // seconds per beat
const BAR      = BEAT * 4;       // 4/4 time
const LOOKAHEAD = 0.12;          // schedule notes up to 120ms ahead

const BOSS_BPM  = 160;
const BOSS_BEAT = 60 / BOSS_BPM;
const BOSS_BAR  = BOSS_BEAT * 4;

export class MusicSystem {
  constructor() {
    this._state     = 'none';
    this._target    = 'explore';
    this._layers    = {};
    this._elapsed   = 0;
    this._beat      = 0;
    this._running   = false;
    this._fadeTime  = 2.0;

    // Lookahead scheduler state
    this._bassIdx         = 0;
    this._nextBassTime    = 0;
    this._nextKitTime     = 0;
    this._bossRiffIdx     = 0;
    this._nextBossRiffTime = 0;
    this._nextBossKitTime  = 0;
    this._combatReady     = false;
    this._bossReady       = false;

    // Explore ping timer (update-driven, no setTimeout needed)
    this._explorePingTimer = 4.0;
  }

  start() {
    if (!audio.ready || this._running) return;
    this._running = true;
    this._buildExploreLayers();
    this._buildCombatLayers();
    this._buildBossLayers();
    this.setState('explore');
  }

  stop() {
    this._running = false;
    this._combatReady = false;
    this._bossReady   = false;
    Object.values(this._layers).forEach(layer => {
      layer.masterGain?.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.5);
    });
  }

  setState(newState) {
    if (newState === this._state || !this._running) return;

    const ctx = audio.ctx;
    const t   = ctx.currentTime;

    // Fade out current
    if (this._state !== 'none' && this._layers[this._state]) {
      const g = this._layers[this._state].masterGain;
      if (g) g.gain.setTargetAtTime(0, t, this._fadeTime * 0.4);
    }

    // Fade in new
    this._state = newState;
    if (this._layers[newState]) {
      const layer = this._layers[newState];
      if (layer.masterGain) {
        layer.masterGain.gain.setTargetAtTime(1.0, t, this._fadeTime * 0.4);
      }
    }

    // Arm the lookahead scheduler for the incoming layer
    if (newState === 'combat' && !this._combatReady) {
      this._nextBassTime = ctx.currentTime;
      this._nextKitTime  = ctx.currentTime;
      this._combatReady  = true;
    }
    if (newState === 'boss' && !this._bossReady) {
      this._nextBossRiffTime = ctx.currentTime;
      this._nextBossKitTime  = ctx.currentTime;
      this._bossReady        = true;
    }
  }

  update(dt) {
    if (!audio.ready || !this._running) return;
    this._elapsed += dt;
    this._beat    += dt;
    if (this._beat >= BEAT) this._beat -= BEAT;

    const ctx = audio.ctx;
    const now = ctx.currentTime;

    // ---- Explore ping ----
    if (this._state === 'explore') {
      this._explorePingTimer -= dt;
      if (this._explorePingTimer <= 0) {
        this._explorePingTimer = 3.5 + Math.random() * 4.0;
        this._schedulePing(now + 0.02);
      }
    }

    // ---- Combat lookahead ----
    if (this._combatReady && this._layers['combat']) {
      const mg = this._layers['combat'].masterGain;
      while (this._nextBassTime < now + LOOKAHEAD) {
        this._scheduleBassNote(this._nextBassTime, mg);
        this._nextBassTime += BEAT;
      }
      while (this._nextKitTime < now + LOOKAHEAD) {
        this._scheduleKitBar(this._nextKitTime, mg);
        this._nextKitTime += BAR;
      }
    }

    // ---- Boss lookahead ----
    if (this._bossReady && this._layers['boss']) {
      const mg = this._layers['boss'].masterGain;
      while (this._nextBossRiffTime < now + LOOKAHEAD) {
        this._scheduleBossRiffNote(this._nextBossRiffTime, mg);
        this._nextBossRiffTime += BOSS_BEAT;
      }
      while (this._nextBossKitTime < now + LOOKAHEAD) {
        this._scheduleBossKitBar(this._nextBossKitTime, mg);
        this._nextBossKitTime += BOSS_BAR;
      }
    }
  }

  // ---- Layer builders ----

  _buildExploreLayers() {
    if (!audio.ready) return;
    const ctx = audio.ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    audio.connectToCategory(masterGain, 'music');

    try {
      // Dark ambient drone — two detuned oscillators
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc1.frequency.value = 55;
      osc2.type = 'sawtooth'; osc2.frequency.value = 55.8;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 300;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoG = ctx.createGain(); lfoG.gain.value = 150;
      lfo.connect(lfoG); lfoG.connect(lp.frequency);

      const droneGain = ctx.createGain(); droneGain.gain.value = 0.18;
      osc1.connect(lp); osc2.connect(lp); lp.connect(droneGain); droneGain.connect(masterGain);

      // Slow pad — sine chords (A minor)
      const padFreqs = [110, 138.59, 164.81];
      padFreqs.forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = freq;
        const g = ctx.createGain(); g.gain.value = 0.06;

        const tremLFO = ctx.createOscillator();
        tremLFO.frequency.value = 0.15 + Math.random() * 0.1;
        const tremG = ctx.createGain(); tremG.gain.value = 0.03;
        tremLFO.connect(tremG); tremG.connect(g.gain);

        osc.connect(g); g.connect(masterGain);
        tremLFO.start(); osc.start();
      });

      osc1.start(); osc2.start(); lfo.start();
    } catch (e) {}

    this._exploreMasterGain = masterGain;
    this._layers['explore'] = { masterGain };
  }

  _schedulePing(t) {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    const mg  = this._exploreMasterGain;
    if (!mg) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = [880, 1046.5, 1174.66][Math.floor(Math.random() * 3)];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(g); g.connect(mg);
      osc.start(t); osc.stop(t + 1.3);
    } catch (e) {}
  }

  _buildCombatLayers() {
    if (!audio.ready) return;
    const ctx = audio.ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    audio.connectToCategory(masterGain, 'music');

    this._bassNotes = [55, 55, 73.42, 55, 65.41, 55, 73.42, 69.30];
    this._layers['combat'] = { masterGain };
  }

  _scheduleBassNote(t, masterGain) {
    if (!audio.ready) return;
    const ctx  = audio.ctx;
    const freq = this._bassNotes[this._bassIdx % this._bassNotes.length];
    this._bassIdx++;
    try {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.35, t);
      env.gain.exponentialRampToValueAtTime(0.15, t + BEAT * 0.6);
      env.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.9);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 600;
      osc.connect(lp); lp.connect(env); env.connect(masterGain);
      osc.start(t); osc.stop(t + BEAT);
    } catch (e) {}
  }

  _scheduleKitBar(t, masterGain) {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    try {
      // Kick on beat 1
      const kick = ctx.createOscillator();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(160, t);
      kick.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      const kG = ctx.createGain();
      kG.gain.setValueAtTime(0.7, t);
      kG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      kick.connect(kG); kG.connect(masterGain);
      kick.start(t); kick.stop(t + 0.18);

      // Snare on beat 2
      const snareT = t + BAR * 0.25;
      const sNoise = audio.createNoiseSource(0.12);
      if (sNoise) {
        const sBp = ctx.createBiquadFilter();
        sBp.type = 'bandpass'; sBp.frequency.value = 1200; sBp.Q.value = 1;
        const sG = ctx.createGain();
        sG.gain.setValueAtTime(0.4, snareT);
        sG.gain.exponentialRampToValueAtTime(0.001, snareT + 0.15);
        sNoise.connect(sBp); sBp.connect(sG); sG.connect(masterGain);
        sNoise.start(snareT); sNoise.stop(snareT + 0.18);
      }

      // Hi-hats on off-beats
      [0.125, 0.375, 0.625, 0.875].forEach(frac => {
        const hatT = t + BAR * frac;
        const hNoise = audio.createNoiseSource(0.04);
        if (!hNoise) return;
        const hHp = ctx.createBiquadFilter();
        hHp.type = 'highpass'; hHp.frequency.value = 8000;
        const hG = ctx.createGain();
        hG.gain.setValueAtTime(0.15, hatT);
        hG.gain.exponentialRampToValueAtTime(0.001, hatT + 0.04);
        hNoise.connect(hHp); hHp.connect(hG); hG.connect(masterGain);
        hNoise.start(hatT); hNoise.stop(hatT + 0.05);
      });
    } catch (e) {}
  }

  _buildBossLayers() {
    if (!audio.ready) return;
    const ctx = audio.ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    audio.connectToCategory(masterGain, 'music');

    this._bossNotes  = [55, 55, 49, 55, 58.27, 55, 51.91, 55];
    this._stabFreqs  = [220, 261.63, 220, 246.94];
    this._layers['boss'] = { masterGain };
  }

  _scheduleBossRiffNote(t, masterGain) {
    if (!audio.ready) return;
    const ctx  = audio.ctx;
    const freq = this._bossNotes[this._bossRiffIdx % this._bossNotes.length];
    this._bossRiffIdx++;
    try {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      const dist = ctx.createWaveShaper();
      const k = 50;
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
      }
      dist.curve = curve;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.25, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + BOSS_BEAT * 0.8);
      osc.connect(dist); dist.connect(env); env.connect(masterGain);
      osc.start(t); osc.stop(t + BOSS_BEAT);
    } catch (e) {}
  }

  _scheduleBossKitBar(t, masterGain) {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    try {
      // Double kick on 1 and 1.5
      [0, 0.5].forEach(offset => {
        const kickT = t + offset * BOSS_BEAT;
        const kick = ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(200, kickT);
        kick.frequency.exponentialRampToValueAtTime(35, kickT + 0.1);
        const kG = ctx.createGain();
        kG.gain.setValueAtTime(0.9, kickT);
        kG.gain.exponentialRampToValueAtTime(0.001, kickT + 0.18);
        kick.connect(kG); kG.connect(masterGain);
        kick.start(kickT); kick.stop(kickT + 0.2);
      });

      // Industrial snare on beat 2
      const snareT = t + BOSS_BEAT;
      const sn = audio.createNoiseSource(0.15);
      if (sn) {
        const snLp = ctx.createBiquadFilter();
        snLp.type = 'lowpass'; snLp.frequency.value = 3000;
        const snG = ctx.createGain();
        snG.gain.setValueAtTime(0.55, snareT);
        snG.gain.exponentialRampToValueAtTime(0.001, snareT + 0.2);
        sn.connect(snLp); snLp.connect(snG); snG.connect(masterGain);
        sn.start(snareT); sn.stop(snareT + 0.22);
      }

      // Synth stab mid-bar
      const stabT = t + BOSS_BAR * 0.5;
      const stab  = ctx.createOscillator();
      stab.type = 'sawtooth';
      stab.frequency.value = this._stabFreqs[this._bossRiffIdx % this._stabFreqs.length];
      const stabG = ctx.createGain();
      stabG.gain.setValueAtTime(0.3, stabT);
      stabG.gain.exponentialRampToValueAtTime(0.001, stabT + 0.06);
      stab.connect(stabG); stabG.connect(masterGain);
      stab.start(stabT); stab.stop(stabT + 0.08);
    } catch (e) {}
  }
}
