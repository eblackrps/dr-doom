# DR DOOM Code Fix Prompt

You are working on DR DOOM, a DOOM-inspired FPS game built with Three.js + Vite located at `C:\DRDOOM\dr-doom\`. All assets are procedurally generated — no external files. Fix ALL of the following issues:

---

## BUG FIXES (mandatory)

### 1. Syntax Error in `src/world/level.js` — orphaned code blocks

There are TWO orphaned code blocks sitting outside any class method that cause a parse error:

- **After `_makeFloorTexture()` closes at line 547**: Lines 548–583 contain stray rendering code (tile grid, scuff marks, texture creation, and a dangling `}`) that belong to no method. DELETE these orphaned lines entirely (548–583). They are leftover duplicates.

- **After `_makeCeilingTexture()` closes at line 696**: Lines 697–724 contain stray ceiling tile rendering code outside any method. DELETE these orphaned lines entirely (697–724). They are also leftover duplicates.

After deletion, the class should flow directly from `_makeFloorTexture() }` into `_makeWallTexture()`, and from `_makeCeilingTexture() }` into the `collidesAABB()` method.

### 2. `removeEventListener` leak in `src/ui/title-screen.js`

Event listeners are registered with `.bind(this)` inline, which creates a new function reference each call. The corresponding `removeEventListener` calls use a *different* `.bind(this)` reference, so listeners are never removed and stack up.

**Fix:** Store the bound references as instance properties in the constructor or in the `show()` method, then use those same references for both `addEventListener` and `removeEventListener`. For example:
```js
this._onKey = this._handleKey.bind(this);
this._onClick = this._handleClick.bind(this);
// then use this._onKey / this._onClick for add and remove
```

### 3. Config Drift Specter clone spawn in `src/entities/enemy-manager.js`

The code calls `_spawnEnemy('config_drift_specter_clone')` but `makeEnemy()` in `enemies.js` has no case for that type and returns `null`.

**Fix:** Either add a `'config_drift_specter_clone'` case to the `makeEnemy()` function in `src/entities/enemies.js` that creates a weaker variant of `ConfigDriftSpecter` (lower HP, lower damage, smaller scale), OR fix the caller in `enemy-manager.js` to directly instantiate a `ConfigDriftSpecter` with reduced stats instead of going through `makeEnemy()`. The clone should be visibly smaller (scale ~0.7) and have ~40% of the original's HP.

### 4. `getBestTime()` falsy check in `src/save/save-system.js` line 92-93

`if (!t)` is falsy for `t = 0`. Change to:
```js
if (t == null) return null;
```

### 5. Hardcoded frame delta in animations

Several `requestAnimationFrame` loops in the weapons and effects code use hardcoded `0.016` instead of actual frame delta. Search the codebase for `0.016` in animation contexts and replace with proper delta calculation using:
```js
let lastTime = performance.now();
function animate(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  // use dt instead of 0.016
}
```

Files likely affected: `src/weapons/weapons.js`, `src/weapons/projectiles.js`, `src/entities/enemy-manager.js`.

### 6. Cancel `requestAnimationFrame` on transitions

In `src/ui/boot.js` and `src/ui/title-screen.js`, store the `requestAnimationFrame` return value and call `cancelAnimationFrame()` in the cleanup/hide/destroy path so animation loops don't continue running after the screen is dismissed.

---

## IMPROVEMENT: Wall Textures

The current wall texture in `_makeWallTexture()` in `src/world/level.js` uses a warm off-white concrete look (`#c8c0b0`). Replace it with a **cool blue-gray industrial / data center aesthetic**. Think painted steel panels or commercial server room walls.

Requirements:
- Base color: a cool blue-gray (something like `#404858` to `#505868` range — NOT warm beige)
- Keep the horizontal block course lines (CMU joint lines) but adjust their color to match the new palette
- Keep the safety stripe bands at the bottom but make them high-vis yellow/black on the new base
- Add subtle vertical panel seam lines every ~128px for a segmented steel panel look
- Keep the concrete noise/speckle effect but adjust colors to the blue-gray palette
- Keep the existing `_makeFloorTexture()` and `_makeCeilingTexture()` as they are (only fix the orphaned code deletion for those)
- The wall texture should tile cleanly (it already does via RepeatWrapping)

---

## DO NOT CHANGE

- Do not modify the game logic, weapons, enemies, or level layout
- Do not add external assets or dependencies
- Do not change the HUD colors or overall green-on-black terminal aesthetic
- Do not refactor the monkey-patching in `main.js` or the `window._pauseMenu` globals (those are lower priority and out of scope)
- Do not modify `solidCells` module scope (out of scope)
- Do not touch audio files unless they contain a `0.016` hardcoded delta

---

After making all changes, run `npm run dev` (port 3000) and verify the game boots without console errors.
