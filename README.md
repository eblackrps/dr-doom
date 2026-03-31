# DR DOOM — Disaster Recovery: The Game

A DOOM-inspired first-person shooter set in a failing data center. Fight through corrupted infrastructure, restore critical systems, and meet your RTO before all is lost.

## Play

**[Play DR DOOM](https://eblackrps.github.io/dr-doom/)**

Requires a desktop browser with keyboard and mouse.

## Features

- **7 weapons** modeled after real DR tools — Snapshot Pistol, Replication Shotgun, Failover Railgun, and more
- **7 enemy types** themed around infrastructure failures — Corruption Crawlers, Ransomware Wraiths, Cascade Failure Titans
- **3 boss fights** with unique arena mechanics
- **6 interconnected rooms** — server floor, storage vault, network core, cold aisle, management console, emergency exit
- **DR Runbook objective system** — restore VMs, verify backup chains, check environmental systems
- **Encounter-directed progression** with staged room scripting and arsenal unlocks
- **4 difficulty levels** — Intern, Sysadmin, Architect, Nightmare
- **Persistent settings + saves** with localStorage persistence for controls, look tuning, audio mix, and checkpoints
- **Ranked mission debriefs** with par times, best ranks, and commendations
- **Procedural music** — combat, boss, and exploration layers driven by Web Audio API

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| Left Click | Fire |
| 1-7 | Switch weapon |
| Scroll | Cycle weapon |
| E | Interact |
| Space | Jump |
| ESC | Pause |

## Tech Stack

- **Three.js** — 3D rendering, raycasting, billboard sprites
- **Web Audio API** — procedural music and SFX
- **Vite** — build tooling
- **Vanilla JS** — no framework dependencies

## Development

```bash
cd dr-doom
npm install
npm run dev
```

## Build

```bash
npm run build
npm run smoke
npm run debug
```

Output goes to `dist/`.

## Architecture

Read more about the DR architecture concepts behind the game at [anystackarchitect.com](https://anystackarchitect.com).

## License

MIT
