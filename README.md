# DR DOOM

DR DOOM is a DOOM-inspired browser FPS set inside a failing data center. You play the DR Engineer, restore failing infrastructure, clear boss arenas, and beat the recovery clock before the RTO expires.

[Play the live build](https://eblackrps.github.io/dr-doom/)
[Read the companion article](https://www.anystackarchitect.com/playing-doom-in-a-data-center/)

## Why this repo exists

This repository contains the production source for the DR DOOM web app, the GitHub Pages deployment workflow, and the maintainer documentation needed to ship releases cleanly. The game itself lives in [`dr-doom/`](./dr-doom/); the root of the repo is the maintainer control plane.

## Game highlights

- Desktop browser FPS built with Three.js and vanilla ES modules
- Seven DR-themed weapons available across a full single-level run
- Seven enemy types and three boss encounters
- Runbook objectives, minimap guidance, checkpoints, and ranked debriefs
- Persistent gameplay and audio settings stored locally
- Procedural music and effects built with the Web Audio API

## Maintainer quickstart

```bash
cd dr-doom
npm ci
npm run dev
```

Use these commands before merging or cutting a tag:

```bash
npm run check
npm run debug
```

- `npm run check` is the maintainer-friendly alias for the full validation suite
- `npm run debug` runs progression validation, production build generation, and release smoke checks
- Production files are emitted to `dr-doom/dist/`

## Repository map

- `dr-doom/` - application source, package metadata, build scripts, and app-level README
- `.github/` - Actions workflows, issue forms, PR template, CODEOWNERS, and Dependabot config
- `docs/` - architecture, testing, and release-process documentation
- `CHANGELOG.md` - notable release-facing changes and maintenance updates

## Release flow

- Pushes to `master` run CI and, when successful, deploy the built app to GitHub Pages
- Tags that match `v*` run the same validation gate before publishing a GitHub Release zip
- Both deployment paths install dependencies with `npm ci` and run `npm run debug` from `dr-doom/`

## Documentation index

- [Technical app guide](./dr-doom/README.md)
- [Architecture notes](./docs/architecture.md)
- [Testing and validation](./docs/testing.md)
- [Release process](./docs/release-process.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)

## Disclaimer

DR DOOM is a fan-made homage. It is not affiliated with or endorsed by id Software, ZeniMax, Microsoft, Marvel, Veeam, VMware, or Broadcom. All third-party product names and trademarks belong to their respective owners.

## License

The code in this repository is licensed under the MIT License. See [LICENSE](./LICENSE).
