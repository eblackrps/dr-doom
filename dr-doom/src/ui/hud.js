import { FaceCam } from './face-cam.js';

export class HUD {
  constructor() {
    this.health  = document.getElementById('stat-health');
    this.armor   = document.getElementById('stat-armor');
    this.ammo    = document.getElementById('stat-ammo');
    this.weapon  = document.getElementById('stat-weapon');
    this.coords  = document.getElementById('hud-coords');

    this._lastHealth = -1;
    this._lastArmor  = -1;
    this._lastAmmo   = -1;
    this._lastWeapon = '';
    this._lastSlot   = -1;

    this.faceCam = new FaceCam();
    this._buildWeaponSlots();
  }

  _buildWeaponSlots() {
    const strip = document.getElementById('weapon-strip');
    if (!strip) return;

    const NAMES = ['SNAPSHOT','REPL.SHG','BKP BEAM','FAILOVER','RAILGUN','CDP CGUN','BFR-9000'];
    this._slotEls = NAMES.map((name, i) => {
      const slot = document.createElement('div');
      slot.style.cssText = `
        font-family:'Courier New',monospace; font-size:8px; letter-spacing:1px;
        color:#223322; border:1px solid #111a11; padding:2px 5px;
        background:rgba(0,0,0,0.5); transition:color 0.1s,border-color 0.1s;
      `;
      slot.textContent = `${i+1}:${name}`;
      strip.appendChild(slot);
      return slot;
    });
  }

  update(player, weapons, elapsed, isBossFight = false) {
    const hp = Math.max(0, Math.floor(player.health));
    if (hp !== this._lastHealth) {
      this.health.textContent = hp + '%';
      this.health.className   = 'hud-value' + (hp<=25?' danger':hp<=50?' warn':'');
      this._lastHealth = hp;
      const ov = document.getElementById('damage-overlay');
      if (ov) {
        if (hp <= 25) {
          const t = (25-hp)/25;
          ov.style.boxShadow  = `inset 0 0 ${60*t}px #ff220088`;
          ov.style.borderWidth = `${3*t}px`;
        } else {
          ov.style.boxShadow  = '';
          ov.style.borderWidth = '0px';
        }
      }
    }

    // Armor — display as RAID level
    const arm = Math.max(0, Math.floor(player.armor));
    if (arm !== this._lastArmor) {
      const raidLabel = arm >= 80 ? 'RAID-6' : arm >= 50 ? 'RAID-5' : arm >= 20 ? 'RAID-1' : 'DEGRADED';
      this.armor.textContent = raidLabel;
      this.armor.className   = 'hud-value' + (arm<=20?' danger':arm<=50?' warn':'');
      this._lastArmor = arm;
    }

    // Weapons
    if (weapons) {
      const slot    = weapons.getSlot();
      const name    = weapons.getCurrentWeaponName();
      const ammoVal = weapons.getCurrentAmmo();

      if (name !== this._lastWeapon) {
        this.weapon.textContent = name;
        this._lastWeapon = name;
        this.faceCam?.notifyPickup();
      }

      if (ammoVal !== this._lastAmmo) {
        this.ammo.textContent = ammoVal === Infinity ? '∞' : ammoVal;
        this.ammo.className   = 'hud-value' + (ammoVal<=5?' danger':ammoVal<=20?' warn':'');
        this._lastAmmo = ammoVal;
      }

      if (slot !== this._lastSlot) {
        this._slotEls?.forEach((el, i) => {
          const active = i+1 === slot;
          el.style.color       = active ? '#00ff41' : '#223322';
          el.style.borderColor = active ? '#00ff41' : '#111a11';
          el.style.background  = active ? 'rgba(0,255,65,0.07)' : 'rgba(0,0,0,0.5)';
        });
        this._lastSlot = slot;
      }
    }

    // Face cam
    this.faceCam?.update(1/60, player, isBossFight);

    // Coords (dev — can be hidden)
    if (this.coords) {
      const pos = player.getPosition();
      this.coords.innerHTML =
        `X:${pos.x.toFixed(0)} Z:${pos.z.toFixed(0)}`;
    }
  }

  flashDamage() {
    const ov = document.getElementById('damage-overlay');
    if (!ov) return;
    ov.style.background = 'rgba(255,34,0,0.32)';
    setTimeout(() => { ov.style.background = ''; }, 80);
  }
}
