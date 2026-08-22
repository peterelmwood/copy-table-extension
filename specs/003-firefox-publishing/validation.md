# Validation: Firefox Build and Public Publishing

## Baseline (T002)

- Date: 2026-08-19
- Runtime: Node.js 24.18.0; npm 11.16.0
- Command: `npm.cmd run verify`
- Result: PASS outside the managed filesystem sandbox; 15 test files and 113
  tests passed, formatting passed, and `web-ext lint` completed with zero
  errors and one existing Firefox service-worker compatibility warning.
- Artifact: `web-ext-artifacts/copy_table-1.0.0.zip` (10,427 bytes)
- Runner note: the restricted sandbox run failed when esbuild attempted its
  normal parent-directory traversal. The identical command passed without the
  filesystem restriction, confirming an environment boundary rather than a
  repository baseline regression.

## Implementation Checkpoints

### User Story 1 (T007)

- RED: `tests/contract/workflows.test.ts` failed because
  `.github/workflows/build.yml` did not exist.
- GREEN: the focused workflow contract passed (1 test).
- Full gate: `npm.cmd run verify` passed with 16 test files and 114 tests;
  formatting, type checking, linting, build, package, and Mozilla lint all
  completed. Mozilla lint retained the one established service-worker
  compatibility warning and reported zero errors.
- Contract evidence: pull requests and pushes to `main`, read-only contents
  permission, immutable official actions, locked install, full verification,
  30-day unsigned artifact retention, and no AMO secret references.

### User Story 2 (T016)

- RED: version/source tests could not resolve the absent release module; the
  AMO metadata and publish workflow files were absent; and the manifest still
  used the placeholder Firefox ID.
- GREEN: 5 focused files and 21 tests passed for stable tags, version
  agreement, the permanent ID, public AMO metadata, reviewer-source contents,
  and the gated listed-channel workflow.
- Full gate: `npm.cmd run verify` passed with 19 test files and 130 tests;
  Mozilla lint reported zero errors and the one established compatibility
  warning.
- Supply-chain evidence: web-ext is locked to 10.6.0 and checkout, setup-node,
  and upload-artifact use the full SHAs recorded in `research.md`.

### User Story 3 (T022)

- RED: the reviewer archive accepted an arbitrary repository destination,
  ignored a source-directory symbolic link, lacked a dry-run command, and the
  publish workflow had no explicit submitted or ambiguous outcome handling.
- GREEN: the focused source-safety and workflow-outcome suite passed 8 tests,
  including deterministic bytes, containment, symbolic-link rejection,
  credential-free dry-run behavior, and non-secret recovery summaries.
- No-credential dry run: `npm.cmd run release:dry-run -- v1.0.0` passed with 19
  test files and 135 tests and produced:
  - `copy_table-1.0.0.zip` — SHA-256
    `a336fce908da9c91178aa1e83ca7826819a7283b4f7568feddc8354b997f49ae`
  - `copy-table-source-1.0.0.zip` — SHA-256
    `7dcdfe8b67879c832e516eacda64e3707284656e8f042727bf0f0e0945831cc7`
- The dry run completed with all AMO and web-ext credential variables removed
  from its process environment.

## Cross-Cutting Verification

### Formatting and lint coverage (T023)

- Prettier coverage includes both feature workflows, AMO metadata, reviewer and
  maintainer documentation, feature 003 artifacts, scripts, source, and tests.
- ESLint excludes generated test output in addition to dependencies, coverage,
  build output, and release artifacts.
- Prettier write/check, ESLint, and `git diff --check` completed successfully.

### Static security review (T024)

- All five third-party workflow references are official GitHub actions pinned
  to 40-character commit SHAs; both workflows declare only `contents: read`.
- AMO secrets appear only in the protected publish workflow and are mapped to
  `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET` at the credential gate and submission
  steps. Summary steps contain no credential interpolation.
- Manifest permissions remain exactly `activeTab`, `clipboardWrite`, `menus`,
  `notifications`, and `scripting`, with no host permissions.
- Built JavaScript contains no remote-code markers or source-map references;
  no `.map` files were emitted.
- The reviewer archive contained 67 approved entries and zero generated,
  dependency, history, workflow, Squad, Spec Kit, environment, or credential
  paths.
- The initial audit found 14 build-tool advisories, including 3 critical issues
  through web-ext 9.4.0. Upgrading to Mozilla's current web-ext 10.6.0 removed
  all critical and moderate findings. `npm audit --omit=dev` reports zero
  shipped dependency findings. The full development audit still reports 3 high
  image-parser denial-of-service findings through the latest web-ext/addons
  linter and 2 low findings; npm offers no forward-version fix for the high
  findings. They affect build-time linting, not packaged runtime code, and the
  publishing job accepts only the protected tag revision.

The following three checkpoints were captured before post-review hardening and
are retained as historical context only. Their counts and hashes do not validate
the current tree; T025-T027 are reopened until an esbuild-capable runner can
repeat them.

### Historical pre-review reproducibility checkpoint

Two clean, credential-free dry runs wrote to separate contained output
directories and produced identical digests:

- Extension: `a336fce908da9c91178aa1e83ca7826819a7283b4f7568feddc8354b997f49ae`
- Reviewer source: `8ca52a029bb50cd0833146d706076167ca7a595dc9c8a725c8fa109e9b058625`

Each run passed 19 test files and 135 tests before producing the artifacts.

### Historical pre-review quickstart replay

- `npm.cmd ci` completed from the lockfile with web-ext 10.6.0.
- The exact default-output dry run passed 19 test files and 135 tests and wrote
  both documented archives.
- `npm.cmd run release:validate -- v1.0.1` exited 1 with the expected package
  version mismatch before building.
- The PowerShell ZIP inspection listed 67 approved entries and no documentation
  drift was found.

### Historical pre-review full verification checkpoint

`npm.cmd run verify` passed after the security/tooling update and all feature
changes: 19 test files, 137 tests, zero type or ESLint errors, full Prettier
coverage, clean deterministic build/package output, and Mozilla lint with zero
errors and the one established service-worker compatibility warning.

### Post-review release hardening

- RED: focused tests exposed the fixed-version extension archive name, missing
  immutable-tag event gate and evidence retention, and absent known-versus-
  ambiguous AMO submission classification.
- GREEN: version-derived archive naming, a newly-created/non-forced tag guard,
  retained revision/hash evidence, and the credential-safe submission wrapper
  pass the focused release suite.
- RED/GREEN security regression: the workflow contract first failed while the
  untrusted tag expression was embedded in shell source, then passed after the
  tag was moved to `RELEASE_TAG` and quoted as data. A post-version-creation
  reviewer-source upload rejection likewise first classified as known and now
  takes precedence as ambiguous.
- Latest focused result: 3 files and 26 tests passed. TypeScript, ESLint,
  Prettier, and `git diff --check` also passed on the reviewed tree. The current
  full collection contains 20 files and 147 tests.
- A fresh full run inside the managed sandbox reached Vitest after the static
  gates, where 16 files and 136 tests passed. Six build-dependent tests could
  not run because the sandbox denied esbuild's normal parent-directory access.
  The required outside-sandbox retry was unavailable because the runner's
  approval quota was exhausted; this is an execution limitation, not a
  replacement claim for the prior complete 137-test pass above.

### Traceability closure (T028)

- Specification: 18 functional, 5 privacy/permission, and 8 measurable success
  requirements remain present with no clarification markers.
- Planning: plan, research, data model, quickstart, and all three contracts are
  present and agree on the stable tag, permanent ID, public listed channel,
  protected environment, immutable action pins, deterministic artifacts, and
  submitted-not-published outcome boundary.
- Implementation: both workflows, release module, metadata, license, reviewer
  instructions, and all release tests are present; no placeholder Firefox ID or
  stale web-ext 9.4.0 decision remains.
- Reviewer-source safety explicitly rejects symbolic links plus environment and
  credential files even when they appear under an otherwise allowed source
  directory.
- Tasks: 25 of 28 feature tasks are complete and retain their Squad routing
  annotations. T025-T027 remain open solely for current-tree reproducibility,
  quickstart replay, and full verification on an esbuild-capable runner.

## Test timeout defects and current-tree reproducibility (2026-08-20)

Two integration tests declared timeouts shorter than the work they awaited, so
both failed on any run that was not unusually fast. Neither defect was
environmental; both were reproduced and measured directly.

- `tests/integration/package.test.ts` used the 5s default timeout while the
  verification it spawns takes 5-8s. Measured directly, outside Vitest, with the
  malformed fixture in place: 6813ms, 5285ms, and 7064ms, each correctly exiting
  1 at the formatting gate. Raised to 60s; the test then passed four consecutive
  runs at 5.37-5.86s.
- `tests/integration/release-source-package.test.ts` used a 60s timeout while
  the complete nested verification it spawns took 83922ms. Raised to 300s.

A `.gitignore` entry for `src/.verify-failure.fixture.ts` was evaluated and
rejected. Prettier 3 reads `.gitignore` by default, so the entry hid the fixture
from the formatting gate, which allowed the spawned verification to continue
into the test collection and re-enter itself. The fixture is instead excluded
locally through `.git/info/exclude`, which git honors and Prettier does not, and
`AMO_BUILD.md` now documents deleting an orphaned fixture after an interrupted
run.

### Current-tree reproducibility (T025)

Two consecutive credential-free dry runs on the current tree produced identical
digests, each passing 20 test files and 147 tests:

- Extension: `a336fce908da9c91178aa1e83ca7826819a7283b4f7568feddc8354b997f49ae`
- Reviewer source: `a611a32a48eb9133c47d3f2e5703d32d04bce51bc9a309dddff57b86a39d2c68`

The extension digest is unchanged from the historical checkpoint above, because
the timeout and documentation changes touch only tests and reviewer
instructions. The reviewer-source digest supersedes the historical
`8ca52a02...` value, because `AMO_BUILD.md` and both test files are inputs to
the source archive.

### Full verification (T027)

`npm.cmd run verify` passed on the current tree: 20 test files, 147 tests, zero
TypeScript or ESLint errors, complete Prettier coverage, and Mozilla lint with
zero errors and the one established service-worker compatibility warning.

T026 remains open; the quickstart replay has not been repeated on this tree.
