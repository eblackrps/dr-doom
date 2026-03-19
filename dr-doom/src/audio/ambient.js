import { audio } from './engine.js';

// Data center ambient audio system
// Layered synthesis: server hum + fan drones + occasional HDD seeks + alert klaxons

export class AmbientAudio {
  constructor() {
    this._nodes    = []; // managed oscillators/sources
    this._running  = false;
    this._seekTimer = 0;
    this._alarmActive = false;
    this._alarmNodes  = [];
  }

  start() {
    if (!audio.ready || this._running) return;
    this._running = true;
    this._startServerHum();
    this._startFanDrones();
  }

  stop() {
    this._running = false;
    this._nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    this._nodes = [];
  }

  update(dt) {
    if (!audio.ready || !this._running) return;

    // Occasional HDD seek sounds
    this._seekTimer -= dt;
    if (this._seekTimer <= 0) {
      this._seekTimer = 2.5 + Math.random() * 5;
      this._playHDDSeek();
    }
  }

  _startServerHum() {
    // Base server hum — layered oscillators at datacenter frequencies
    const ctx = audio.ctx;
    const freqs = [60, 120, 180, 240]; // 60Hz power harmonics

    freqs.forEach((freq, i) => {
      try {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const g = ctx.createGain();
        // Each harmonic quieter
        g.gain.value = 0.08 / (i + 1);

        // Slight vibrato on base frequency
        if (i === 0) {
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 0.3;
          const lfoG = ctx.createGain();
          lfoG.gain.value = 0.8;
          lfo.connect(lfoG); lfoG.connect(osc.frequency);
          lfo.start();
          this._nodes.push(lfo);
        }

        osc.connect(g);
        audio.connectToCategory(g, 'ambient');
        osc.start();
        this._nodes.push(osc);
      } catch {}
    });

    // Low-frequency hum body — filtered noise
    try {
      const ctx2 = audio.ctx;
      const bufSize = ctx2.sampleRate * 2;
      const buf = ctx2.createBuffer(1, bufSize, ctx2.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx2.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const lp = ctx2.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 80;

      const g = ctx2.createGain();
      g.gain.value = 0.15;

      src.connect(lp); lp.connect(g);
      audio.connectToCategory(g, 'ambient');
      src.start();
      this._nodes.push(src);
    } catch {}
  }

  _startFanDrones() {
    const ctx = audio.ctx;

    // Multiple fan drones at different speeds/pitches
    const fanFreqs = [
      { freq: 185, q: 8,  gain: 0.04 }, // blade passing frequency
      { freq: 220, q: 6,  gain: 0.03 },
      { freq: 310, q: 10, gain: 0.025 },
      { freq: 440, q: 8,  gain: 0.02 }, // high-pitched small fans
    ];

    fanFreqs.forEach(({ freq, q, gain: gainVal }) => {
      try {
        // Noise through resonant bandpass = fan sound
        const bufSize = ctx.sampleRate;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = freq;
        bp.Q.value = q;

        const g = ctx.createGain();
        g.gain.value = gainVal;

        // Slight wobble on fan speed
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.1 + Math.random() * 0.3;
        const lfoG = ctx.createGain();
        lfoG.gain.value = freq * 0.02;
        lfo.connect(lfoG); lfoG.connect(bp.frequency);

        src.connect(bp); bp.connect(g);
        audio.connectToCategory(g, 'ambient');
        src.start();
        lfo.start();
        this._nodes.push(src, lfo);
      } catch {}
    });
  }

  _playHDDSeek() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      // Quick mechanical click-clack
      const noise = audio.createNoiseSource(0.04);
      if (!noise) return;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2000;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      // Second click (head return)
      const noise2 = audio.createNoiseSource(0.04);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.08, t + 0.05 + Math.random() * 0.1);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1 + Math.random() * 0.1);

      noise.connect(hp); hp.connect(g); g.connect(dest);
      if (noise2) { noise2.connect(hp); noise2.connect(g2); g2.connect(dest); noise2.start(t + 0.08); noise2.stop(t + 0.2); }
      noise.start(t); noise.stop(t + 0.06);
    }, 'ambient');
  }

  // Trigger alert klaxon (called on boss encounter, low HP, etc)
  triggerAlarm(duration = 3.0) {
    if (!audio.ready || this._alarmActive) return;
    this._alarmActive = true;

    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const cycles = Math.floor(duration / 0.5);

      for (let i = 0; i < cycles; i++) {
        const freq = i % 2 === 0 ? 880 : 660;
        const osc = ctx.createOscillator();
        osc.type = 'square'; osc.frequency.value = freq;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1200;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + i * 0.5);
        g.gain.linearRampToValueAtTime(0.15, t + i * 0.5 + 0.02);
        g.gain.setValueAtTime(0.15, t + i * 0.5 + 0.46);
        g.gain.linearRampToValueAtTime(0, t + i * 0.5 + 0.5);

        osc.connect(lp); lp.connect(g); g.connect(dest);
        osc.start(t + i * 0.5); osc.stop(t + i * 0.5 + 0.52);
      }

      setTimeout(() => { this._alarmActive = false; }, duration * 1000 + 200);
    }, 'sfx');
  }

  // Cooling failure gas hiss
  triggerGasLeak() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(2.0);
      if (!noise) return;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.3);
      g.gain.linearRampToValueAtTime(0.1, t + 1.8);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
      noise.connect(hp); hp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 2.2);
    }, 'ambient');
  }

  // Electrical arc (for hazard zones)
  triggerElectricArc() {
    audio.playOneShot((ctx, dest) => {
      const t = ctx.currentTime;
      const noise = audio.createNoiseSource(0.1);
      if (!noise) return;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 4000; bp.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(bp); bp.connect(g); g.connect(dest);
      noise.start(t); noise.stop(t + 0.15);
    }, 'sfx');
  }
}
