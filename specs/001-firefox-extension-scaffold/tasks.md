# Tasks: Firefox Extension Scaffold

**Input**: Design documents from `/specs/001-firefox-extension-scaffold/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Required by the project constitution. Test tasks appear before their corresponding implementation tasks.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the toolchain and deterministic project layout used by every user story.

<!-- squad:agent=lead tier=standard -->
- [ ] T001 Add extension metadata, locked development dependencies, and build/quality scripts in `package.json` and `package-lock.json`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T002 [P] Configure strict TypeScript and WebExtension types in `tsconfig.json`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T003 [P] Configure Vitest/jsdom, ESLint, and Prettier in `vitest.config.ts`, `eslint.config.js`, and `prettier.config.js`
<!-- squad:agent=lead tier=full -->
- [ ] T004 Create a clean deterministic asset-copy and bundle pipeline in `scripts/build.mjs`

---

## Phase 2: User Story 1 — Install a valid Firefox extension (Priority: P1) 🎯 MVP

**Goal**: Produce a Firefox-loadable Manifest V3 extension with no privileged permissions.

**Independent Test**: Run a clean build and Mozilla lint, then load `dist/manifest.json` as a temporary Firefox add-on without errors or unexpected permission prompts.

### Tests for User Story 1

<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T005 [P] [US1] Add failing manifest contract tests for identity, Firefox target, referenced files, and zero permissions in `tests/unit/manifest.test.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T006 [P] [US1] Add failing clean-build and required-file integration tests in `tests/integration/build.test.ts`

### Implementation for User Story 1

<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T007 [US1] Add the reviewed Firefox-first Manifest V3 definition in `src/manifest.json`
<!-- squad:agent=webextensions-engineer tier=lightweight -->
- [ ] T008 [US1] Add the no-op browser command boundary in `src/background.ts`
<!-- squad:agent=lead tier=standard -->
- [ ] T009 [US1] Complete build entry-point bundling and asset emission in `scripts/build.mjs`
<!-- squad:agent=lead tier=standard -->
- [ ] T010 [US1] Make manifest and build tests pass, then validate `dist/` with `npm run lint:extension`

**Checkpoint**: A permission-minimal Firefox extension installs and starts independently of popup readiness styling.

---

## Phase 3: User Story 2 — Recognize the extension and its readiness (Priority: P2)

**Goal**: Present a compact, accessible popup that identifies the product, readiness state, deferred capability, and installed version.

**Independent Test**: Open the action popup and verify all required copy, semantic labels, keyboard focus behavior, and runtime-derived version in isolation.

### Tests for User Story 2

<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T011 [P] [US2] Add failing popup DOM and accessibility tests in `tests/unit/popup.test.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T012 [P] [US2] Add failing runtime metadata adapter tests in `tests/unit/runtime.test.ts`

### Implementation for User Story 2

<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T013 [US2] Add a typed, injectable browser runtime metadata adapter in `src/browser/runtime.ts`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T014 [US2] Add semantic popup markup and readiness copy in `src/popup/index.html`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T015 [US2] Add popup initialization and runtime-derived version rendering in `src/popup/popup.ts`
<!-- squad:agent=webextensions-engineer tier=lightweight -->
- [ ] T016 [US2] Add compact keyboard-visible popup styling in `src/popup/popup.css`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T017 [US2] Make popup tests pass and manually smoke-test the temporary add-on in Firefox

**Checkpoint**: The popup is usable and fully testable without future page-extraction behavior.

---

## Phase 4: User Story 3 — Reproduce and verify the scaffold (Priority: P3)

**Goal**: Give contributors one documented path to recreate, validate, run, and package the exact extension artifact.

**Independent Test**: From a clean checkout, install dependencies, run `npm run verify` twice, and confirm the same file set plus one lint-clean Firefox archive.

### Tests for User Story 3

<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T018 [P] [US3] Add failing packaged-archive allowlist and denylist tests in `tests/integration/package.test.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T019 [P] [US3] Add failing repeated-build equivalence coverage in `tests/integration/build.test.ts`

### Implementation for User Story 3

<!-- squad:agent=lead tier=standard -->
- [ ] T020 [US3] Implement safe clean, verify, temporary-run, and package command orchestration in `package.json` and `scripts/build.mjs`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T021 [US3] Make archive and repeated-build tests pass without tracking generated output
<!-- squad:agent=scribe tier=lightweight -->
- [ ] T022 [US3] Document install, verify, temporary Firefox loading, permissions, and package output in `README.md`
<!-- squad:agent=scribe tier=lightweight -->
- [ ] T023 [US3] Reconcile `specs/001-firefox-extension-scaffold/quickstart.md` with the verified commands and observed Firefox workflow

**Checkpoint**: A new contributor can reproduce and inspect the same extension artifact using only committed files.

---

## Phase 5: Polish and Cross-Cutting Concerns

<!-- squad:agent=qa-engineer tier=lightweight -->
- [ ] T024 [P] Run Prettier over committed source/configuration and correct any formatting drift
<!-- squad:agent=lead tier=full -->
- [ ] T025 Review manifest and archive output for secrets, source maps, remote code, unrequested permissions, and generated-file leakage
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T026 Run the complete `npm run verify` pipeline and record any environment-only manual Firefox limitation in `specs/001-firefox-extension-scaffold/quickstart.md`
<!-- squad:agent=lead tier=full -->
- [ ] T027 Ask the Squad QA engineer and Spec Kit steward to review implementation against `spec.md`, `plan.md`, `contracts/`, and this task list

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **US1 (Phase 2)**: Depends on Phase 1 and establishes the loadable MVP.
- **US2 (Phase 3)**: Depends on the US1 build/manifest path; its test and source files are otherwise isolated.
- **US3 (Phase 4)**: Depends on US1 and US2 because it verifies the complete artifact.
- **Polish (Phase 5)**: Depends on all user stories.

### User Story Dependencies

- **US1**: No dependency on another story.
- **US2**: Uses the package and action manifest created by US1, but remains independently testable at the DOM boundary.
- **US3**: Verifies the completed US1 + US2 artifact and contributor workflow.

### Parallel Opportunities

- T002 and T003 can run in parallel after T001.
- T005 and T006 can run in parallel before US1 implementation.
- T011 and T012 can run in parallel before US2 implementation.
- T018 and T019 can run in parallel before US3 implementation.
- T024 can run alongside the final security/artifact review once implementation is stable.

## Implementation Strategy

Deliver US1 first as the smallest installable Firefox MVP. Add the popup readiness surface in US2, then lock down reproducible packaging and contributor documentation in US3. Within each story, write and observe failing tests before implementing the behavior, keep commits scoped to completed task groups, and treat Spec Kit artifacts as the Squad's acceptance authority.
