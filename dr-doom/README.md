# DR DOOM — Disaster Recovery: The Game
### v1.0.0 — Full Build

> "RTO is ticking, Engineer. Pick up the Replication Shotgun and get to work."

---

## Setup

```bash
npm install
npm run dev       # development server at localhost:3000
npm run build     # production build to /dist
npm run preview   # preview production build
```

---

## The Game

A DOOM-inspired first-person shooter set in a failing data center. You are the DR Engineer. Infrastructure is under siege from ransomware, hardware failure, and cascading system faults. Meet your RTO or die.

**7 Weapons** — all modeled after real DR tools:
- Snapshot Pistol (VM snapshots)
- Replication Shotgun (Veeam replication)
- Backup Beam (incremental backup job)
- Failover Launcher (site failover orchestration)
- Immutable Railgun (S3 Object Lock / immutable backup)
- CDP Chaingun (continuous data protection)
- BFR-9000 (Big Failover Recovery)

**7 Enemy Types** — Corruption Crawlers, Ransomware Wraiths, Hardware Gremlins, Network Phantoms, Latency Leeches, Config Drift Specters, Cascade Failure Titans

**3 Boss Fights** — Ransomware King, Cascade Failure Titan (full), The Audit

**4 Difficulty Levels** — Intern / Sysadmin / Architect / Nightmare On-Call

**4 Secret Rooms** — real DR architecture notes, Veeam guides, VCF runbook, BFR vault

---

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look |
| 1-7 | Weapons |
| Scroll | Cycle weapons |
| E | Interact |
| Space | Jump |
| ESC | Pause / Settings |

---

## Field Manual

All DR concepts in this game reflect real infrastructure architecture.

**anystackarchitect.com** — Veeam v13, VMware vSphere 8 / VCF, DR design patterns, MSP architecture, hands-on runbooks.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Renderer | Three.js r169 (WebGLRenderer) |
| Build | Vite 5 |
| Language | Vanilla ES Modules |
| Post-processing | Custom GLSL CRT shader |
| Audio | Web Audio API (fully synthesized) |
| Physics | Custom AABB + raycasting |
| Persistence | localStorage |
| Hosting | GitHub Pages / Netlify / Cloudflare Pages |

---

## Special Thanks

**Joo Chung & The DR Gang** — for keeping the lights on and the backups running.

Dedicated to every engineer who has ever been paged at 3AM.
Your RTO is someone else's SLA.

---

*© DR Systems Inc. — Not responsible for RTO breaches incurred during gameplay.*
