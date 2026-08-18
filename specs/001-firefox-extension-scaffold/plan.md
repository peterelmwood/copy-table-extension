# Implementation Plan: Firefox Extension Scaffold

**Branch**: `001-firefox-extension-scaffold` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-firefox-extension-scaffold/spec.md`

## Summary

Create the installable Firefox-first foundation for Copy Table: a minimal Manifest V3 WebExtension with a popup, a background boundary, deterministic build/package commands, and automated checks for manifest validity, permissions, UI readiness, and archive contents. The scaffold intentionally contains no page-reading or clipboard behavior; those capabilities belong to later specs.

## Technical Context

**Language/Version**: TypeScript 7.0.2 on Node.js 24.18.0  
**Primary Dependencies**: WebExtension browser APIs, esbuild 0.28.2, Mozilla `web-ext`, Vitest 4.1.10, jsdom  
**Storage**: None  
**Testing**: Vitest unit/integration tests plus `web-ext lint` and packaged-archive inspection  
**Target Platform**: Firefox desktop, current stable release; architecture remains compatible with a later Chromium manifest/build target  
**Project Type**: Browser extension  
**Performance Goals**: Clean build and validation complete within 30 seconds on a typical developer workstation; popup becomes usable within 1 second of opening  
**Constraints**: No host permissions, no page-content access, no clipboard access, no remote code, no telemetry, deterministic generated artifact  
**Scale/Scope**: One extension package, one popup surface, one background entry point, fewer than 20 source/test files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                     | Gate                                                                 | Result                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Explicit Interaction and User Agency          | Scaffold must not inspect pages or copy data                         | PASS — no content script, host permission, or clipboard permission                         |
| Local-First Data Stewardship                  | No captured data leaves the browser                                  | PASS — feature has no capture path, network dependency, telemetry, or persistence          |
| Least Privilege and Firefox-First Portability | Permissions must be minimal and Firefox must be the validated target | PASS — zero privileged permissions; Firefox manifest is authoritative                      |
| Semantic Determinism and Format Fidelity      | Generated package and metadata must be reproducible                  | PASS — one clean build path and archive-content tests                                      |
| Test-First Spec-Driven Delivery               | Tests precede implementation and map to acceptance criteria          | PASS — manifest, popup, build, and package tests are required before source implementation |

Post-design re-check: **PASS**. The research and contracts introduce no constitutional exception. No Complexity Tracking entry is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-firefox-extension-scaffold/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── build-verification.md
│   └── extension-manifest.md
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── background.ts
├── manifest.json
├── browser/
│   └── runtime.ts
└── popup/
    ├── index.html
    ├── popup.css
    └── popup.ts

scripts/
└── build.mjs

tests/
├── integration/
│   ├── build.test.ts
│   └── package.test.ts
└── unit/
    ├── manifest.test.ts
    └── popup.test.ts

dist/                    # generated, ignored
web-ext-artifacts/       # generated, ignored
eslint.config.js
prettier.config.js
tsconfig.json
vitest.config.ts
package.json
```

**Structure Decision**: Use a single browser-extension project with small explicit browser and popup boundaries. A custom build script bundles TypeScript entry points and copies reviewed static assets into `dist/`; no application framework or monorepo layer is justified for this scaffold.

## Delivery Phases

### Phase 0 — Research

- Confirm Firefox Manifest V3 background behavior and manifest constraints.
- Select the smallest deterministic build, validation, test, and packaging toolchain.
- Define the portability boundary for a future Chromium target without producing a Chrome package now.

### Phase 1 — Design and Contracts

- Define extension artifact, readiness state, and permission-declaration entities.
- Specify the authoritative manifest contract and build-verification contract.
- Document a clean-room quickstart from install through temporary Firefox loading.

### Phase 2 — Test-First Implementation

- Add failing manifest and popup tests.
- Add failing build/package integration tests.
- Implement source structure and build tooling until tests pass.
- Run typecheck, lint, unit/integration tests, `web-ext lint`, build, and package verification.

## Complexity Tracking

No constitutional violations or justified exceptions.
