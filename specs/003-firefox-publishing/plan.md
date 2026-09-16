# Implementation Plan: Firefox Build and Public Publishing

**Branch**: `003-firefox-publishing` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-firefox-publishing/spec.md`

## Summary

Add two separately secured GitHub Actions workflows: one verifies pull requests
and main-line changes and retains an unsigned extension package for 30 days;
the other accepts only immutable stable version tags, rebuilds from a clean
checkout, validates tag/package/manifest agreement, creates a deterministic
reviewer-source archive, and submits the listed extension to AMO under
`copy-table@peterelmwood.com`. Keep release logic in a tested Node module so the
workflow files remain declarative and dry runs never require credentials.

## Technical Context

**Language/Version**: JavaScript ES modules and TypeScript 7.0.2 on Node.js 24.18.0

**Primary Dependencies**: Mozilla `web-ext` 10.6.0, JSZip 3.10.1, YAML 2.9.0,
GitHub-hosted Actions runners, official GitHub checkout/setup-node/artifact actions

**Storage**: No application storage; ephemeral `dist/`, `web-ext-artifacts/`,
workflow artifacts, and AMO submission state only

**Testing**: Vitest 4.1.10 unit, integration, and contract tests; TypeScript,
ESLint, Prettier, `web-ext lint`, archive inspection, and workflow YAML parsing

**Target Platform**: GitHub Actions on `ubuntu-latest`, Firefox desktop and the
public addons.mozilla.org listed channel

**Project Type**: Browser extension with repository release automation

**Performance Goals**: A prepared local dry run completes within 10 minutes;
ordinary CI completes within the repository's normal hosted-runner window;
artifact retention is 30 days

**Constraints**: Two-workflow separation; stable `vX.Y.Z` tags only; clean
rebuild before submission; read-only repository permissions; credentials only
in the `firefox-production` environment; deterministic extension and reviewer
source archives; no new browser permissions, telemetry, or page-data transfer

**Scale/Scope**: One Firefox extension, one public AMO listing, two workflows,
one release module, four release-focused test files, and owner setup documentation

## Constitution Check

_GATE: Passed before Phase 0 research and re-checked after Phase 1 design._

- **Explicit interaction**: Runtime capture behavior is unchanged. Repository
  publication begins only when an authorized maintainer creates a new stable
  version tag; pull requests and ordinary pushes cannot publish.
- **Local-first data handling**: The workflows transfer only repository source,
  generated extension files, listing metadata, and release status. No captured
  page or clipboard content enters artifacts, logs, telemetry, or AMO.
- **Least privilege**: Existing browser permissions remain unchanged and are
  re-verified by the manifest contract. Workflows use read-only repository
  permissions; publishing secrets are scoped to `firefox-production` and only
  the publishing job references that environment.
- **Firefox-first portability**: Runtime extraction and serialization are not
  modified. Firefox identity and AMO submission remain in manifest/release
  boundaries, leaving browser-global-free domain modules intact.
- **Deterministic fidelity**: The existing extension archive keeps its fixed
  entry order, timestamps, modes, and compression. Reviewer source uses the
  same deterministic ZIP principles and an explicit allowlist; generated and
  secret-bearing paths are rejected.
- **Test-first delivery**: Version parsing, version agreement, source allowlist,
  metadata, workflow triggers, permissions, secret isolation, retention, and
  failure guidance receive failing tests before production changes.
- **Spec Kit and Squad traceability**: The accepted spec and checklist are
  committed. This plan and its design artifacts precede `tasks.md`; the
  release-engineer, webextensions-engineer, qa-engineer, scribe, and lead roles
  cover implementation and review, and tasks will be routed before work begins.

Post-design re-check: all gates remain satisfied. No constitution exception is
required.

## Project Structure

### Documentation (this feature)

```text
specs/003-firefox-publishing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── build-workflow.md
│   ├── publish-workflow.md
│   └── release-artifacts.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/workflows/
├── build.yml
├── publish-firefox.yml
└── squad-heartbeat.yml

scripts/
├── artifact-path.mjs
├── build.mjs
└── release.mjs

src/
└── manifest.json

tests/
├── contract/
│   ├── amo-metadata.test.ts
│   └── workflows.test.ts
├── integration/
│   └── release-source-package.test.ts
└── unit/
    ├── manifest.test.ts
    └── release-version.test.ts

amo-metadata.json
AMO_BUILD.md
LICENSE
package.json
package-lock.json
README.md
```

**Structure Decision**: Preserve the existing single-project extension layout.
Add one focused release module and release-specific contract/integration tests;
keep CI orchestration in two small workflow files and owner/reviewer guidance
in root documentation. No runtime module or new service boundary is needed.

## Complexity Tracking

No constitution violations or complexity exceptions.
