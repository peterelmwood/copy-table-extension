---
description: "Task list for Firefox build and public publishing"
---

# Tasks: Firefox Build and Public Publishing

**Input**: Design documents from `/specs/003-firefox-publishing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are REQUIRED. Write each test before its corresponding
implementation and verify that it fails for the intended reason.

**Organization**: Tasks are grouped by user story so each workflow increment
can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no
  dependency on an incomplete task
- **[Story]**: Maps the task to User Story 1, 2, or 3
- Every task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add only the test tooling required to validate workflow YAML.

- [x] T001 Add direct `yaml` 2.9.0 development dependency for workflow contract parsing in `package.json` and `package-lock.json`

<!-- squad:agent=release-engineer tier=standard -->

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish current evidence and immutable third-party action inputs
before any workflow is authored.

**⚠️ CRITICAL**: No user story work begins until both tasks complete.

- [x] T002 Run the unchanged baseline `npm.cmd run verify` and record its result, Node/npm versions, and artifact names in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=standard -->

- [x] T003 Resolve current compatible full commit SHAs for official checkout, setup-node, and upload-artifact actions and replace the implementation-time placeholder decision in `specs/003-firefox-publishing/research.md`

<!-- squad:agent=release-engineer tier=full -->

**Checkpoint**: Baseline behavior and immutable workflow dependencies are documented.

---

## Phase 3: User Story 1 — Verify Every Proposed Change (Priority: P1) 🎯 MVP

**Goal**: Pull requests and pushes to `main` run the complete verification
pipeline and retain one unsigned extension artifact for 30 days without any
publishing environment or secret access.

**Independent Test**: Parse the workflow and confirm its triggers, read-only
permissions, immutable official actions, locked install, complete verification,
30-day artifact retention, and absence of AMO credentials; then run the full
repository verification locally.

### Tests for User Story 1 (REQUIRED) ⚠️

> Write this test first and observe the expected failure because `build.yml`
> does not exist.

- [x] T004 [US1] Add failing verification-workflow contract tests for triggers, permissions, pins, commands, retention, and secret isolation in `tests/contract/workflows.test.ts`

<!-- squad:agent=qa-engineer tier=standard -->

### Implementation for User Story 1

- [x] T005 [US1] Create the read-only pull-request/main verification workflow in `.github/workflows/build.yml` to satisfy `contracts/build-workflow.md`

<!-- squad:agent=release-engineer tier=standard -->

- [x] T006 [P] [US1] Document verification runs and the 30-day unsigned artifact in `README.md`

<!-- squad:agent=scribe tier=lightweight -->

- [x] T007 [US1] Run `tests/contract/workflows.test.ts` and the complete `npm.cmd run verify` pipeline, then record the US1 checkpoint in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=standard -->

**Checkpoint**: User Story 1 is independently functional and cannot publish.

---

## Phase 4: User Story 2 — Submit a Stable Public Firefox Release (Priority: P2)

**Goal**: A matching stable tag produces verified extension and reviewer-source
artifacts and submits them to the public AMO listing using isolated credentials.

**Independent Test**: Validate accepted and rejected tags locally, inspect the
manifest/metadata/source package contracts, parse the publish workflow, and
confirm no external request occurs when a pre-submission gate fails.

### Tests for User Story 2 (REQUIRED) ⚠️

> Write all four contracts before their corresponding implementation and
> observe failures caused by the missing release module/files/workflow.

- [x] T008 [P] [US2] Add failing stable-tag and package/manifest version agreement tests in `tests/unit/release-version.test.ts`

<!-- squad:agent=qa-engineer tier=standard -->

- [x] T009 [P] [US2] Add failing permanent Firefox ID and AMO summary/category/license tests in `tests/contract/amo-metadata.test.ts` and `tests/unit/manifest.test.ts`

<!-- squad:agent=webextensions-engineer tier=standard -->

- [x] T010 [P] [US2] Add failing reviewer-source allowlist and basic archive-content tests in `tests/integration/release-source-package.test.ts`

<!-- squad:agent=qa-engineer tier=standard -->

- [x] T011 [US2] Extend `tests/contract/workflows.test.ts` with failing publish trigger, environment, permission, concurrency, gate, source-upload, and credential-mapping tests

<!-- squad:agent=qa-engineer tier=standard -->

### Implementation for User Story 2

- [x] T012 [US2] Implement exported stable-tag/version validation and deterministic reviewer-source packaging in `scripts/release.mjs`

<!-- squad:agent=release-engineer tier=standard -->

- [x] T013 [P] [US2] Replace the placeholder Firefox ID in `src/manifest.json` and add public listing data in `amo-metadata.json`, `LICENSE`, and `AMO_BUILD.md`

<!-- squad:agent=webextensions-engineer tier=standard -->

- [x] T014 [US2] Add `release:validate` and `release:source` command entry points and formatting inputs in `package.json` and `package-lock.json`

<!-- squad:agent=release-engineer tier=standard -->

- [x] T015 [US2] Create the tag-driven, read-only, `firefox-production` publishing workflow in `.github/workflows/publish-firefox.yml` to satisfy `contracts/publish-workflow.md`

<!-- squad:agent=release-engineer tier=full -->

- [x] T016 [US2] Run the US2 unit, contract, and integration tests plus `npm.cmd run verify`, then record the US2 checkpoint in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=standard -->

**Checkpoint**: User Stories 1 and 2 work independently; only an eligible tag can reach AMO submission.

---

## Phase 5: User Story 3 — Audit and Recover a Release (Priority: P3)

**Goal**: Maintainers can reproduce artifacts without credentials, distinguish
submission from publication, and recover safely from ambiguous failures.

**Independent Test**: Run the no-credential dry run twice, compare hashes,
exercise forbidden paths and symbolic links, and parse workflow success/failure
summaries to confirm honest pending and recovery language.

### Tests for User Story 3 (REQUIRED) ⚠️

> Extend tests first and observe failures for determinism, symlink rejection,
> dry-run orchestration, and missing outcome guidance.

- [x] T017 [US3] Extend `tests/integration/release-source-package.test.ts` with failing reproducibility, forbidden-path, symbolic-link, and no-credential dry-run tests

<!-- squad:agent=qa-engineer tier=standard -->

- [x] T018 [US3] Extend `tests/contract/workflows.test.ts` with failing submitted-not-published summary, ambiguous-failure recovery, noninteractive, and approval-wait tests

<!-- squad:agent=qa-engineer tier=standard -->

### Implementation for User Story 3

- [x] T019 [US3] Complete deterministic source safety checks and implement `release:dry-run` orchestration in `scripts/release.mjs` and `package.json`

<!-- squad:agent=release-engineer tier=standard -->

- [x] T020 [US3] Add submitted/pending and ambiguous-failure job summaries without credential interpolation in `.github/workflows/publish-firefox.yml`

<!-- squad:agent=release-engineer tier=standard -->

- [x] T021 [P] [US3] Complete owner setup, reviewer build, dry-run, and recovery instructions in `AMO_BUILD.md`, `README.md`, and `specs/003-firefox-publishing/quickstart.md`

<!-- squad:agent=scribe tier=lightweight -->

- [x] T022 [US3] Run all US3 tests and one no-credential dry run, then record the US3 checkpoint in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=standard -->

**Checkpoint**: All user stories are independently functional and operationally auditable.

---

## Phase 6: Polish and Cross-Cutting Verification

**Purpose**: Close formatting, security, reproducibility, documentation, and
Spec Kit traceability gates across all stories.

- [x] T023 Update Prettier and ESLint coverage for `.github/workflows/`, release metadata, scripts, tests, and docs in `package.json` and `eslint.config.js`

<!-- squad:agent=release-engineer tier=standard -->

- [x] T024 Perform a static security review for action pins, permissions, secret references, manifest permissions, remote code, source-map leakage, and archive exclusions; record evidence in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=full -->

- [x] T025 Run two clean `release:dry-run` executions, compare extension and source SHA-256 hashes, and record reproducibility evidence in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=standard -->

- [ ] T026 Execute every command in `specs/003-firefox-publishing/quickstart.md` that does not contact AMO and reconcile any documentation drift in `README.md`, `AMO_BUILD.md`, and `specs/003-firefox-publishing/quickstart.md`

<!-- squad:agent=scribe tier=standard -->

- [x] T027 Run the final `npm.cmd run verify`, confirm all release tests and workflow contracts pass, and record exact counts and outputs in `specs/003-firefox-publishing/validation.md`

<!-- squad:agent=qa-engineer tier=standard -->

- [x] T028 Review `specs/003-firefox-publishing/spec.md`, `plan.md`, `contracts/`, and `tasks.md` against the implementation; fix traceability gaps and mark every completed task `[X]` in `specs/003-firefox-publishing/tasks.md`

<!-- squad:agent=lead tier=full -->

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on T001 and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2.
- **User Story 2 (Phase 4)**: Depends on Phase 2; does not require User Story 1
  behavior, though implementation proceeds in priority order.
- **User Story 3 (Phase 5)**: Depends on the release module and publish workflow
  created for User Story 2.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independently delivers safe verification CI.
- **User Story 2 (P2)**: Independently delivers gated public submission using
  the shared package/test tooling from setup.
- **User Story 3 (P3)**: Extends User Story 2 artifacts with reproducibility,
  dry-run, status, and recovery guarantees.

### Within Each User Story

- Tests are written and observed failing for the intended missing behavior.
- Minimal implementation makes the focused tests pass.
- Refactoring occurs only while focused and full verification stay green.
- The story checkpoint is recorded before moving to the next priority.

### Parallel Opportunities

- T008, T009, and T010 touch separate test/contract surfaces and may be written
  in parallel before the shared implementation begins.
- T013 can proceed after its failing metadata/manifest tests while T012 handles
  the separate release module.
- T006 and T021 are documentation work on separate phases, not simultaneous
  edits to the same file.
- Security review, reproducibility evidence, and quickstart execution are kept
  sequential because they inspect shared generated output.

---

## Parallel Example: User Story 2

```text
Task T008: Write stable-tag/version agreement tests in tests/unit/release-version.test.ts
Task T009: Write manifest and AMO metadata tests in tests/contract/amo-metadata.test.ts and tests/unit/manifest.test.ts
Task T010: Write source package integration tests in tests/integration/release-source-package.test.ts
```

After all three are observed failing, implement T012 and T013 without parallel
edits to shared package or workflow files.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete setup and foundational evidence.
2. Write the build workflow contract test and observe RED.
3. Implement only `build.yml` and its documentation.
4. Verify the workflow contract and full repository pipeline.

### Incremental Delivery

1. User Story 1 adds safe verification CI.
2. User Story 2 adds strict stable release validation and public submission.
3. User Story 3 adds deterministic reviewer evidence, dry runs, and recovery.
4. Cross-cutting review closes security and traceability gates.

### Squad Execution

1. Route open tasks with capability matching and annotate `tasks.md`.
2. Confirm domain coverage and Squad CLI health before implementation.
3. Execute phase-by-phase, respecting test-first ordering and shared-file locks.
4. Record deviations in Spec Kit artifacts before changing scope.

## Notes

- `[P]` means separate files and no dependency on unfinished shared work.
- The AMO owner account, environment creation, credentials, and Mozilla review
  remain owner/external actions; local implementation must not fabricate them.
- A successful publish workflow proves submission, not public availability.
- Commit only feature-scoped files; preserve unrelated untracked workspace files.
