# Batch 3 release-gate report

## T018–T021: test-first release artifact behavior

- Added `tests/integration/package.test.ts`. Its first run failed as intended:
  `scripts/build.mjs package` was not implemented. It now proves that a clean
  checkout produces one Firefox ZIP/XPI archive containing only the five
  reviewed runtime files.
- Added repeated-build coverage in `tests/integration/build.test.ts`, comparing
  SHA-256 content hashes and relative file names across two builds. The existing
  clean build behavior already satisfied that test once it was introduced.
- Centralized clean, build, Firefox lint, package, temporary Firefox run, and
  complete verification orchestration in `scripts/build.mjs`. `package` and
  `start:firefox` always build first; `verify` cleans first and packages only
  after all required automated gates pass.

## T022–T024: contributor guidance and formatting

- Added `README.md` with install, verification, temporary Firefox loading,
  archive inspection, permission/privacy, and Firefox-boundary guidance.
- Updated the quickstart with the verified command sequence, archive contents,
  and an explicit statement that the manual Firefox temporary-load/popup smoke
  test is not represented as an automated GUI pass.
- Ran Prettier on the changed source, configuration, test, and documentation
  artifacts; a subsequent full format check passed.

## T025: security and artifact review

- Reviewed `src/manifest.json`, `dist/`, and the generated archive. The manifest
  has no permissions, host permissions, optional permissions, or content
  scripts. The static scan found no secrets, source maps, remote-code URLs,
  network calls, or browser storage usage.
- `dist/` and `web-ext-artifacts/` contain only generated, ignored files and no
  tracked output. The archive file list is exactly `background.js`,
  `manifest.json`, `popup/index.html`, `popup/popup.css`, and
  `popup/popup.js` (plus the ZIP directory entry `popup/`).

## T026–T027: verification and specification review

- Completed the documented verification pipeline on 2026-08-18 with 5 test
  files and 11 tests passing, successful TypeScript, ESLint, Prettier, Firefox
  lint, build, and packaging gates. This host's `cmd.exe` cannot resolve
  `node`, so the literal `npm run verify` was rerun with npm's shell set for
  that process to PowerShell; no repository configuration was changed.
- Firefox lint exits zero and reports one documented non-blocking
  `BACKGROUND_SERVICE_WORKER_IGNORED` warning. Firefox uses the reviewed
  `background.scripts` entry; the matching service-worker declaration is
  required by the existing manifest contract.
- QA and Spec Kit artifact traceability review checked the implementation
  against `spec.md`, `plan.md`, both contracts, the constitution, and T018–T027.
  The automated FR-001/004–010 boundaries and build contract are covered.
  FR-002 and FR-003 still require the documented interactive Firefox
  temporary-load and popup smoke check; they are explicitly not claimed as
  completed by this non-GUI verification.

## Final-review fix wave (I1–I3, M1–M2; I4 evidence gate)

- **I1:** The shipped manifest, Gecko ID, popup title/heading, package metadata,
  tests, contracts, model, plan, and contributor documentation now identify the
  product as **Copy Table**. “Copy Structured Data” remains only a broader
  descriptive concept where appropriate.
- **I2:** Release packaging now uses JSZip with a fixed ordered allowlist,
  1980-01-01 timestamp, Unix `0644` file mode, DEFLATE level 9, and non-streamed
  output. The integration test waits across the legacy timestamp boundary and
  compares SHA-256 hashes from two complete package runs.
- **I3:** Archive tests package into OS-temporary directories instead of
  `web-ext-artifacts/`. `verify` cleans generated output in its failure handler;
  a test creates an intentionally unformatted but type-safe source fixture,
  proves verification fails before its test stage, and verifies no release
  artifact survives.
- **M1/M2:** README and quickstart now contain prerequisite, stale-output,
  Firefox loading/error-details, and expected-warning troubleshooting. Manifest
  tests deny externally connectable, native messaging, web-accessible-resource,
  CSP, and update surfaces; the package test checks emitted JavaScript for URL,
  networking, and dynamic-code markers.
- **I4:** `validation-record.md` is a concrete pending owner template for five
  clean checkouts, timing, Firefox versions, temporary install, popup/keyboard
  observations, errors, and interventions. No GUI or five-attempt outcome is
  claimed here.
- Fresh final command evidence: with this host's PowerShell npm-shell override,
  `npm run verify` passed on 2026-08-18 with 5 test files and 13 tests,
  TypeScript, ESLint, Prettier, Mozilla lint, build, and deterministic package
  creation. Mozilla lint exited zero with the already documented
  `BACKGROUND_SERVICE_WORKER_IGNORED` compatibility warning.

## Safety containment fix: artifact override

- `COPY_TABLE_ARTIFACTS_DIR` is now an optional **relative child path** under
  the repository-local `.copy-table-test-output/` root only. Absolute values,
  `.`, the repository root, parent traversal, and paths outside that root are
  rejected before `clean()` can delete anything.
- Existing test-output roots and every existing component below them are checked
  with `lstat`; symbolic-link roots or traversal components are rejected, and
  the resolved test-output root must remain strictly inside the repository.
- Regression coverage proves rejection of `.`, repository root, parent
  traversal, and an arbitrary absolute path, while a valid contained test path
  successfully packages. The focused package suite passed 8/8 tests.
- Fresh final evidence: with the documented PowerShell npm-shell override,
  `npm run verify` passed on 2026-08-18 with 5 test files and 18 tests plus
  TypeScript, ESLint, Prettier, Mozilla lint, build, and package. Mozilla lint
  exited zero with the documented `BACKGROUND_SERVICE_WORKER_IGNORED` warning.
