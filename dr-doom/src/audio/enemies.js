import { audio } from './engine.js';

export const EnemySounds = {

  // Corruption Crawler — wet chittering, low hiss on attack
  crawlerIdle(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 80 + Math.random() * 40;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 400;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(lp); lp.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.35);
    }, x, y, z);
  },

  crawlerAttack(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.15);
      if (!noise) return;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.connect(bp); bp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 0.2);
    }, x, y, z);
  },

  crawlerDeath(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.55);
    }, x, y, z);
  },

  // Ransomware Wraith — spectral wail, encryption bolt launch
  wraithAlert(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.6);
      const vibLFO = ctx.createOscillator();
      vibLFO.frequency.value = 8;
      const vibGain = ctx.createGain(); vibGain.gain.value = 30;
      vibLFO.connect(vibGain); vibGain.connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(g); g.connect(dest);
      vibLFO.start(t); osc.start(t);
      vibLFO.stop(t + 0.7); osc.stop(t + 0.75);
    }, x, y, z);
  },

  wraithBolt(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.4);
    }, x, y, z);
  },

  wraithDeath(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400 - i * 80, t + i * 0.1);
        osc.frequency.exponentialRampToValueAtTime(50, t + i * 0.1 + 0.4);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.2, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.5);
        osc.connect(g); g.connect(dest);
        osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.55);
      }
    }, x, y, z);
  },

  // Hardware Gremlin — mechanical clank, explosion
  gremlinCharge(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.2);
      if (!noise) return;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      noise.connect(lp); lp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 0.25);
    }, x, y, z);
  },

  gremlinExplosion(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.5);
      if (!noise) return;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(1.0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      const sub = ctx.createOscillator();
      sub.type = 'sine'; sub.frequency.value = 60;
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.6, t); sg.gain.exponentialRampToValueAtTime(0.001, t+0.4);
      noise.connect(lp); lp.connect(g); g.connect(dest);
      sub.connect(sg); sg.connect(dest);
      noise.start(t); noise.stop(t + 0.6);
      sub.start(t); sub.stop(t + 0.45);
    }, x, y, z);
  },

  // Network Phantom — digital glitch, static burst
  phantomTeleport(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.1);
      if (!noise) return;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(bp); bp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 0.15);
    }, x, y, z);
  },

  phantomAttack(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2000, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.28);
    }, x, y, z);
  },

  // Generic death — pitch-down buzz
  genericDeath(x, y, z) {
    audio.playPositional((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.7);
    }, x, y, z);
  },

  // Player hurt sounds
  playerHurt() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.22);
    }, 'sfx');
  },

  playerCritical() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      // Alarm-like warning
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = i % 2 === 0 ? 440 : 330;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + i * 0.15);
        g.gain.setValueAtTime(0.3, t + i * 0.15 + 0.01);
        g.gain.setValueAtTime(0.3, t + i * 0.15 + 0.12);
        g.gain.setValueAtTime(0, t + i * 0.15 + 0.14);
        osc.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + 0.5);
      }
    }, 'sfx');
  },

  // Pickup sounds
  pickupHealth() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + i * 0.08);
        g.gain.setValueAtTime(0.25, t + i * 0.08 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.15);
        osc.connect(g); g.connect(dest);
        osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.18);
      });
    }, 'sfx');
  },

  pickupAmmo() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.setValueAtTime(400, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.14);
    }, 'sfx');
  },

  // UI sounds
  doorOpen() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.3);
      if (!noise) return;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      noise.connect(lp); lp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 0.4);
    }, 'sfx');
  },

  objectiveComplete() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + i * 0.06);
        g.gain.setValueAtTime(0.2, t + i * 0.06 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25);
        osc.connect(g); g.connect(dest);
        osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.28);
      });
    }, 'ui');
  },

  consoleAccess() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1100, t + 0.04);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.12);
    }, 'ui');
  },

  statusSlow() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.26);
    }, 'ui');
  },

  weaponLock() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, t);
      osc.frequency.linearRampToValueAtTime(320, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.24);
    }, 'ui');
  },

  bossVulnerable() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      [659, 880, 1174].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + i * 0.05);
        g.gain.setValueAtTime(0.18, t + i * 0.05 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.2);
        osc.connect(g); g.connect(dest);
        osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.22);
      });
    }, 'ui');
  },
};
