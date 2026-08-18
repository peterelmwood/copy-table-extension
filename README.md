# Copy Table

Copy Table is a Firefox-first WebExtension that copies the semantic table a
user directly right-clicks as HTML, Markdown, plain text, or CSV. Each copy is
an explicit context-menu action; table data is processed locally for that one
operation, written once to the clipboard on success, and then discarded.

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

On a normal top-level page or same-origin embedded document containing a semantic `<table>`, right-click a cell, expand
**Copy as**, then select **HTML**, **Markdown**, **Plain text**, or **CSV**.
The closest table containing the clicked element is copied. A short in-page
message confirms success. Outside a table or after a clipboard rejection, an
in-page message explains the failure. If Firefox blocks page injection, a fixed
extension notification explains that the protected page cannot be accessed. If
the page or frame disappears after injection and the extraction response or
outcome cannot be delivered, a different fixed payload-free notification
reports that delivery failed after any payload reference is released. In every
failure case, the existing clipboard is left unchanged.

Automated verification does not claim Firefox GUI coverage. Record interactive
results, including nested and no-table cases, in
[`specs/002-copy-as-formats/validation-record.md`](specs/002-copy-as-formats/validation-record.md)
before release.

## Package and inspect

```powershell
npm run package
```

The command rebuilds before packaging and writes exactly one unsigned Firefox
archive (currently a `.zip`) to `web-ext-artifacts/`. The archive contains only
`manifest.json`, `background.js`, `content/content-handler.js`,
`popup/index.html`, `popup/popup.js`, and `popup/popup.css`. Both generated
directories are ignored by Git and must not be edited by hand.

Each archive is generated with a fixed entry order, timestamp, file mode, and
compression settings. Packaging the same committed input twice produces the
same archive SHA-256 hash.

## Troubleshooting

- **`web-ext` cannot find Firefox:** Confirm `node --version` reports Node 24
  or later and that Firefox desktop is installed. Use the manual
  `about:debugging#/runtime/this-firefox` fallback after `npm run build`.
- **Firefox reports a startup error or the menu does not appear:** Open
  `about:debugging#/runtime/this-firefox`, select Copy Table, and inspect its
  error details. Rebuild with `npm run clean` followed by `npm run build` before
  loading `dist/manifest.json` again.
- **Copy reports no table:** Right-click a cell inside a semantic `<table>`;
  visually table-like `<div>` layouts are not supported.
- **Copy reports that the page cannot be accessed:** Browser-protected pages
  and tables inside cross-origin embedded documents cannot be inspected under
  the approved permission set. Try the same action on a normal top-level HTTPS
  page or a same-origin frame.
- **Copy reports that the result could not be delivered:** The page navigated,
  the frame disappeared, or access changed while the operation was in progress.
  Retry from the current page; Copy Table does not retry automatically.
- **Clipboard access fails:** Confirm Firefox is allowed to write to the
  clipboard, then retry the explicit menu action. Copy Table never reads the
  clipboard and does not retry a rejected write.
- **A generated file seems stale:** Run `npm run clean` before `npm run verify`
  or `npm run package`. A failed verification removes `dist/` and the release
  archive rather than leaving it as a candidate.
- **Mozilla lint warning:** `BACKGROUND_SERVICE_WORKER_IGNORED` is an expected
  non-blocking Firefox compatibility warning; lint errors are failures and must
  be resolved before packaging.

## Privacy, permissions, and boundaries

The manifest declares exactly `activeTab`, `clipboardWrite`, `menus`,
`notifications`, and `scripting`. The notification capability is limited to
fixed protected-page feedback after injection rejection and one fixed
payload-free fallback if a started extraction/outcome message cannot be
delivered; it receives no page data. The manifest declares no host permissions, optional permissions,
content scripts, clipboard-read authority, storage, telemetry, or network
destinations. Access is scoped to the user-selected menu action and supported
top-level or same-origin document in its active tab. Cross-origin embedded
documents are explicitly out of scope rather than covered by broader host
authority. Firefox Manifest V3 is the only supported runtime; Chromium
packaging and validation are intentionally deferred.

Browser-facing code is isolated in `src/background.ts`, the clipboard,
context-menu, message, and runtime adapters under `src/browser/`, and
`src/content/`; extraction and serializers live under `src/table/`. The
deterministic package gate rejects unexpected files, source maps, remote-code
markers, and likely embedded secrets.
