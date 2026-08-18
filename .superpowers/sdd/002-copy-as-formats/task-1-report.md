# Batch 1 report — T001-T018

Base commit: `887874f`.

## Delivered

- Added one-off `content/content-handler.js` bundling and deterministic archive/build allowlists. The existing `src/**/*.ts`, `tests/**/*.ts`, ESLint, and Prettier source/test globs already cover the new reviewed paths.
- Added reusable basic and nested semantic-table fixtures, plus the expected-output fixture layout for the serializer batch.
- Added shared copy format, extraction request/response, logical-table, safe-inline, and outcome contracts with strict payload-leak-resistant message guards.
- Added the exact idempotent **Copy as** hierarchy: HTML, Markdown, Plain text, and CSV; unknown menu IDs do not access page or clipboard APIs.
- Added nearest-table target selection from Firefox's exact target-element ID, guarded content message handling, one-off exact-tab/frame injection and routing, and an injectable clipboard-write boundary. The content handler uses a temporary table-HTML payload only until the US2 serializers are implemented.
- Restricted the manifest permission allowlist to `activeTab`, `clipboardWrite`, `menus`, and `scripting`; it has no host patterns, content scripts, `tabs`, `storage`, clipboard-read, network, or telemetry authority.

## Test-first evidence

The added Batch 1 tests were first run while the browser/content modules and bundle output did not exist. They failed for the intended missing-module/missing-controller/build-output reasons. The initial sandboxed `npm test` launcher could not locate Node, so verification used the installed Node executable; sandboxed child bundling then failed on source-directory access and was re-run through the approved execution context.

Final focused verification: 26 tests passed across message, menu, target, browser-interaction, manifest, build, and package suites.

Final full verification: `node scripts/build.mjs verify` passed with 30 tests, TypeScript typecheck, ESLint, Prettier, Firefox lint, build, and deterministic package creation. Mozilla lint reported its existing Firefox compatibility warning that Manifest V3 `background.service_worker` is ignored while `background.scripts` remains the Firefox execution path; errors and notices were zero.

## Scope boundary

US2 serializers and US3 feedback/error outcome routing remain intentionally unimplemented. This batch neither scans pages nor requests persistent host/content-script access.
