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

Select the extension toolbar action. The popup should show the product name, a
ready state, a short statement that structured-data actions are coming next,
and the manifest version. Confirm Firefox reports no startup error.

This batch does not claim a manual Firefox GUI smoke-test pass. The automated
environment verifies the artifact and manifest only; an interactive Firefox
owner must complete the temporary-load and popup check above before release.

## Create a package

```powershell
npm run package
```

The command rebuilds first. One unsigned Firefox archive (currently a `.zip`)
is written to `web-ext-artifacts/`, containing only the reviewed runtime files:
`manifest.json`, `background.js`, `popup/index.html`, `popup/popup.js`, and
`popup/popup.css`. Generated output is ignored by Git and must not be edited by
hand.

## Permissions and scope

This scaffold declares no permissions, host permissions, optional permissions,
or content scripts. It does not capture, retain, transmit, or log page content.
Firefox is the only validated target; Chromium packaging and runtime validation
are deferred to a future feature.
