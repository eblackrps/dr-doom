# Architecture

This document describes the runtime boundaries inside `dr-doom/` and the release-facing files that sit around the game.

## Repository layout

- `README.md` is the maintainer entrypoint for the full repository
- `dr-doom/` contains the web app, its package metadata, and the build/test scripts
- `.github/` contains the GitHub Actions workflow plus repository health files
- `docs/` captures process knowledge that should not live inside source comments

## Runtime flow

`dr-doom/src/main.js` is the composition root. It boots the desktop gate, title screen, save state, renderer, input layer, world systems, HUD, audio, encounters, and boss arenas. The game is intentionally organized by domain rather than framework conventions.

At a high level:

1. The boot flow blocks touch-only devices and starts from the title screen.
2. The launch path composes renderer, input, player, level, enemy, objective, hazard, secret, and UI systems.
3. Boss arenas patch shared collision and line-of-sight behavior into the base level.
4. Save, settings, audio, and UI systems sit alongside gameplay modules rather than behind a global store.

## Core module groups

### Engine

- `src/engine/renderer.js` sets up Three.js scenes, cameras, render targets, and the CRT-style post-process pass
- `src/engine/gameloop.js` owns frame timing
- `src/engine/input.js` and `src/engine/interaction.js` handle pointer-lock input and world interactions

### World and encounters

- `src/world/level.js` contains the base map and navigation assumptions
- `src/world/objectives.js`, `src/world/consoles.js`, and `src/world/encounters.js` define progression
- `src/world/boss-arenas.js` appends the major boss encounters to the main level layout
- `src/world/hazards.js` and `src/world/secrets.js` layer environmental risk and optional content

### Entities and combat

- `src/entities/` contains player, enemies, bosses, pickups, sprites, and shared entity behavior
- `src/weapons/` contains ammo definitions, weapons, projectiles, and the active weapon system

### UI and persistence

- `src/ui/` contains the boot screen, title screen, HUD modules, pause flow, minimap, boss HUD, console overlays, and victory screen
- `src/save/save-system.js` stores local progression, checkpoints, and best-run statistics
- `src/settings/` stores gameplay and audio preferences

### Audio

- `src/audio/` synthesizes music, ambient layers, enemy cues, and weapon sounds with the Web Audio API

## Validation architecture

The repository relies on purpose-built Node scripts instead of a heavier test runner:

- `scripts/validate-progression.mjs` verifies map connectivity, objective ordering, boss killability, and starting loadout rules
- `scripts/smoke-build.mjs` verifies the generated bundle and release-version string synchronization

These scripts are combined under `npm run debug`, which is the release gate for CI and tagged releases.

## Deployment architecture

- Vite builds static assets to `dr-doom/dist/`
- GitHub Actions installs dependencies with `npm ci`, runs `npm run debug`, uploads the generated `dist/` bundle, and then either deploys to Pages or packages a tagged release zip
- The Vite `base` remains `./` so the app works correctly when served from the GitHub Pages repository subpath
