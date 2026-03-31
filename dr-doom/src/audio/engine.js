import { DEFAULT_AUDIO_SETTINGS, loadAudioSettings } from '../settings/audio-settings.js';

// DR DOOM Audio Engine
// All sound synthesized via Web Audio API — no external assets required
// Architecture: AudioContext → Master gain → Category gains → Effects chain → Destination

export class AudioEngine {
  constructor() {
    this._ctx         = null;
    this._master      = null;
    this._gains       = {};     // category gain nodes
    this._initialized = false;
    this._muted       = false;
    this._settings    = this._loadSettings();

    // Spatial listener (updated each frame to player position)
    this._listenerPos = { x: 0, y: 0, z: 0 };
    this._listenerYaw = 0;
  }

  // Must be called on user gesture (click/keydown)
  init() {
    if (this._initialized) return;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = this._settings.master / 100;
      this._master.connect(this._ctx.destination);

      // Category sub-mixers
      const cats = ['sfx', 'music', 'ambient', 'ui'];
      cats.forEach(cat => {
        const g = this._ctx.createGain();
        g.gain.value = (this._settings[cat] ?? 80) / 100;
        g.connect(this._master);
        this._gains[cat] = g;
      });

      this._initialized = true;

      // Register bitcrusher worklet early so it's ready when needed
      this._registerBitcrusherWorklet();

      // Apply mute on focus loss if setting enabled
      if (this._settings.muteFocus) {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) this._master.gain.value = 0;
          else this._master.gain.value = this._settings.master / 100;
        });
      }
    } catch (e) {
      console.warn('DR DOOM Audio: Web Audio API not available', e);
    }
  }

  _loadSettings() {
    return loadAudioSettings() ?? { ...DEFAULT_AUDIO_SETTINGS };
  }

  applySettings() {
    if (!this._initialized) return;
    this._settings = this._loadSettings();
    this._master.gain.value = this._settings.master / 100;
    Object.keys(this._gains).forEach(cat => {
      if (this._gains[cat]) {
        this._gains[cat].gain.value = (this._settings[cat] ?? 80) / 100;
      }
    });
  }

  get ctx()    { return this._ctx; }
  get ready()  { return this._initialized; }
  get settings() { return this._settings; }

  // Update listener position for spatial audio
  updateListener(x, y, z, yaw) {
    if (!this._initialized) return;
    this._listenerPos = { x, y, z };
    this._listenerYaw = yaw;
    const l = this._ctx.listener;
    if (l.positionX) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      // Forward vector from yaw
      l.forwardX.value = -Math.sin(yaw);
      l.forwardY.value = 0;
      l.forwardZ.value = -Math.cos(yaw);
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(-Math.sin(yaw), 0, -Math.cos(yaw), 0, 1, 0);
    }
  }

  // Create a panner node for 3D positioned sound
  createPanner(x, y, z) {
    if (!this._initialized) return null;
    const panner = this._ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 3;
    panner.maxDistance = 25;
    panner.rolloffFactor = 1.5;
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }
    return panner;
  }

  // Connect a node to a category gain
  connectToCategory(node, category) {
    const dest = this._gains[category] ?? this._master;
    node.connect(dest);
  }

  // Register the bitcrusher AudioWorklet processor from an inline Blob.
  // Called once during init() so the worklet is ready before any caller needs it.
  _registerBitcrusherWorklet() {
    if (!this._ctx || this._bitcrusherRegistered !== undefined) return;
    this._bitcrusherRegistered = false; // pending

    const processorCode = `
class BitcrusherProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const p = (options && options.processorOptions) || {};
    this._step     = Math.pow(0.5, p.bits     ?? 6);
    this._normFreq = p.normFreq ?? 0.25;
    this._phaseAcc = 0;
    this._lastSample = 0;
  }
  process(inputs, outputs) {
    const input  = inputs[0] && inputs[0][0];
    const output = outputs[0] && outputs[0][0];
    if (!input || !output) return true;
    for (let i = 0; i < output.length; i++) {
      this._phaseAcc += this._normFreq;
      if (this._phaseAcc >= 1.0) {
        this._phaseAcc -= 1.0;
        this._lastSample = this._step * Math.floor(input[i] / this._step + 0.5);
      }
      output[i] = this._lastSample;
    }
    return true;
  }
}
registerProcessor('dr-doom-bitcrusher', BitcrusherProcessor);
`;
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);

    this._ctx.audioWorklet.addModule(url)
      .then(() => {
        this._bitcrusherRegistered = true;
        URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.warn('DR DOOM Audio: BitcrusherWorklet failed to register', err);
        this._bitcrusherRegistered = false;
        URL.revokeObjectURL(url);
      });
  }

  // Optional bitcrusher effect for retro sound.
  // Returns an AudioWorkletNode ready to be connected, or null if not yet ready
  // / disabled / unsupported. Callers treat null as a no-op passthrough.
  createBitcrusher(bits = 6, normFreq = 0.25) {
    if (!this._initialized) return null;
    if (!this._settings.bitcrush) return null;
    if (!this._bitcrusherRegistered) return null; // worklet not ready yet

    try {
      return new AudioWorkletNode(this._ctx, 'dr-doom-bitcrusher', {
        numberOfInputs:  1,
        numberOfOutputs: 1,
        processorOptions: { bits, normFreq },
      });
    } catch (e) {
      console.warn('DR DOOM Audio: createBitcrusher failed', e);
      return null;
    }
  }

  // Noise buffer — white noise source
  createNoiseSource(duration = 0.1) {
    if (!this._initialized) return null;
    const bufSize = Math.floor(this._ctx.sampleRate * duration);
    const buf = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // Convenience: play a one-shot sound node graph
  playOneShot(buildFn, category = 'sfx') {
    if (!this._initialized) return;
    try {
      const dest = this._gains[category] ?? this._master;
      buildFn(this._ctx, dest);
    } catch (e) {
      // Silent fail — audio never crashes the game
    }
  }

  // Convenience: play positioned sound
  playPositional(buildFn, worldX, worldY, worldZ, category = 'sfx') {
    if (!this._initialized) return;
    if (!this._settings.spatial) {
      this.playOneShot(buildFn, category);
      return;
    }
    try {
      const panner = this.createPanner(worldX, worldY, worldZ);
      const dest   = this._gains[category] ?? this._master;
      panner.connect(dest);
      buildFn(this._ctx, panner);
    } catch (e) {}
  }
}

// Singleton
export const audio = new AudioEngine();
