# DR DOOM

DR DOOM is a DOOM-inspired browser FPS set inside a failing data center. You play the DR Engineer, fight through corrupted infrastructure, clear boss arenas, and keep the recovery plan alive before the RTO expires.

## Play

- Live game: [https://eblackrps.github.io/dr-doom/](https://eblackrps.github.io/dr-doom/)
- Article / embedded version: [https://www.anystackarchitect.com/playing-doom-in-a-data-center/](https://www.anystackarchitect.com/playing-doom-in-a-data-center/)
- Platform: desktop browser with keyboard and mouse

## Highlights

- 7 weapons themed around real DR tooling, with the full arsenal available at spawn
- 7 enemy types plus 3 boss fights: Ransomware King, Cascade Titan, and The Audit
- Guided runbook objectives, minimap target pings, checkpoints, and ranked mission debriefs
- Persistent controls, look tuning, audio settings, and boss checkpoint recovery
- Procedural audio and music built with the Web Audio API

## Development

```bash
cd dr-doom
npm install
npm run dev
```

## Build And Validation

```bash
npm run build
npm run smoke
npm run debug
```

- `npm run build` creates the production output in `dr-doom/dist/`
- `npm run smoke` verifies the built bundles and release strings
- `npm run debug` runs progression validation, build, and smoke checks together

More detailed project notes live in [dr-doom/README.md](dr-doom/README.md).

## Tech

- Three.js
- Vite
- Vanilla ES modules
- Web Audio API

## Disclaimer

DR DOOM is a fan-made homage. It is not affiliated with or endorsed by id Software, ZeniMax, Microsoft, Marvel, Veeam, VMware, or Broadcom. All third-party product names and trademarks belong to their respective owners.

## License

The code in this repository is licensed under the MIT License. See [LICENSE](LICENSE).
