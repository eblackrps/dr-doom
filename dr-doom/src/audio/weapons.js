import { audio } from './engine.js';

// Each weapon sound is a function that builds a Web Audio graph
// and plays a one-shot burst. All synthesized — no files needed.

export const WeaponSounds = {

  // 1: Snapshot Pistol — sharp digital crack, brief
  snapshotPistol() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;

      // Body — short burst of filtered noise
      const noise = audio.createNoiseSource(0.08);
      if (!noise) return;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 2800;
      bandpass.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      // Tone click
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      noise.connect(bandpass); bandpass.connect(gain); gain.connect(dest);
      osc.connect(oscGain); oscGain.connect(dest);
      noise.start(t); noise.stop(t + 0.1);
      osc.start(t); osc.stop(t + 0.06);
    });
  },

  // 2: Replication Shotgun — wide boom with spreading noise burst
  replicationShotgun() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;

      // Low boom
      const boom = ctx.createOscillator();
      boom.type = 'sine';
      boom.frequency.setValueAtTime(120, t);
      boom.frequency.exponentialRampToValueAtTime(40, t + 0.15);

      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(0.8, t);
      boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      // Wide noise crack
      const noise = audio.createNoiseSource(0.15);
      if (!noise) { boom.connect(boomGain); boomGain.connect(dest); boom.start(t); boom.stop(t+0.25); return; }

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 400;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.0, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      // Pump mechanical click (higher freq burst)
      const click = ctx.createOscillator();
      click.type = 'sawtooth';
      click.frequency.setValueAtTime(800, t + 0.22);
      click.frequency.exponentialRampToValueAtTime(200, t + 0.3);
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0, t);
      clickGain.gain.setValueAtTime(0.2, t + 0.22);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      boom.connect(boomGain); boomGain.connect(dest);
      noise.connect(hp); hp.connect(noiseGain); noiseGain.connect(dest);
      click.connect(clickGain); clickGain.connect(dest);

      boom.start(t); boom.stop(t + 0.25);
      noise.start(t); noise.stop(t + 0.2);
      click.start(t + 0.2); click.stop(t + 0.35);
    });
  },

  // 3: Backup Beam — continuous humming beam (called while firing)
  backupBeamStart() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc1.frequency.value = 220;
      osc2.type = 'sine';     osc2.frequency.value = 330;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.1);
      g.gain.linearRampToValueAtTime(0.15, t + 0.3);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1800;

      osc1.connect(lp); osc2.connect(lp); lp.connect(g); g.connect(dest);
      osc1.start(t); osc2.start(t);
      osc1.stop(t + 0.4); osc2.stop(t + 0.4);
    });
  },

  backupBeamTick() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 + Math.random()*80, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.1);
    });
  },

  // 4: Failover Launcher — deep thud launch + distant explosion
  failoverLaunch() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      const noise = audio.createNoiseSource(0.1);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 300;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.5, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(g); g.connect(dest);
      if (noise) { noise.connect(lp); lp.connect(ng); ng.connect(dest); noise.start(t); noise.stop(t+0.15); }
      osc.start(t); osc.stop(t + 0.45);
    });
  },

  failoverExplosion() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.8);
      if (!noise) return;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 600;

      const g = ctx.createGain();
      g.gain.setValueAtTime(1.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      const sub = ctx.createOscillator();
      sub.type = 'sine'; sub.frequency.value = 55;
      const subG = ctx.createGain();
      subG.gain.setValueAtTime(0.7, t);
      subG.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      noise.connect(lp); lp.connect(g); g.connect(dest);
      sub.connect(subG); subG.connect(dest);
      noise.start(t); noise.stop(t + 0.85);
      sub.start(t); sub.stop(t + 0.55);
    });
  },

  // 5: Immutable Railgun — high-energy electrical crack, piercing
  immutableRailgun() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;

      // Charge-up chirp
      const chirp = ctx.createOscillator();
      chirp.type = 'sawtooth';
      chirp.frequency.setValueAtTime(200, t);
      chirp.frequency.exponentialRampToValueAtTime(2400, t + 0.06);
      const chirpG = ctx.createGain();
      chirpG.gain.setValueAtTime(0.3, t);
      chirpG.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      // Main crack
      const noise = audio.createNoiseSource(0.12);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 0.5;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.setValueAtTime(1.5, t + 0.06);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      // Electrical tail
      const tail = ctx.createOscillator();
      tail.type = 'sawtooth';
      tail.frequency.setValueAtTime(1200, t + 0.06);
      tail.frequency.exponentialRampToValueAtTime(80, t + 0.4);
      const tailG = ctx.createGain();
      tailG.gain.setValueAtTime(0, t);
      tailG.gain.setValueAtTime(0.25, t + 0.06);
      tailG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      chirp.connect(chirpG); chirpG.connect(dest);
      if (noise) { noise.connect(bp); bp.connect(ng); ng.connect(dest); noise.start(t); noise.stop(t+0.2); }
      tail.connect(tailG); tailG.connect(dest);

      chirp.start(t); chirp.stop(t + 0.08);
      tail.start(t + 0.05); tail.stop(t + 0.45);
    });
  },

  // 6: CDP Chaingun — rapid mechanical bursts, spinning barrel whine
  cdpChaingunShot() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;

      const noise = audio.createNoiseSource(0.04);
      if (!noise) return;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 2;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      noise.connect(bp); bp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 0.05);
    });
  },

  cdpChaingunSpin(active) {
    // Returns an oscillator node for the barrel whine — caller manages start/stop
    if (!audio.ready) return null;
    try {
      const ctx  = audio.ctx;
      const osc  = ctx.createOscillator();
      osc.type   = 'sawtooth';
      osc.frequency.value = active ? 180 : 60;

      const lp   = ctx.createBiquadFilter();
      lp.type    = 'lowpass'; lp.frequency.value = 400;

      const g    = ctx.createGain();
      g.gain.value = 0.06;

      osc.connect(lp); lp.connect(g);
      audio.connectToCategory(g, 'sfx');
      return osc;
    } catch { return null; }
  },

  // 7: BFR-9000 — massive low-frequency discharge, green wave rumble
  bfr9000Fire() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;

      // Massive sub boom
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(55, t);
      sub.frequency.exponentialRampToValueAtTime(20, t + 1.0);
      const subG = ctx.createGain();
      subG.gain.setValueAtTime(1.5, t);
      subG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      // Mid charge
      const mid = ctx.createOscillator();
      mid.type = 'sawtooth';
      mid.frequency.setValueAtTime(110, t);
      mid.frequency.exponentialRampToValueAtTime(40, t + 0.8);
      const midG = ctx.createGain();
      midG.gain.setValueAtTime(0.5, t);
      midG.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      // Noise layer
      const noise = audio.createNoiseSource(0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 200;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.8, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      // High freq crack
      const crack = ctx.createOscillator();
      crack.type = 'square';
      crack.frequency.setValueAtTime(3200, t);
      crack.frequency.exponentialRampToValueAtTime(100, t + 0.15);
      const crackG = ctx.createGain();
      crackG.gain.setValueAtTime(0.4, t);
      crackG.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      sub.connect(subG); subG.connect(dest);
      mid.connect(midG); midG.connect(dest);
      crack.connect(crackG); crackG.connect(dest);
      if (noise) { noise.connect(lp); lp.connect(ng); ng.connect(dest); noise.start(t); noise.stop(t+0.6); }

      sub.start(t); sub.stop(t + 1.3);
      mid.start(t); mid.stop(t + 1.0);
      crack.start(t); crack.stop(t + 0.25);
    });
  },

  bfr9000Detonate() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(2.0);
      if (!noise) return;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 300;

      const g = ctx.createGain();
      g.gain.setValueAtTime(2.0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

      const rumble = ctx.createOscillator();
      rumble.type = 'sine'; rumble.frequency.value = 30;
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(1.0, t);
      rg.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      noise.connect(lp); lp.connect(g); g.connect(dest);
      rumble.connect(rg); rg.connect(dest);
      noise.start(t); noise.stop(t + 2.1);
      rumble.start(t); rumble.stop(t + 1.6);
    });
  },
};
