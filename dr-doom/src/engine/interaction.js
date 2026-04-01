import * as THREE from 'three';

const INTERACT_RANGE = 3.0; // world units
const INTERACT_COOLDOWN = 0.3; // seconds between interactions

export class InteractionSystem {
  constructor(camera, scene, consoleUI) {
    this.camera = camera;
    this.scene = scene;
    this.consoleUI = consoleUI;

    this._raycaster = new THREE.Raycaster();
    this._interactables = []; // { mesh, type, id, onInteract }
    this._cooldown = 0;
    this._promptEl = this._buildPrompt();
    this._lastHit = null;
  }

  _buildPrompt() {
    const el = document.createElement('div');
    el.id = 'interact-prompt';
    el.style.cssText = `
      position: fixed;
      bottom: 110px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      border: 1px solid #00ff41;
      color: #00ff41;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      letter-spacing: 2px;
      padding: 5px 14px;
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(el);
    return el;
  }

  register(mesh, type, id, onInteract, options = {}) {
    this._interactables.push({
      mesh,
      type,
      id,
      onInteract,
      canInteract: options.canInteract ?? null,
      onBlocked: options.onBlocked ?? null,
      getPrompt: options.getPrompt ?? null,
      getPromptColor: options.getPromptColor ?? null,
      getPromptBorderColor: options.getPromptBorderColor ?? null,
    });
  }

  update(dt, input) {
    if (this._cooldown > 0) this._cooldown -= dt;

    // Don't process if console is open
    if (this.consoleUI.isOpen()) {
      this._promptEl.style.display = 'none';
      return;
    }

    // Cast ray from center of screen
    this._raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    const meshes = this._interactables.map(i => i.mesh);
    const hits = this._raycaster.intersectObjects(meshes, true);

    if (hits.length > 0 && hits[0].distance <= INTERACT_RANGE) {
      const hitMesh = hits[0].object;
      // Find interactable by mesh or parent
      const item = this._interactables.find(i =>
        i.mesh === hitMesh || i.mesh.getObjectById(hitMesh.id)
      );

      if (item) {
        this._lastHit = item;
        const label = item.getPrompt?.(item) ?? (
          item.type === 'door' ? '[E] OPEN' : '[E] ACCESS TERMINAL'
        );
        const promptColor = item.getPromptColor?.(item) ?? '#00ff41';
        const promptBorderColor = item.getPromptBorderColor?.(item) ?? promptColor;
        this._promptEl.textContent = label;
        this._promptEl.style.color = promptColor;
        this._promptEl.style.borderColor = promptBorderColor;
        this._promptEl.style.display = 'block';

        if (input.isActionActive('interact') && this._cooldown <= 0) {
          this._cooldown = INTERACT_COOLDOWN;
          if (item.canInteract && !item.canInteract(item)) {
            item.onBlocked?.(item);
          } else {
            item.onInteract();
          }
        }
        return;
      }
    }

    this._lastHit = null;
    this._promptEl.style.display = 'none';
  }
}
