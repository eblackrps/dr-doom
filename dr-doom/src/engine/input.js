// Default key bindings — remappable
export const DEFAULT_KEYMAP = {
  moveForward:  ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft:     ['KeyA', 'ArrowLeft'],
  moveRight:    ['KeyD', 'ArrowRight'],
  interact:     ['KeyE'],
  sprint:       ['ShiftLeft', 'ShiftRight'],
  jump:         ['Space'],
  weapon1:      ['Digit1'],
  weapon2:      ['Digit2'],
  weapon3:      ['Digit3'],
  weapon4:      ['Digit4'],
  weapon5:      ['Digit5'],
  weapon6:      ['Digit6'],
  weapon7:      ['Digit7'],
  pause:        ['Escape'],
};

export class InputHandler {
  constructor(canvas, lockPrompt) {
    this.canvas = canvas;
    this.lockPrompt = lockPrompt;
    this.keymap = { ...DEFAULT_KEYMAP };

    // Current frame state
    this.keys = new Set();
    this.mouse = { dx: 0, dy: 0, buttons: 0 };
    this._pendingDx = 0;
    this._pendingDy = 0;

    // Track button press events for "just pressed" detection
    this._mouseJustPressed  = 0; // bitmask set on mousedown, cleared each frame
    this._pendingJustPressed = 0;

    this.isLocked = false;
    this.scrollDelta = 0;
    this._pendingScroll = 0;

    this._bindEvents();
  }

  _bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Mouse movement — accumulate across frames
    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      this._pendingDx += e.movementX;
      this._pendingDy += e.movementY;
    });

    document.addEventListener('mousedown', (e) => {
      this.mouse.buttons         |= (1 << e.button);
      this._pendingJustPressed   |= (1 << e.button);
    });

    document.addEventListener('mouseup', (e) => {
      this.mouse.buttons &= ~(1 << e.button);
    });

    // Scroll wheel for weapon switching
    window.addEventListener('wheel', (e) => {
      this._pendingScroll += e.deltaY;
    }, { passive: true });

    // Pointer Lock
    this.lockPrompt.addEventListener('click', () => {
      this.canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
      this.lockPrompt.style.display = this.isLocked ? 'none' : 'flex';
    });

    document.addEventListener('pointerlockerror', () => {
      console.warn('DR DOOM: Pointer lock failed');
    });
  }

  // Call once per game loop tick to drain accumulated mouse delta
  update() {
    this.mouse.dx = this._pendingDx;
    this.mouse.dy = this._pendingDy;
    this._pendingDx = 0;
    this._pendingDy = 0;
    this.scrollDelta      = this._pendingScroll;
    this._pendingScroll   = 0;
    this._mouseJustPressed = this._pendingJustPressed;
    this._pendingJustPressed = 0;
  }

  // True only on the frame the button was first pressed — perfect for single-click fire
  isMouseButtonJustPressed(button = 0) {
    return !!(this._mouseJustPressed & (1 << button));
  }

  // Check if an action is currently active
  isActionActive(action) {
    const bindings = this.keymap[action];
    if (!bindings) return false;
    return bindings.some(code => this.keys.has(code));
  }

  // Remap a key action
  remap(action, codes) {
    this.keymap[action] = Array.isArray(codes) ? codes : [codes];
  }

  isMouseButtonDown(button = 0) {
    return !!(this.mouse.buttons & (1 << button));
  }
}
