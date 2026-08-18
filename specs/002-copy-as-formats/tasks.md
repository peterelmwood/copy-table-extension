# Tasks: Copy Table as Structured Formats

**Input**: Design documents from `/specs/002-copy-as-formats/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  
**Tests**: Required by the constitution. Every behavior phase begins with failing tests.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend the verified scaffold without weakening its deterministic build or permission gates.

<!-- squad:agent=lead tier=standard -->
- [ ] T001 Add content-bundle entry points and reviewed source/test paths to `scripts/build.mjs`, `tsconfig.json`, `eslint.config.js`, and `prettier.config.js`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T002 [P] Create reusable semantic-table fixtures and expected-output fixture layout under `tests/fixtures/tables/`
<!-- squad:agent=lead tier=full -->
- [ ] T003 Update build/package allowlists for the content bundle while preserving deterministic ZIP and safe-clean invariants in `tests/integration/build.test.ts` and `tests/integration/package.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared domain and browser message contracts required by all user stories.

<!-- squad:agent=structured-data-engineer tier=full -->
- [ ] T004 Add Copy Format, request/result, logical table, row/cell, safe-inline, and outcome types in `src/table/model.ts`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T005 [P] Add typed browser request, response, and outcome message guards in `src/browser/messages.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T006 [P] Add failing message validation and unknown-input tests in `tests/unit/messages.test.ts`
<!-- squad:agent=lead tier=standard -->
- [ ] T007 Make foundational type/message tests pass without adding runtime permissions or page access

**Checkpoint**: Shared contracts compile and reject malformed or payload-leaking failure messages.

---

## Phase 3: User Story 1 — Copy the table under the pointer (Priority: P1) 🎯 MVP

**Goal**: Provide the exact `Copy as` submenu, resolve the directly clicked table in the exact frame, and perform one clipboard write.

**Independent Test**: On pages containing multiple and nested tables, every menu action targets only the nearest table containing the right-clicked element and sends exactly one selected-format payload to the clipboard boundary.

### Tests for User Story 1

<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T008 [P] [US1] Add failing exact menu hierarchy and idempotent-creation tests in `tests/unit/context-menu.test.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T009 [P] [US1] Add failing nearest-table, nested-table, expired-target, and missing-table tests in `tests/unit/target.test.ts`
<!-- squad:agent=qa-engineer tier=full -->
- [ ] T010 [P] [US1] Add failing exact-tab/frame injection, request routing, and single clipboard-write tests in `tests/integration/browser-interaction.test.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T011 [US1] Extend manifest tests to require only `activeTab`, `clipboardWrite`, `menus`, and `scripting` and forbid host/content-script/clipboard-read authority in `tests/unit/manifest.test.ts`

### Implementation for User Story 1

<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T012 [P] [US1] Implement the exact idempotent parent/child menu contract in `src/browser/context-menu.ts`
<!-- squad:agent=structured-data-engineer tier=standard -->
- [ ] T013 [P] [US1] Implement expiring target resolution and nearest semantic-table selection in `src/content/target.ts`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T014 [US1] Implement the guarded exact-frame content message handler in `src/content/content-handler.ts`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T015 [US1] Implement the injectable Firefox clipboard-write boundary in `src/browser/clipboard.ts`
<!-- squad:agent=lead tier=full -->
- [ ] T016 [US1] Orchestrate menu startup, one-off injection, exact-frame messaging, clipboard write, and payload release in `src/background.ts`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T017 [US1] Update `src/manifest.json` and `scripts/build.mjs` for reviewed permissions and deterministic `content/content-handler.js` emission
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T018 [US1] Make US1 tests pass and validate the new manifest/content bundle with Mozilla lint

**Checkpoint**: The P1 workflow is independently operational with no broad host access.

---

## Phase 4: User Story 2 — Preserve useful table structure across formats (Priority: P2)

**Goal**: Build one logical table model and deterministic HTML, Markdown, plain-text, and CSV serializers.

**Independent Test**: Every reviewed fixture—including spans, nested tables, unsafe markup, links, quotes, pipes, and line breaks—matches four approved byte-for-byte outputs.

### Tests for User Story 2

<!-- squad:agent=qa-engineer tier=full -->
- [ ] T019 [P] [US2] Add failing matrix extraction tests for sections, headers, uneven rows, empty cells, row/column spans, nested tables, images, links, and hidden/unsafe content in `tests/unit/extract.test.ts`
<!-- squad:agent=qa-engineer tier=full -->
- [ ] T020 [P] [US2] Add failing byte-exact HTML/Markdown/text/CSV fixture tests in `tests/unit/serializers.test.ts`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T021 [P] [US2] Add failing safe-inline URL, escaping, and executable-markup rejection tests in `tests/unit/safe-inline.test.ts`

### Implementation for User Story 2

<!-- squad:agent=structured-data-engineer tier=full -->
- [ ] T022 [US2] Implement visible safe-inline token extraction and URL allowlisting in `src/table/safe-inline.ts`
<!-- squad:agent=structured-data-engineer tier=full -->
- [ ] T023 [US2] Implement rectangular logical-matrix construction with top-left span ownership and collision rejection in `src/table/extract.ts`
<!-- squad:agent=structured-data-engineer tier=standard -->
- [ ] T024 [P] [US2] Implement reconstructed allowlisted HTML output in `src/table/serialize/html.ts`
<!-- squad:agent=structured-data-engineer tier=standard -->
- [ ] T025 [P] [US2] Implement deterministic Markdown escaping and header selection in `src/table/serialize/markdown.ts`
<!-- squad:agent=structured-data-engineer tier=standard -->
- [ ] T026 [P] [US2] Implement tab/LF plain-text serialization in `src/table/serialize/text.ts`
<!-- squad:agent=structured-data-engineer tier=standard -->
- [ ] T027 [P] [US2] Implement RFC-style comma/quote/CRLF CSV serialization in `src/table/serialize/csv.ts`
<!-- squad:agent=structured-data-engineer tier=full -->
- [ ] T028 [US2] Connect extraction and selected serialization to `src/content/content-handler.ts` and make all US2 fixture tests pass

**Checkpoint**: All formats share identical geometry and deterministic reviewed outputs.

---

## Phase 5: User Story 3 — Fail safely and visibly (Priority: P3)

**Goal**: Preserve the clipboard on failure, provide bounded feedback, and discard all payload data after each attempt.

**Independent Test**: No-table, expired-target, protected-page, invalid-table, clipboard-rejection, and unexpected failures produce fixed feedback with no successful clipboard mutation or retained/logged payload.

### Tests for User Story 3

<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T029 [P] [US3] Add failing fixed-copy, replacement, timeout, and accessibility tests for in-page feedback in `tests/unit/feedback.test.ts`
<!-- squad:agent=qa-engineer tier=full -->
- [ ] T030 [P] [US3] Add failing failure-category, zero-write, rejected-write, no-retry, no-log, and payload-release tests in `tests/integration/browser-interaction.test.ts`

### Implementation for User Story 3

<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T031 [US3] Implement accessible non-blocking success/failure toasts with payload-free fixed copy in `src/content/feedback.ts`
<!-- squad:agent=lead tier=full -->
- [ ] T032 [US3] Implement bounded injection/extraction/clipboard error mapping and outcome routing in `src/background.ts`
<!-- squad:agent=webextensions-engineer tier=standard -->
- [ ] T033 [US3] Connect payload-free outcome messages to feedback and make all US3 failure tests pass in `src/content/content-handler.ts`

**Checkpoint**: Every failure is visible and leaves the pre-existing clipboard untouched.

---

## Phase 6: Performance, Documentation, and Cross-Cutting Verification

<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T034 [P] Add a 20-attempt 100×50 conversion performance trial with a 19-of-20 under-two-second gate in `tests/performance/table-conversion.test.ts`
<!-- squad:agent=qa-engineer tier=full -->
- [ ] T035 Extend remote-code, secret, source-map, permissions, content-bundle, and deterministic-archive regression checks in `tests/integration/package.test.ts` and `tests/unit/manifest.test.ts`
<!-- squad:agent=scribe tier=lightweight -->
- [ ] T036 Update install, permissions, usage, supported formats, troubleshooting, and privacy documentation in `README.md` and `specs/002-copy-as-formats/quickstart.md`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T037 Run formatting, typecheck, lint, all tests, performance gate, build, Mozilla lint, and deterministic package through `npm run verify`
<!-- squad:agent=qa-engineer tier=standard -->
- [ ] T038 Record automated evidence and preserve honest pending GUI rows in `specs/002-copy-as-formats/validation-record.md`
<!-- squad:agent=lead tier=full -->
- [ ] T039 Ask the Squad QA engineer and Spec Kit steward to review code and artifacts against `spec.md`, `plan.md`, `contracts/`, and this task list

---

## Dependencies and Execution Order

- **Setup → Foundational → US1 → US2 → US3 → Verification** is the required phase order.
- US1 establishes the browser interaction pipeline; US2 supplies its real extraction/serialization result; US3 completes trustworthy outcomes.
- Within each user story, all test tasks must be observed failing before corresponding implementation tasks begin.
- T024-T027 may run in parallel after T023 because they own separate serializer files and consume the same stable model.
- T034 and documentation drafting may proceed in parallel after US2, but final evidence waits for US3 and T035.

## MVP Scope

Phases 1-3 (T001-T018) are the smallest testable interaction MVP: exact menu, exact clicked table, one clipboard boundary, and no broad host permission. Release requires all phases because no serializer or failure path may ship partially.
