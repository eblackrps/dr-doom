# Contributing

Thanks for helping improve DR DOOM.

## Before you start

- Use the Node version from `.nvmrc`
- Work from the `dr-doom/` app directory for installs and validation
- Keep changes focused and reviewable
- Do not change core gameplay behavior unless the change is intentional and documented

## Local setup

```bash
cd dr-doom
npm ci
npm run dev
```

## Validation expectations

Run this before opening a pull request:

```bash
cd dr-doom
npm run debug
```

If you touch release metadata, documentation, or workflow files, make sure the paths and commands still match the real repository layout.

## Pull request guidelines

- Describe the user-facing or maintainer-facing impact
- Call out any gameplay changes explicitly
- Update docs when behavior, process, or release steps change
- Add or update changelog entries for release-facing changes
- Keep generated output such as `dist/` out of commits

## Versioning

Repository tags follow the app version format, for example `v1.5.0`. If you bump the version, update every file listed in [`docs/release-process.md`](./docs/release-process.md).

## Communication

By participating in this project, you agree to follow the repository [Code of Conduct](./CODE_OF_CONDUCT.md).
