# Testing and Validation

DR DOOM currently uses targeted validation scripts plus manual browser QA. The goal is fast release confidence without changing the gameplay architecture just to fit a generic test harness.

## Automated checks

Run these from `dr-doom/`:

```bash
npm ci
npm run validate:progression
npm run build
npm run smoke
npm run debug
```

## What each check covers

- `npm run validate:progression`
  Validates boss arena reachability, checkpoint routing, objective sequencing, boss defeat conditions, and the starting arsenal contract.
- `npm run build`
  Confirms the Vite production build can emit a complete static bundle.
- `npm run smoke`
  Confirms `dist/` contains the expected bundles and that release-facing version strings are synchronized.
- `npm run debug`
  Runs the full release gate in the order used by CI.

## Manual QA checklist

Before tagging a release, verify these in a desktop browser:

- Title screen flow works for a fresh run and for checkpoint resume
- Pointer lock, movement, weapon switching, interaction, pause menu, and settings all behave as expected
- Boss arenas remain reachable through normal progression
- Checkpoint recovery restores the intended loadout and placement
- Minimap objective markers, HUD warnings, and victory flow remain readable
- Audio starts only after user interaction and respects saved settings
- The production build works from `npm run preview` at `http://127.0.0.1:4173`

## CI expectations

The root GitHub Actions workflow runs `npm ci` and `npm run debug` from `dr-doom/` on:

- Pull requests targeting `master`
- Pushes to `master`
- Tags that match `v*`

Pages deploys and tagged releases both depend on that verification job succeeding first.

## Known testing gaps

- No browser automation or visual regression suite exists yet
- No dedicated unit-test harness exists outside the targeted validation scripts
- Mobile browsers are intentionally unsupported and should remain gated off
