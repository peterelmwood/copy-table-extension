# Batch 3 report — T029-T039

Base commit: `a837514`.

## Delivered

- Added deterministic, payload-free in-page outcome feedback. The only
  success copy is the selected format name; failure copy is fixed by bounded
  status. Toasts replace their predecessor, use a polite atomic live region,
  remain non-blocking, and remove after three seconds.
- Completed the background failure boundary. Injection rejection maps to
  `restricted-page`; message failures/malformed responses map to `unexpected`;
  the four content failure categories pass through unchanged; and clipboard
  rejection maps to `clipboard-failed`. A successful result writes once; a
  failed result writes zero times; a rejected write is attempted once with no
  retry or read. Outcome routing carries request ID, selected format, and
  status only.
- Connected guarded payload-free outcome messages to the content feedback
  renderer without resolving a target or touching page content.
- Added the release 20-attempt 100×50 conversion/write/acknowledgement gate.
  The test requires at least 19 completions under two seconds.
- Extended package regressions for source maps and likely embedded secrets,
  alongside the existing exact archive, remote-code, deterministic-byte, and
  safe-clean containment checks. Manifest checks now explicitly reject tabs,
  storage, and web-request authority.
- Updated user documentation and quickstart for the menu workflow, formats,
  permissions, privacy boundary, package contents, failures, and manual
  evidence procedure.

## Test-first evidence

- Before US3 implementation, the focused feedback/failure run failed because
  `src/content/feedback.ts` did not exist, no outcomes were routed, injection
  rejection escaped, and rejected clipboard writes escaped. The intended red
  output contained the missing feedback import plus six routing failures.
- The corrected focused feedback/content/browser run passed 24 tests. A
  follow-up focused run (including the 100×50 performance gate) passed 25
  tests.
- The performance gate uses a detached DOM document to avoid treating jsdom
  stylesheet emulation as Firefox conversion work. It still executes the real
  extraction, CSV serializer, background write boundary, and acknowledgement
  route on every attempt.

## Verification evidence

- Focused package/manifest regression suite: 13 tests passed.
- Full `npm run verify`: exit 0; 15 test files and 103 tests passed, followed
  by build, Mozilla lint, and deterministic package creation.
- Mozilla lint: zero errors, zero notices, one existing expected
  `BACKGROUND_SERVICE_WORKER_IGNORED` warning; the Firefox `background.scripts`
  fallback is present.

## Artifact review (T039)

The release-engineer review reread `spec.md`, `plan.md`, every Feature 002
contract, `quickstart.md`, the constitution, and T029-T039. The implementation
matches the request/result/outcome contract, has no payload in failure or
outcome messages, retains the exact permission allowlist, does not introduce
network/telemetry/storage/clipboard-read authority, and preserves the existing
deterministic-package and safe-clean containment checks. The task list is now
checked through T039.

## Manual scope and concern

No Firefox GUI scenario was run or claimed. `validation-record.md` intentionally
keeps every interaction row pending. In particular, an injection failure on a
browser-protected page may also prevent the page from receiving the fixed
`restricted-page` toast; the controller attempts payload-free outcome routing
and safely suppresses a delivery failure, but a product-visible protected-page
fallback would require a separately specified, permission-compatible Firefox
surface. This is the remaining manual/release concern.

## Review fix — protected-page fallback and payload lifetime

- Replaced the impossible same-frame outcome attempt after a rejected injection
  with one extension-controlled Firefox `basic` notification. Its title and
  message are fixed: `Copy Table` and `Copy Table cannot access this protected
  page. Open a normal web page and try again.` It is called only from the
  injection-rejection path; it never receives a URL, target, format, payload,
  or page metadata, and does not touch the clipboard.
- Added the narrow `notifications` manifest permission and updated the spec,
  plan, context-menu/browser-interaction contracts, research, README,
  quickstart, validation expectation, manifest checks, and archive checks to
  require exactly `activeTab`, `clipboardWrite`, `menus`, `notifications`, and
  `scripting` while retaining the no-host/no-clipboard-read/no-tabs/no-storage
  boundary.
- On the successful response path, the controller now clears both the local
  payload and the response object's payload property, then replaces its outer
  response reference before awaiting feedback delivery. The lifetime regression
  holds outcome delivery pending and proves the response no longer exposes the
  serialized table text.
- First focused review-fix run: 11 interaction tests passed after the two new
  tests were observed red before implementation. Focused interaction,
  manifest, and archive suite: 24 tests passed. Final `npm run verify`: exit 0,
  15 test files and 105 tests passed; Mozilla lint had zero errors/notices and
  the existing expected `BACKGROUND_SERVICE_WORKER_IGNORED` warning.

No Firefox GUI or operating-system notification display was performed or
claimed. The protected-page row remains pending owner-run Firefox validation;
the remaining environmental concern is that a user may disable system
notifications, in which case Firefox cannot guarantee OS-level presentation.

## Review fix — artifact permission text

- Updated T011 to name the exact approved five-permission allowlist:
  `activeTab`, `clipboardWrite`, `menus`, `notifications`, and `scripting`.
- Re-searched all Feature 002 artifacts for obsolete four-permission wording;
  no other stale instance remains.

## Final whole-feature review fix wave — C1, I1, I2, I3, M1

Base commit: `483b75b`.

### Delivered

- C1: `runtime.onMessage` is now typed from Firefox's installed listener
  signature. Extraction requests return a real Promise response; payload-free
  outcomes and unrelated messages return no response. The content test uses a
  Firefox-shaped transport helper that rejects a plain synchronous response
  object rather than treating an ordinary function return as message delivery.
- I1: Cross-origin embedded documents are explicitly outside Feature 002 under
  the accepted no-host-permission design. Spec, plan, research, data model,
  contracts, task traceability, README, quickstart, checklist, design note, and
  validation matrix now distinguish supported top-level/same-origin documents
  from this safe restriction path. No host or optional-host authority was
  added, and exact-target logic never substitutes another frame or table.
- I2: extraction now retains source row-group boundaries, normalizes
  `rowspan="0"` to the remaining rows in its owning group, clips positive row
  spans at that boundary, and applies separate 65,534 row / 1,000 column
  limits. Logical rows carry `rowGroupIndex`, reconstructed HTML preserves
  adjacent row groups, and a reviewed fixture covers zero spans plus clipping
  at `thead`, first `tbody`, and second `tbody` boundaries byte-for-byte in
  HTML, Markdown, plain text, and CSV.
- I3: post-injection extraction-response loss and outcome-delivery loss now use
  one fixed payload-free Firefox notification. There is no extraction,
  clipboard, or message retry. Successful response payload fields and local
  payload references are released before outcome delivery and therefore before
  notification fallback; the regression captures state at notification time.
  The existing fixed rejected-injection/restricted-page notification remains
  distinct and unchanged.
- M1: artifacts now use `copied`, omit an outcome `message` field, include the
  `empty` padding-cell and row-group variants, list the actual browser source
  split (including `messages.ts` and the existing metadata `runtime.ts`), and
  accurately state that byte-exact expected fixtures are consumed by serializer
  unit tests while browser integration uses controlled boundary payloads.

### Test-first evidence

- Firefox transport red: 5 of 8 content-handler tests failed with
  `Firefox does not transport a synchronous response object.` The corrected
  focused file passed all 8 tests.
- Row-span red: 5 tests failed because `rowspan="0"` raised
  `Invalid table geometry` before extraction/serialization. The corrected
  extraction and serializer run passed 32 tests across 2 files.
- Delivery fallback red: 3 of 13 interaction tests failed because the generic
  notifier was not called and extraction-response rejection still attempted an
  in-page outcome. The corrected interaction file passed all 13 tests.

### Verification evidence

- Focused behavior command covering content transport, extraction, all four
  serializers, message guards, feedback, and browser interaction: exit 0; 6
  files and 65 tests passed.
- Focused manifest/package command: exit 0; 2 files and 13 tests passed. This
  preserves the exact five permissions, archive allowlist, deterministic ZIP
  bytes, safe-clean containment, source-map/remote-code/secret checks, and
  absence of host/optional-host authority.
- Full `$env:npm_config_script_shell = 'C:\Program Files\PowerShell\7\pwsh.exe'; npm run verify`:
  exit 0; TypeScript, ESLint, Prettier, 15 Vitest files / 113 tests, build,
  Mozilla lint, and deterministic packaging passed. Mozilla lint reported 0
  errors, 0 notices, and the single expected
  `BACKGROUND_SERVICE_WORKER_IGNORED` warning; `background.scripts` remains the
  Firefox fallback.
- A combined in-sandbox package/manifest attempt first failed because esbuild's
  native helper was denied workspace entry-point access (`Cannot read directory
  "../..": Access is denied`). Isolated build and package/manifest tests passed
  outside that filesystem sandbox, confirming an execution-environment denial
  rather than a product failure.

### Residual release work

No Firefox GUI, real runtime message channel, real OS clipboard, or operating-
system notification display was exercised or claimed. Every GUI row remains
pending, including the newly explicit cross-origin embedded-document restriction
and frame-removed-after-injection fallback. Owner validation still needs all
four formats, 30 target-selection trials, failure/notification cases, keyboard
discovery, and the 20-attempt real Firefox/OS timing trial before release
acceptance.
