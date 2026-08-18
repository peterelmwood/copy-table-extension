# Quickstart: Firefox Extension Scaffold

## Prerequisites

- Node.js 24 or later
- npm
- Firefox desktop

## Install and verify

```powershell
npm install
npm run verify
```

The verification command removes generated output, type-checks, lints, checks
formatting, tests, builds, validates the Firefox manifest, and creates one
inspected release archive. It is safe to repeat: automated coverage compares
the output file set and contents across repeated builds.

Mozilla's current linter reports one non-blocking
`BACKGROUND_SERVICE_WORKER_IGNORED` compatibility warning because Firefox uses
the manifest's reviewed `background.scripts` entry. The lint command exits
successfully; the matching `background.service_worker` entry remains required
by the manifest contract for future portability.

## Load temporarily in Firefox

```powershell
npm run start:firefox
```

Alternatively, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/manifest.json` after `npm run build`.

Select the **Copy Table** extension toolbar action. The popup should show the product name, a
ready state, a short statement that structured-data actions are coming next,
and the manifest version. Confirm Firefox reports no startup error.

This batch does not claim a manual Firefox GUI smoke-test pass. The automated
environment verifies the artifact and manifest only; an interactive Firefox
owner must complete the temporary-load and popup check above before release.
Record the five clean-checkout attempts and GUI observations in
[`validation-record.md`](validation-record.md) before approving the release gate.

## Create a package

```powershell
npm run package
```

The command rebuilds first. One unsigned Firefox archive (currently a `.zip`)
is written to `web-ext-artifacts/`, containing only the reviewed runtime files:
`manifest.json`, `background.js`, `popup/index.html`, `popup/popup.js`, and
`popup/popup.css`. Generated output is ignored by Git and must not be edited by
hand.

The ZIP writer fixes entry order, timestamps, permissions, and compression.
Two packages from the same committed inputs have the same archive SHA-256 hash.

## Troubleshooting

- If `web-ext` cannot find Firefox, verify `node --version` reports Node 24 or
  later and that Firefox desktop is installed. Build with `npm run build`, then
  use `about:debugging#/runtime/this-firefox` to load `dist/manifest.json`.
- For a startup error or a popup that will not open, use that page's Copy Table
  error details, then run `npm run clean` and `npm run build` before loading it
  again.
- If output appears stale, run `npm run clean` before `npm run verify` or
  `npm run package`; failed verification removes its generated output rather
  than leaving a release candidate.
- `BACKGROUND_SERVICE_WORKER_IGNORED` is an expected non-blocking Firefox lint
  warning. Any lint error is a release-blocking failure.

## Permissions and scope

This scaffold declares no permissions, host permissions, optional permissions,
or content scripts. It does not capture, retain, transmit, or log page content.
Firefox is the only validated target; Chromium packaging and runtime validation
are deferred to a future feature.
