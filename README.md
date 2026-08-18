# Copy Table

Copy Table is a Firefox-first WebExtension foundation for a future explicit,
local-only structured-data copy workflow. This increment has no
page-reading, capture, clipboard, storage, telemetry, or network behavior.

## Prerequisites

- Node.js 24 or later
- npm
- Firefox desktop for the manual temporary-install check

## Install and verify

From a clean checkout:

```powershell
npm install
npm run verify
```

`verify` removes generated output, type-checks, lints, checks formatting, runs
the automated tests, builds `dist/`, runs Mozilla's Firefox manifest lint, and
creates one release archive in `web-ext-artifacts/`. It is safe to repeat: the
build test compares the generated file set and file contents across two builds.

## Load temporarily in Firefox

```powershell
npm run start:firefox
```

The command first creates a fresh `dist/` directory and then invokes Firefox
through `web-ext`. Alternatively, open `about:debugging#/runtime/this-firefox`,
choose **Load Temporary Add-on**, and select `dist/manifest.json` after
`npm run build`.

For the manual smoke check, confirm that Firefox recognizes **Copy Table**,
reports no startup error, and that the toolbar popup presents its ready
state and installed version. Automated verification does not claim this GUI
check; it must be performed in an interactive Firefox session before release.
Record the five clean-checkout attempts and the manual smoke evidence in
[`specs/001-firefox-extension-scaffold/validation-record.md`](specs/001-firefox-extension-scaffold/validation-record.md).

## Package and inspect

```powershell
npm run package
```

The command rebuilds before packaging and writes exactly one unsigned Firefox
archive (currently a `.zip`) to `web-ext-artifacts/`. The archive contains only
`manifest.json`, `background.js`, `popup/index.html`, `popup/popup.js`, and
`popup/popup.css`. Both generated directories are ignored by Git and must not
be edited by hand.

Each archive is generated with a fixed entry order, timestamp, file mode, and
compression settings. Packaging the same committed input twice produces the
same archive SHA-256 hash.

## Troubleshooting

- **`web-ext` cannot find Firefox:** Confirm `node --version` reports Node 24
  or later and that Firefox desktop is installed. Use the manual
  `about:debugging#/runtime/this-firefox` fallback after `npm run build`.
- **Firefox reports a startup error or the popup does not open:** Open
  `about:debugging#/runtime/this-firefox`, select Copy Table, and inspect its
  error details. Rebuild with `npm run clean` followed by `npm run build` before
  loading `dist/manifest.json` again.
- **A generated file seems stale:** Run `npm run clean` before `npm run verify`
  or `npm run package`. A failed verification removes `dist/` and the release
  archive rather than leaving it as a candidate.
- **Mozilla lint warning:** `BACKGROUND_SERVICE_WORKER_IGNORED` is an expected
  non-blocking Firefox compatibility warning; lint errors are failures and must
  be resolved before packaging.

## Privacy, permissions, and boundaries

The manifest declares no permissions, host permissions, optional permissions,
or content scripts. The scaffold therefore has no page access and stores or
transmits no page content. Firefox Manifest V3 is the only supported runtime in
this increment; Chromium packaging and validation are intentionally deferred.

Browser-facing code is isolated in `src/background.ts`, `src/browser/`, and
`src/popup/`. Future table extraction, normalization, and output formatting
must remain separate from these Firefox adapters and require their own accepted
specification.
