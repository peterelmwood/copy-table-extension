# Validation Record: Copy Table as Structured Formats

**Status**: Automated gates passed; pending GUI-capable owner validation
**Automated command**: `$env:npm_config_script_shell = 'C:\Program Files\PowerShell\7\pwsh.exe'; npm run verify`

## Firefox interaction matrix

| Scenario                      | Firefox/version | Fixture                               | Expected                                                                          | Observed | Elapsed | Pass |
| ----------------------------- | --------------- | ------------------------------------- | --------------------------------------------------------------------------------- | -------- | ------- | ---- |
| Copy as HTML                  | Pending         | complex table                         | safe standalone table                                                             | Pending  | Pending | [ ]  |
| Copy as Markdown              | Pending         | spans and pipes                       | exact reviewed Markdown                                                           | Pending  | Pending | [ ]  |
| Copy as Plain text            | Pending         | multiline cells                       | tab/LF matrix                                                                     | Pending  | Pending | [ ]  |
| Copy as CSV                   | Pending         | quotes/commas/newlines                | exact reviewed CSV                                                                | Pending  | Pending | [ ]  |
| Nested target                 | Pending         | nested tables                         | nearest nested table only                                                         | Pending  | Pending | [ ]  |
| No table                      | Pending         | ordinary paragraph                    | feedback; clipboard unchanged                                                     | Pending  | Pending | [ ]  |
| Protected page                | Pending         | browser-protected URL                 | fixed extension restriction notification; clipboard unchanged                     | Pending  | Pending | [ ]  |
| Cross-origin embedded table   | Pending         | semantic table in cross-origin iframe | fixed extension restriction notification; no fallback target; clipboard unchanged | Pending  | Pending | [ ]  |
| Frame removed after injection | Pending         | semantic table in removable frame     | fixed payload-free delivery notification after payload release; no retry          | Pending  | Pending | [ ]  |
| Keyboard menu                 | Pending         | semantic table                        | discover and complete without popup                                               | Pending  | Pending | [ ]  |

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

## Notes and interventions

- No Firefox GUI scenario was executed for this record. Every interaction row
  above remains pending an owner-run Firefox session.
- Cross-origin embedded documents are intentionally unsupported without broad
  host permission; their pending row validates safe fixed restriction feedback,
  not extraction success.
