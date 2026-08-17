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

The verification command type-checks, lints, tests, builds, validates the Firefox manifest, and inspects the generated artifact.

## Load temporarily in Firefox

```powershell
npm run start:firefox
```

Alternatively, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/manifest.json` after `npm run build`.

Select the extension toolbar action. The popup should show the product name, a ready state, a short statement that structured-data actions are coming next, and the manifest version.

## Create a package

```powershell
npm run package
```

The Firefox archive is written to `web-ext-artifacts/`. Generated output is ignored by Git and must not be edited by hand.
