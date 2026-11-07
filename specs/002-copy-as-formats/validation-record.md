# Validation Record: Copy Table as Structured Formats

**Status**: Automated gates passed; Firefox end-to-end suite covers the copy, nested, no-table, and same-origin frame rows; remaining rows pending GUI-capable owner validation
**Automated command**: `$env:npm_config_script_shell = 'C:\Program Files\PowerShell\7\pwsh.exe'; npm run verify`

## Firefox interaction matrix

| Scenario                      | Firefox/version | Fixture                               | Expected                                                                          | Observed                                                                 | Elapsed | Pass |
| ----------------------------- | --------------- | ------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- | ---- |
| Copy as HTML                  | 159.0 (CI e2e)  | complex table                         | safe standalone table                                                             | e2e: clipboard matches `expected/*.json` byte-for-byte; toast shown      | ≈0.4 s  | [x]  |
| Copy as Markdown              | 159.0 (CI e2e)  | spans and pipes                       | exact reviewed Markdown                                                           | e2e: clipboard matches `expected/*.json` byte-for-byte; toast shown      | ≈0.4 s  | [x]  |
| Copy as Plain text            | 159.0 (CI e2e)  | multiline cells                       | tab/LF matrix                                                                     | e2e: clipboard matches `expected/*.json` byte-for-byte; toast shown      | ≈0.4 s  | [x]  |
| Copy as CSV                   | 159.0 (CI e2e)  | quotes/commas/newlines                | exact reviewed CSV                                                                | e2e: clipboard matches `expected/*.json` byte-for-byte; toast shown      | ≈0.4 s  | [x]  |
| Nested target                 | 159.0 (CI e2e)  | nested tables                         | nearest nested table only                                                         | e2e: inner cell copies inner table only; outer cell excludes inner table | ≈0.4 s  | [x]  |
| No table                      | 159.0 (CI e2e)  | ordinary paragraph                    | feedback; clipboard unchanged                                                     | e2e: no-table toast; sentinel clipboard unchanged                        | ≈0.4 s  | [x]  |
| Same-origin embedded table    | 159.0 (CI e2e)  | semantic table in same-origin iframe  | frame table copied; feedback in that frame                                        | e2e: frame table copied; toast rendered in the frame                     | ≈0.4 s  | [x]  |
| Protected page                | Pending         | browser-protected URL                 | fixed extension restriction notification; clipboard unchanged                     | Pending                                                                  | Pending | [ ]  |
| Cross-origin embedded table   | Pending         | semantic table in cross-origin iframe | fixed extension restriction notification; no fallback target; clipboard unchanged | Pending                                                                  | Pending | [ ]  |
| Frame removed after injection | Pending         | semantic table in removable frame     | fixed payload-free delivery notification after payload release; no retry          | Pending                                                                  | Pending | [ ]  |
| Keyboard menu                 | Pending         | semantic table                        | discover and complete without popup                                               | Pending                                                                  | Pending | [ ]  |

## Performance record

Record 20 attempts against the reviewed 100×50 fixture. At least 19 must finish within 2 seconds.

| Attempts | Within 2 seconds          | Slowest                         | Environment  | Pass |
| -------- | ------------------------- | ------------------------------- | ------------ | ---- |
| 20       | At least 19 (gate passed) | Not persisted by automated gate | jsdom/Vitest | [x]  |

## Automated evidence

- 2026-08-18 final-review fix wave: `npm run verify` exited 0: TypeScript,
  ESLint, Prettier, full Vitest suite (15 files, 113 tests), extension build,
  Mozilla lint, and deterministic package creation passed.
- Focused final-review behavior run: 6 files and 65 tests passed for Firefox
  Promise transport, row-group span normalization, all four byte-exact
  serializers, message guards, feedback, payload release, and delivery-loss
  fallback. The separate exact-permission/deterministic-package run passed 2
  files and 13 tests.
- The 20-attempt 100×50 conversion/write/acknowledgement test passed its
  19-of-20 under-two-second gate. It is an automated jsdom release gate, not a
  Firefox GUI measurement.
- Package checks passed for the exact reviewed archive file list, content
  bundle, deterministic archive bytes, safe-clean containment, absence of
  source maps, remote-code markers, and likely embedded secrets. Manifest
  checks passed for the exact five permission capabilities and no broad host,
  optional-host, clipboard-read, tabs, storage, or web-request authority.
- Mozilla lint reported zero errors and zero notices. Its one expected warning
  is `BACKGROUND_SERVICE_WORKER_IGNORED`; Firefox uses the reviewed
  `background.scripts` fallback.

## Automated Firefox evidence

- 2026-11-07: the Firefox end-to-end suite (`tests/e2e/copy-flow.e2e.ts`, run by
  the `e2e` job in `.github/workflows/build.yml`) passed 32 of 32 tests on
  Firefox 159.0 with geckodriver 0.37.1 ([CI run](https://github.com/peterelmwood/copy-table-extension/actions/runs/42391088311)), and on Firefox
  159.0.1 locally. It installs the packaged archive, right-clicks through
  Firefox's own **Copy as** menu, and reads the system clipboard. It covers all
  four formats on every fixture with reviewed expected output, nested tables,
  the no-table miss with an unchanged clipboard, and a same-origin iframe.
- Elapsed times are per end-to-end test (navigation, menu, copy, and clipboard
  read), not a user-perceived timing.

## Notes and interventions

- Rows marked "CI e2e" are covered by the automated Firefox suite above. The
  protected page, cross-origin frame, frame removed after injection, and
  keyboard menu rows still need an owner-run Firefox session: they involve
  browser-protected URLs, system notifications, timing-sensitive frame removal,
  or keyboard-only menu navigation that the suite does not drive.
- Cross-origin embedded documents are intentionally unsupported without broad
  host permission; their pending row validates safe fixed restriction feedback,
  not extraction success.
