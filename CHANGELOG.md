# Changelog

All notable changes to this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows repository tags such as `v1.5.0`.

## [Unreleased]

### Added

- Maintainer-facing documentation for architecture, testing, release process, contributing, and security
- GitHub community health files, issue forms, PR template, CODEOWNERS, and Dependabot automation

### Changed

- CI/CD now runs `npm ci` and `npm run debug` from `dr-doom/` before GitHub Pages deploys and tagged releases
- Package metadata, local tooling configuration, and repository hygiene files were standardized for maintenance

### Fixed

- Pointer-lock, blur, and pause edge cases that could leave input state latched after focus changes
- Checkpoint and local save normalization to reduce restore desyncs and localStorage corruption fallout
- Audio resume and focus-muting behavior so Web Audio reliably recovers after user interaction
- Ammo-state restoration and related runtime guards for more stable boss checkpoint recovery

## [1.5.0] - 2026-04-12

### Added

- Full starting arsenal at spawn with stocked ammo and tactical resupply points
- Boss checkpoints, minimap objective guidance, ranked mission debriefs, and secret-room content
- Progression validation and smoke checks for release correctness

### Changed

- Boss transition corridor visuals and blackout handling for better stability
- HUD readability, objective pressure, and boss navigation fail-safes
- Persistent operator settings for controls, look tuning, FOV, and audio mix
