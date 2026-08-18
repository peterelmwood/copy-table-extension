# Implementation Plan: Copy Table as Structured Formats

**Branch**: `002-copy-as-formats` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-copy-as-formats/spec.md`

## Summary

Extend the Firefox-first Copy Table scaffold with a `Copy as` context-menu hierarchy for HTML, Markdown, plain text, and CSV. A menu click grants temporary active-tab authority, injects a guarded content handler into the exact supported clicked frame, resolves the clicked element through Firefox's target-element handle, constructs one logical table model, and returns the selected serialization to the background page for a single clipboard write. Firefox message responses use the runtime listener's Promise contract. Success/failure feedback is shown in-page; if Firefox rejects injection before a page receiver exists, a fixed extension notification reports the restriction, and if a started operation loses its message/outcome channel, one fixed payload-free notification reports delivery loss after payload release. Cross-origin embedded documents are explicitly unsupported without broader host authority. No table content is persisted, logged, or transmitted.

## Technical Context

**Language/Version**: TypeScript 7.0.2 on Node.js 24.18.0  
**Primary Dependencies**: Firefox WebExtension Manifest V3 APIs, esbuild 0.28.2, Vitest 4.1.10, jsdom  
**Storage**: None; request and table data are memory-only for one operation  
**Testing**: Vitest unit/contract/integration suites, jsdom DOM fixtures, browser-API fakes, performance trials, Mozilla `web-ext lint`, deterministic package verification  
**Target Platform**: Firefox desktop current stable; Chrome packaging remains deferred  
**Project Type**: Browser extension  
**Performance Goals**: Convert and acknowledge a 100×50 table within 2 seconds in at least 19 of 20 local trials  
**Constraints**: No persistent or optional host permission, no clipboard read, no network, no telemetry, no remote code, no retained page data, exact-frame target fidelity within top-level and same-origin documents; cross-origin embedded documents are out of scope
**Scale/Scope**: Four menu actions, one normalized table model, four serializers, one injected content boundary, one background clipboard boundary

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result |
|---|---|---|
| Explicit Interaction and User Agency | Capture begins only after a chosen context-menu format | PASS — menu selection is the sole entry point |
| Local-First Data Stewardship | Data remains local and ephemeral | PASS — model/result are memory-only; no storage, logs, telemetry, or network |
| Least Privilege and Firefox-First Portability | Avoid broad host and clipboard-read authority | PASS — interaction-granted active-tab access plus menu, scripting, clipboard-write, and injection-rejection-only fixed notification capabilities |
| Semantic Determinism and Format Fidelity | One model drives exact, tested serializers | PASS — fixtures and byte-for-byte format contracts cover spans and escaping |
| Test-First Spec-Driven Delivery | Tests precede each extraction, serializer, and browser boundary | PASS — task order requires red tests before implementation |

Post-design re-check: **PASS**. The content handler may remain registered in a page after first injection, but it performs no scan and stores no payload; it acts only on a new background message resulting from an explicit menu action. No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/002-copy-as-formats/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── validation-record.md
├── contracts/
│   ├── browser-interaction.md
│   ├── context-menu.md
│   └── serialization.md
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
│   ├── clipboard.ts
│   ├── context-menu.ts
│   ├── messages.ts
│   └── runtime.ts
├── content/
│   ├── content-handler.ts
│   ├── feedback.ts
│   └── target.ts
├── table/
│   ├── extract.ts
│   ├── model.ts
│   ├── safe-inline.ts
│   └── serialize/
│       ├── csv.ts
│       ├── html.ts
│       ├── markdown.ts
│       └── text.ts
└── popup/                 # existing readiness surface

tests/
├── fixtures/tables/
├── integration/
│   ├── browser-interaction.test.ts
│   ├── build.test.ts
│   └── package.test.ts
├── performance/
│   └── table-conversion.test.ts
└── unit/
    ├── context-menu.test.ts
    ├── content-handler.test.ts
    ├── extract.test.ts
    ├── feedback.test.ts
    ├── manifest.test.ts
    ├── messages.test.ts
    ├── serializers.test.ts
    └── target.test.ts
```

**Structure Decision**: Keep the single extension project. Put DOM-dependent extraction behind the injected content boundary, keep normalization/serialization pure and testable, and isolate browser APIs behind dependency-injected adapters. The existing build emits background, popup, and content bundles into the deterministic Firefox artifact.

## Runtime Flow

1. Background startup idempotently creates one parent menu and four child items.
2. The user selects a child item; Firefox grants temporary active-tab authority for the clicked tab.
3. For a supported top-level or same-origin document, background injects the guarded content bundle into `tab.id` and `info.frameId`, then sends `{targetElementId, format}` to that frame. A cross-origin embedded document is outside the accepted authority and fails safely without fallback targeting.
4. Content code resolves the expiring target handle in the clicked document, finds the nearest containing table, builds the row-group-aware logical model, serializes only the chosen format, and returns the extraction response as a real Promise. Outcome and unrelated messages reserve no response.
5. Background receives a bounded result, writes the payload once using the Firefox extension clipboard boundary, then discards it.
6. Background releases payload references before sending a payload-free outcome message to the same frame; content code renders a short success or failure toast. If injection itself was rejected, background instead displays the fixed local restriction notification. If extraction-response or outcome delivery fails after injection, background displays one fixed payload-free delivery notification and does not retry extraction, clipboard access, or messaging.

## Delivery Phases

### Phase 0 — Research

- Confirm Firefox menu target-handle lifetime and same-document constraint.
- Confirm context-menu actions activate `activeTab` and permit exact-frame one-off script injection without host patterns.
- Confirm the accepted grant does not promise inspection of cross-origin embedded documents and record that product exclusion without adding host patterns.
- Confirm Firefox extraction responses must be returned from `runtime.onMessage` as a Promise, while unrelated and payload-free outcome messages return no response.
- Confirm Firefox clipboard-write behavior after asynchronous extraction.
- Confirm that the `notifications` API requires explicit permission and is usable for fixed extension-controlled rejected-injection and post-injection delivery-loss fallbacks without host or clipboard-read authority.
- Define deterministic table geometry, including `rowspan="0"`, row-group clipping, and the distinct HTML row/column span limits, plus safe inline content and format rules.

### Phase 1 — Design and Contracts

- Define request/result, logical table, row/cell, and safe-inline entities.
- Specify exact menu IDs/labels, browser interaction messages, failure categories, and serializers.
- Update manifest/build/package contracts for the content bundle and reviewed permissions.

### Phase 2 — Test-First Implementation

- Add failing menu/permission and target-resolution tests.
- Add failing model and serializer fixtures, including row-group-bounded spans, nested tables, unsafe markup, and escapes.
- Add failing Firefox transport and clipboard/feedback/error integration tests, including fixed delivery fallback after payload release.
- Implement pure model/serializers, content boundary, background orchestration, and build changes.
- Run full verification, performance trials, Mozilla lint, deterministic packaging, and documented manual Firefox scenarios.

## Complexity Tracking

No constitutional violations or justified exceptions.
