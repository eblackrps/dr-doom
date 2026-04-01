import { FaceCam } from './face-cam.js';

const WEAPON_NAMES = ['SNAPSHOT', 'REPL.SHG', 'BKP BEAM', 'FAILOVER', 'RAILGUN', 'CDP CGUN', 'BFR-9000'];

export class HUD {
  constructor() {
    this.health = document.getElementById('stat-health');
    this.armor = document.getElementById('stat-armor');
    this.ammo = document.getElementById('stat-ammo');
    this.weapon = document.getElementById('stat-weapon');
    this.coords = document.getElementById('hud-coords');

    this._lastHealth = -1;
    this._lastArmor = -1;
    this._lastAmmo = -1;
    this._lastWeapon = '';
    this._lastSlot = -1;
    this._lastUnlockedKey = '';
    this._lastWaveStr = '';
    this._lastStatusKey = '';
    this._lastTargetKey = '';

    this._waveInfoEl = document.getElementById('wave-info');
    this._waveNumEl = document.getElementById('wave-num');
    this._waveCountEl = document.getElementById('wave-countdown');

    this.faceCam = new FaceCam();
    this._buildWeaponSlots();
    this._buildStatusPanel();
  }

  _buildWeaponSlots() {
    const strip = document.getElementById('weapon-strip');
    if (!strip) return;

    this._slotEls = WEAPON_NAMES.map((name, index) => {
      const slot = document.createElement('div');
      slot.style.cssText = `
        font-family:'Courier New',monospace;
        font-size:8px;
        letter-spacing:1px;
        color:#223322;
        border:1px solid #111a11;
        padding:2px 5px;
        background:rgba(0,0,0,0.5);
        transition:color 0.1s,border-color 0.1s,background 0.1s,opacity 0.1s;
      `;
      slot.textContent = `${index + 1}:${name}`;
      strip.appendChild(slot);
      return slot;
    });
  }

  _buildStatusPanel() {
    const hud = document.getElementById('hud');
    if (!hud) return;

    const panel = document.createElement('div');
    panel.id = 'status-panel';
    panel.style.cssText = `
      position:absolute;
      right:14px;
      top:268px;
      width:180px;
      display:none;
      border:1px solid #102316;
      background:rgba(0,0,0,0.55);
      padding:8px 10px;
    `;
    hud.appendChild(panel);
    this._statusEl = panel;

    const target = document.createElement('div');
    target.id = 'target-panel';
    target.style.cssText = `
      position:absolute;
      right:14px;
      top:188px;
      width:180px;
      display:none;
      border:1px solid #102316;
      background:rgba(0,0,0,0.55);
      padding:8px 10px;
    `;
    hud.appendChild(target);
    this._targetEl = target;
  }

  update(player, weapons, elapsed, isBossFight = false, waveState = null, dt = 1 / 60, statusState = {}, navigationTarget = null) {
    const hp = Math.max(0, Math.floor(player.health));
    if (hp !== this._lastHealth) {
      this.health.textContent = `${hp}%`;
      this.health.className = `hud-value${hp <= 25 ? ' danger' : hp <= 50 ? ' warn' : ''}`;
      this._lastHealth = hp;

      const overlay = document.getElementById('damage-overlay');
      if (overlay) {
        if (hp <= 25) {
          const t = (25 - hp) / 25;
          overlay.style.boxShadow = `inset 0 0 ${60 * t}px #ff220088`;
          overlay.style.borderWidth = `${3 * t}px`;
        } else {
          overlay.style.boxShadow = '';
          overlay.style.borderWidth = '0px';
        }
      }
    }

    const armor = Math.max(0, Math.floor(player.armor));
    if (armor !== this._lastArmor) {
      const raidLabel = armor >= 80 ? 'RAID-6' : armor >= 50 ? 'RAID-5' : armor >= 20 ? 'RAID-1' : 'DEGRADED';
      this.armor.textContent = raidLabel;
      this.armor.className = `hud-value${armor <= 20 ? ' danger' : armor <= 50 ? ' warn' : ''}`;
      this._lastArmor = armor;
    }

    if (weapons) {
      const slot = weapons.getSlot();
      const name = weapons.getCurrentWeaponName();
      const ammoVal = weapons.getCurrentAmmo();
      const unlockedKey = weapons.getUnlockedSlots?.().join(',') ?? '';

      if (name !== this._lastWeapon) {
        this.weapon.textContent = name;
        this._lastWeapon = name;
        this.faceCam?.notifyPickup();
      }

      if (ammoVal !== this._lastAmmo) {
        const numericAmmo = ammoVal === Infinity ? Infinity : Number(ammoVal);
        this.ammo.textContent = ammoVal === Infinity ? '∞' : `${ammoVal}`;
        this.ammo.className = `hud-value${numericAmmo !== Infinity && numericAmmo <= 5 ? ' danger' : numericAmmo <= 20 ? ' warn' : ''}`;
        this._lastAmmo = ammoVal;
      }

      if (slot !== this._lastSlot || unlockedKey !== this._lastUnlockedKey) {
        this._refreshWeaponStrip(weapons, slot);
        this._lastSlot = slot;
        this._lastUnlockedKey = unlockedKey;
      }
    }

    this.faceCam?.update(dt, player, isBossFight);
    this._updateWaveInfo(waveState);
    this._updateTargetPanel(player, navigationTarget);
    this._updateStatusPanel(statusState, weapons);

    if (this.coords) {
      const pos = player.getPosition();
      this.coords.innerHTML = `X:${pos.x.toFixed(0)} Z:${pos.z.toFixed(0)}`;
    }
  }

  _refreshWeaponStrip(weapons, activeSlot) {
    this._slotEls?.forEach((el, index) => {
      const slot = index + 1;
      const unlocked = weapons.isSlotUnlocked?.(slot) ?? true;
      const active = slot === activeSlot;

      if (!unlocked) {
        el.style.color = '#442222';
        el.style.borderColor = '#221111';
        el.style.background = 'rgba(32,0,0,0.32)';
        el.style.opacity = '0.5';
        return;
      }

      el.style.opacity = '1';
      el.style.color = active ? '#00ff41' : '#365236';
      el.style.borderColor = active ? '#00ff41' : '#111a11';
      el.style.background = active ? 'rgba(0,255,65,0.08)' : 'rgba(0,0,0,0.5)';
    });
  }

  _updateWaveInfo(waveState) {
    if (!this._waveInfoEl || !this._waveNumEl || !this._waveCountEl) return;

    if (!waveState) {
      this._waveInfoEl.style.display = 'none';
      this._waveCountEl.style.display = 'none';
      this._waveNumEl.textContent = '';
      this._lastWaveStr = '';
      return;
    }

    this._waveInfoEl.style.display = '';
    const numText = `WAVE ${waveState.num}`;
    if (numText !== this._lastWaveStr) {
      this._waveNumEl.textContent = numText;
      this._lastWaveStr = numText;
    }

    if (waveState.countdown !== null) {
      this._waveCountEl.textContent = `RESPAWN: ${Math.ceil(waveState.countdown)}s`;
      this._waveCountEl.style.display = '';
    } else {
      this._waveCountEl.style.display = 'none';
    }
  }

  _updateTargetPanel(player, navigationTarget) {
    if (!this._targetEl) return;
    if (!navigationTarget?.position) {
      this._targetEl.style.display = 'none';
      this._targetEl.innerHTML = '';
      this._lastTargetKey = '';
      return;
    }

    const dx = navigationTarget.position.x - player.position.x;
    const dz = navigationTarget.position.z - player.position.z;
    const distance = Math.max(0, Math.round(Math.sqrt(dx * dx + dz * dz)));
    const targetKey = `${navigationTarget.kind ?? 'objective'}:${navigationTarget.label}:${distance}`;
    if (targetKey === this._lastTargetKey) return;
    this._lastTargetKey = targetKey;

    const color = navigationTarget.kind === 'boss' ? '#ff4400' : '#ffaa00';
    const heading = navigationTarget.kind === 'boss' ? 'PRIORITY TARGET' : 'RUNBOOK TARGET';

    this._targetEl.style.display = 'block';
    this._targetEl.innerHTML = `
      <div style="font-size:8px;letter-spacing:2px;color:#365236;margin-bottom:6px;">${heading}</div>
      <div style="font-size:9px;letter-spacing:2px;color:${color};text-shadow:0 0 8px ${color}55;">${navigationTarget.label}</div>
      <div style="margin-top:6px;font-size:8px;line-height:1.7;letter-spacing:1px;color:#6f8c6f;">
        DIST ${distance}m // FOLLOW THE MINIMAP PING
      </div>
    `;
  }

  _updateStatusPanel(statusState, weapons) {
    if (!this._statusEl) return;

    const statuses = [];
    const currentAmmo = weapons?.getCurrentAmmo?.();
    if (Number.isFinite(currentAmmo) && currentAmmo <= 5) {
      statuses.push(['LOW AMMO', '#ff8800', `Only ${currentAmmo} rounds remain in the current weapon.`]);
    }
    if (statusState.locked) statuses.push(['WEAPON LOCK', '#ff2200', 'ENCRYPTION BOLT INTERFERENCE']);
    if (statusState.slowed) statuses.push(['MOVEMENT SLOW', '#ffaa00', `${Math.ceil(statusState.slowRemaining ?? 0)}s remaining`]);
    if (statusState.fireRateSlowed) statuses.push(['FIRE-RATE SLOW', '#ff8800', `${Math.ceil(statusState.fireRateSlowRemaining ?? 0)}s remaining`]);
    if (statusState.bossVulnerable) statuses.push(['BOSS VULNERABLE', '#00ff41', 'Push damage while the window is open']);

    const statusKey = JSON.stringify(statuses);
    if (statusKey === this._lastStatusKey) return;
    this._lastStatusKey = statusKey;

    if (statuses.length === 0) {
      this._statusEl.style.display = 'none';
      this._statusEl.innerHTML = '';
      return;
    }

    this._statusEl.style.display = 'block';
    this._statusEl.innerHTML = `
      <div style="font-size:8px;letter-spacing:2px;color:#365236;margin-bottom:8px;">STATUS FEED</div>
      ${statuses.map(([label, color, detail]) => `
        <div style="padding:6px 0;border-top:1px solid #0a1a0a;">
          <div style="font-size:9px;letter-spacing:2px;color:${color};text-shadow:0 0 8px ${color}55;">${label}</div>
          <div style="margin-top:4px;font-size:8px;line-height:1.7;letter-spacing:1px;color:#6f8c6f;">${detail}</div>
        </div>
      `).join('')}
    `;
  }

  flashDamage() {
    const overlay = document.getElementById('damage-overlay');
    if (!overlay) return;
    overlay.style.background = 'rgba(255,34,0,0.32)';
    setTimeout(() => { overlay.style.background = ''; }, 80);
  }
}
