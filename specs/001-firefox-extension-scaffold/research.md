# Research: Firefox Extension Scaffold

## Decision 1: Firefox Manifest V3 is the authoritative target

**Decision**: Ship a Firefox Manifest V3 package and validate it with Mozilla's `web-ext` tooling.

**Rationale**: Manifest V3 is Firefox's current extension platform. Mozilla's tooling provides target-specific linting, temporary-run support, and deterministic archive creation.

**Alternatives considered**:

- Manifest V2: rejected because it is a legacy foundation for a new extension.
- Chrome-first manifest: rejected because this feature explicitly targets Firefox and Chrome packaging is deferred.

## Decision 2: Keep a background boundary but grant no privileged permissions

**Decision**: Include a minimal background entry point for future browser-command orchestration. Declare both `background.scripts` and `background.service_worker` against the same built module so Firefox can use its supported script form while the source layout remains ready for a later Chromium target.

**Rationale**: Mozilla documents that Firefox does not use `background.service_worker` and recommends including both properties for cross-browser Manifest V3 packages. The entry point performs no page access, network requests, clipboard operations, or persistence.

**Alternatives considered**:

- No background entry point: smaller today, but would force the next feature to introduce and validate a new architectural boundary.
- Firefox-only `background.scripts`: valid, but needlessly increases future manifest divergence.

## Decision 3: Use TypeScript plus esbuild without a UI framework

**Decision**: Author extension logic in TypeScript, bundle two entry points with esbuild, and use static HTML/CSS for the popup.

**Rationale**: The first feature needs only a readiness surface and browser boundary. A small build script is transparent, fast, and easy to reproduce; a component framework would add lifecycle and dependency complexity without user value.

**Alternatives considered**:

- Vite: capable, but its development-server and application conventions exceed the scaffold's needs.
- Unbundled JavaScript: fewer tools, but loses compile-time API/type checks and makes later extraction logic harder to evolve safely.

## Decision 4: Use Vitest, jsdom, and contract-style artifact checks

**Decision**: Use Vitest for unit and integration tests, jsdom for popup behavior, and direct inspection of `dist/` and the packaged archive for release contracts.

**Rationale**: This separates pure behavior checks from browser packaging checks while keeping one test runner. Artifact checks catch missing files and unreviewed permissions before manual Firefox loading.

**Alternatives considered**:

- Browser-only manual testing: rejected because it is not repeatable and violates the constitution's automated quality gate.
- Full browser automation in this feature: deferred because the scaffold has no page interaction; Mozilla lint plus temporary manual loading is proportionate.

## Decision 5: Build output is generated and never hand-edited

**Decision**: Treat `src/` as authoritative, generate `dist/` from a clean directory, and emit packages into `web-ext-artifacts/`. Both directories remain untracked.

**Rationale**: A clean build avoids stale files and ensures every package can be recreated from committed source plus the lockfile.

## Sources

- [Mozilla web-ext](https://github.com/mozilla/web-ext)
- [MDN background manifest key](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)
- [MDN manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
