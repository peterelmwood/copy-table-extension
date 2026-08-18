# Batch 2 report — T019-T028

Base commit: `3ef8f2c`.

## Delivered

- Expanded the shared logical-table contract with explicit head/body/foot sections, rectangular column counts, explicit-header row indexes, origin cells, span-covered placeholders, uneven-row empty placeholders, source/owner coordinates, valid header scopes, safe inline sequences, and caption text.
- Added visible safe-inline extraction that collapses rendered whitespace, preserves meaningful `<br>` breaks, carries image alternative text, retains deeply nested inline word boundaries, and excludes nested tables, scripts, styles, templates, form controls, embedded content, hidden content, and remote image sources.
- Added link allowlisting for absolute HTTP(S), protocol-relative HTTP(S), mailto, fragment, query, and relative references. Executable, local, opaque, empty, control-character, and backslash-bearing destinations are flattened to visible label text.
- Added rectangular matrix extraction in source-row order. Row/column span origins own the top-left coordinate; every covered coordinate points back to that owner and serializes empty in flattened formats. Invalid, oversized, colliding, or row-overrunning spans fail with bounded invalid-table handling.
- Added reconstructed standalone HTML using only table/caption/section/row/cell structure plus escaped text, `<br>`, and validated links with fixed `rel`. Source IDs, classes, styles, event attributes, controls, nested tables, scripts, and remote resources are never copied.
- Added deterministic Markdown, plain-text, and CSV serializers. Markdown selects the first explicit header row (or first logical row), escapes backslashes before pipes, and renders cell breaks as `<br>`. Plain text uses tab/LF and flattens in-cell breaks to spaces. CSV uses comma fields, doubled quotes, CRLF records, and quotes comma/quote/CR/LF fields while preserving in-cell breaks.
- Replaced the content handler's temporary raw-`outerHTML` fallback with extraction plus the selected serializer while preserving the Batch 1 injectable serializer seam, exact target resolution, versioned registration guard, request/response types, and invalid-table failure boundary.
- Added a reviewed complex semantic-table fixture and JSON-held byte-exact expectations so CRLF, tab, backslash, and no-trailing-record semantics remain independent of Windows checkout line-ending conversion.

## Fixture and behavior coverage

The Batch 2 suites cover caption and section ordering, explicit and fallback headers, uneven and empty rows, row and column spans, top-left ownership, nested-table exclusion, deeply nested visible text, `<br>` line breaks, image alt text, safe and unsafe links, hidden content, executable/interactive markup, invalid spans, HTML escaping/allowlists, Markdown pipes/backslashes, plain-text delimiters, and CSV commas/quotes/CR/LF/CRLF behavior.

## Test-first evidence

- The first focused run occurred before the Batch 2 modules existed. It failed on the missing extraction/safe-inline/serializer modules and on five observable content-boundary mismatches caused by the temporary raw-HTML serializer.
- After adding typed non-functional scaffolding, the focused run executed the assertions and reported 27 intended failures with 8 passing URL-rejection cases. Those failures covered absent geometry, token extraction, URL retention, exact serializers, invalid-geometry errors, and format routing.
- The first implementation run reduced the set to two reviewed CSV expectation issues. The expectations were corrected to follow the accepted contract: CSV preserves meaningful in-cell LF and quotes those fields, while normal HTML whitespace collapses a character-reference carriage return. The CR branch remains covered with a literal logical-model serializer test.
- A new nested-inline word-boundary test was observed failing as `Alpha betagamma linkedlabel` before token merging was corrected to preserve visible spaces.
- A block-content boundary test was observed failing as `BeforeFirst blockSecond blockAfter` before common visible block elements were normalized to meaningful line-break tokens.
- Full-package verification exposed the safe-link parser's dummy absolute base URL in the emitted bundle through the existing remote-code marker test. URL validation was refactored to avoid any network-looking runtime base; the focused packaging policy test then passed.

## Verification evidence

- Focused Batch 2 verification: 37 tests passed across safe-inline extraction, matrix extraction, all four serializers, and content-handler integration.
- Fresh full Vitest verification: 13 files and 68 tests passed with zero failures.
- Full `node scripts/build.mjs verify`: exit 0, including TypeScript typecheck, ESLint, Prettier, all 68 tests, extension build, Mozilla `web-ext lint`, and deterministic package creation.
- Mozilla lint reported zero errors, zero notices, and the existing single Firefox compatibility warning that Manifest V3 `background.service_worker` is ignored while the Firefox `background.scripts` path remains present.

## Scope boundary

This batch completes only T019-T028. It adds no browser permission, host access, clipboard read, storage, telemetry, network call, feedback UI, or US3 error/outcome behavior. T029 and later remain open.

## Review fix evidence — round 1

- Replaced attribute and inline-style string inference with computed rendering checks. Extraction now evaluates `display`, `visibility`, `opacity`, and `content-visibility` through each element's ancestor chain, so external/class rules and inline `!important` declarations are honored.
- Removed `aria-hidden` from the visual filter. A visually rendered ARIA-hidden label now contributes its visible text, including in the original complex fixture's reviewed bytes; ARIA state remains an accessibility-tree concern rather than a CSS-visibility substitute.
- Replaced default recursive inclusion with an explicit content-bearing HTML element policy plus an explicit non-content subtree denylist. Metadata and non-content elements such as `title`, `base`, `link`, `meta`, `param`, and `track` cannot contribute text even when programmatically mutated or assigned misleading display CSS.
- Added an adversarial visibility-policy fixture covering stylesheet-hidden content, inline `display: none !important`, hidden and transparent ancestors, visible ARIA-hidden text, and CSS-forced `title` metadata. The logical-model test asserts the safe token sequence, and all four serializers match reviewed byte-exact outputs while asserting that hidden secrets do not leak and rendered ARIA text does not vanish.
- The first round-1 focused run reported eight intended failures: the model and all four serializers leaked CSS-hidden/title content and omitted rendered ARIA text, while direct safe-inline tests exposed the same visual-policy and mutated-metadata failures. After computed visibility was implemented, the remaining failures were isolated to metadata inclusion and the original fixture's intentionally changed ARIA expectation. The explicit content policy and reviewed-output correction made the focused suite pass.
- Round-1 focused verification: 44 tests passed across safe-inline extraction, logical extraction, all four serializers, and content-handler integration.
- Round-1 full `node scripts/build.mjs verify`: exit 0, including TypeScript typecheck, ESLint, Prettier, 13 test files and 75 tests, extension build, Mozilla `web-ext lint`, and deterministic package creation. Mozilla lint remains at zero errors/notices with the existing single `background.service_worker` compatibility warning.

## Review fix evidence — round 2

- Split subtree suppression from the current element's computed visibility. Ancestor `display: none`, zero opacity, and `content-visibility: hidden` still veto descendants, while `visibility` is evaluated on each element's own computed value. A visibility-hidden container is traversed without copying its direct text, allowing an explicitly `visibility: visible` descendant to contribute.
- Removed the fixed content-element allowlist. Rendered elements not on the explicit metadata/non-content denylist are now transparent containers, so visible Web Components and omitted standard elements such as an open `dialog` retain their user-visible text. The existing metadata denylist remains authoritative even when CSS attempts to display `title`.
- Added separate reviewed fixtures for a visible descendant overriding a hidden ancestor and for visible custom/open-dialog containers alongside forced-display metadata. Logical-model tests assert both safe values, and all four serializers match byte-exact HTML, Markdown, plain-text, and CSV outputs.
- The first round-2 focused run reported 12 intended failures: both logical-model cells were empty, both direct safe-inline values were empty, and all eight new byte-exact serializer cases emitted empty fields. After the inheritance and traversal corrections, focused verification passed 56 tests across safe-inline extraction, logical extraction, all serializers, and content-handler integration.
- Round-2 full `node scripts/build.mjs verify`: exit 0, including TypeScript typecheck, ESLint, Prettier, 13 test files and 87 tests, extension build, Mozilla `web-ext lint`, and deterministic package creation. Mozilla lint remains at zero errors/notices with the existing single `background.service_worker` compatibility warning.
