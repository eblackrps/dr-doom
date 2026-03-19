const FIXED_TIMESTEP = 1 / 60; // 60 Hz physics
const MAX_FRAME_TIME = 0.25;   // Cap delta to prevent spiral of death

export class GameLoop {
  constructor(updateFn) {
    this.updateFn = updateFn;
    this.running = false;
    this.accumulator = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this._rafId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._tick();
  }

  stop() {
    this.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick() {
    if (!this.running) return;

    this._rafId = requestAnimationFrame((now) => {
      let frameTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      // Cap frame time to avoid spiral of death on tab switch / lag spike
      if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;

      this.accumulator += frameTime;
      this.elapsed += frameTime;

      // Fixed-timestep physics updates
      while (this.accumulator >= FIXED_TIMESTEP) {
        this.updateFn(FIXED_TIMESTEP, this.elapsed);
        this.accumulator -= FIXED_TIMESTEP;
      }

      this._tick();
    });
  }
}
