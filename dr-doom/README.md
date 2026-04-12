# DR DOOM Technical Guide

Current release: `v1.5.0`

This directory contains the shipped browser game, its validation scripts, and the Vite configuration used by the GitHub Pages release flow.

## App overview

DR DOOM is a desktop-first browser FPS built with Three.js and vanilla ES modules. The app boots from `src/main.js`, composes the renderer, game loop, world systems, UI, audio, persistence, and boss arenas, then emits a static production bundle through Vite.

## Requirements

- Node `24.14.1` or newer in the current major line
- npm `11.11.0` or newer in the current major line
- Desktop browser with keyboard and mouse support

The repo ships an `.nvmrc` at the repository root so local development and CI use the same Node version.

## Local development

```bash
npm ci
npm run dev
```

- Development server: `http://127.0.0.1:3000`
- Preview server: `http://127.0.0.1:4173`
- GitHub Pages base path remains `./` so the built app works from a subdirectory deployment

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on `127.0.0.1:3000` |
| `npm run build` | Generate the production bundle in `dist/` |
| `npm run preview` | Preview the production build on `127.0.0.1:4173` |
| `npm run validate:progression` | Verify arena reachability, boss win states, objective sequencing, and starting loadout rules |
| `npm run smoke` | Verify the built assets exist and the release version strings stay in sync |
| `npm run debug` | Run progression validation, build, and smoke checks together |
| `npm run check` | Alias for the full validation flow used by maintainers and CI |

## Directory guide

- `src/main.js` - application bootstrap and subsystem composition
- `src/engine/` - renderer, input, interaction, and frame loop
- `src/world/` - level layout, objectives, hazards, encounters, secrets, and boss arenas
- `src/entities/` - player, enemies, bosses, pickups, and shared entity logic
- `src/weapons/` - weapon definitions, ammo, projectiles, and weapon state
- `src/ui/` - boot flow, HUD, menus, title screen, minimap, boss HUD, console overlays, and victory screen
- `src/audio/` - synthesized music, ambient audio, weapon SFX, and enemy SFX
- `src/save/` - local save data and checkpoint persistence
- `src/settings/` - gameplay and audio preference storage
- `scripts/` - build smoke checks and progression validators used in CI

## Version sync points

The release smoke check expects these files to agree on the current version:

- `package.json`
- `package-lock.json`
- `src/save/save-system.js`
- `src/ui/title-screen.js`
- `index.html`
- `README.md`

If you bump the app version, update every file above before tagging a release.

## Release notes for maintainers

- The root workflow runs `npm ci` and `npm run debug` from this directory before any Pages deploy or tagged release
- `dist/` is treated as a generated artifact and should not be committed
- Use the root docs for contribution, testing, architecture, and release-policy details

## Additional documentation

- [Repository README](../README.md)
- [Architecture notes](../docs/architecture.md)
- [Testing and validation](../docs/testing.md)
- [Release process](../docs/release-process.md)
- [Changelog](../CHANGELOG.md)
