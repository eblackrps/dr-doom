# Release Process

This repository ships the playable build from GitHub Pages and packages tagged release archives from the same validated artifact.

## Branch and tag rules

- `master` is the deployment branch for GitHub Pages
- Tags matching `v*` create GitHub Releases
- Both paths run the same verification gate from `dr-doom/` before publishing

## Pre-release checklist

1. Update gameplay or maintenance changes as needed.
2. If the app version changes, sync every version-bearing file:
   - `dr-doom/package.json`
   - `dr-doom/package-lock.json`
   - `dr-doom/src/save/save-system.js`
   - `dr-doom/src/ui/title-screen.js`
   - `dr-doom/index.html`
   - `dr-doom/README.md`
   - `CHANGELOG.md`
3. From `dr-doom/`, run `npm ci` and `npm run debug`.
4. Review the generated `dist/` output locally with `npm run preview`.
5. Update `CHANGELOG.md` so the tag has release-facing notes.

## Publishing to GitHub Pages

1. Merge the validated change into `master`.
2. GitHub Actions installs dependencies from `dr-doom/package-lock.json`.
3. The workflow runs `npm run debug`.
4. On success, the workflow uploads the generated `dr-doom/dist/` folder and deploys it to GitHub Pages.

## Publishing a tagged release

1. Start from a validated commit on `master`.
2. Create and push a tag such as `v1.5.0`.
3. GitHub Actions reruns `npm ci` and `npm run debug`.
4. On success, the workflow zips the generated `dist/` folder and attaches it to a GitHub Release.

## Rollback guidance

- If a Pages deploy is bad, redeploy a known-good commit from `master`
- If a tag is bad, create a follow-up corrective tag instead of rewriting release history
- Avoid force-pushing over published release tags
