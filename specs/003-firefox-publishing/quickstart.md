# Quickstart: Firefox Build and Public Publishing

## Prerequisites

- PowerShell 7 on PATH
- Node.js 24 and npm
- A clean checkout of `003-firefox-publishing`
- No AMO credentials are required for the dry run

## Install and run all repository gates

```powershell
npm.cmd ci
npm.cmd run verify
```

Expected: type checking, linting, formatting, tests, extension build, Mozilla
lint, and deterministic packaging all pass.

## Run the no-credential release dry run

Use the version already declared in `package.json` and `src/manifest.json`:

```powershell
npm.cmd run release:dry-run -- v1.0.0
```

Expected:

- the tag, package, and manifest versions agree;
- the manifest uses `copy-table@peterelmwood.com`;
- the full verification pipeline passes;
- `web-ext-artifacts/` contains the unsigned extension ZIP and the deterministic
  `copy-table-source-1.0.0.zip` reviewer-source package;
- no AMO request is made.

## Exercise a blocked release locally

```powershell
npm.cmd run release:validate -- v1.0.1
```

Expected: the command exits nonzero and identifies the package/manifest version
mismatch before building or contacting any external service.

## Inspect the source package

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead(
  (Resolve-Path 'web-ext-artifacts\copy-table-source-1.0.0.zip')
)
$archive.Entries | Select-Object -ExpandProperty FullName
$archive.Dispose()
```

Expected: entries match [the release artifact contract](contracts/release-artifacts.md)
and contain no generated output, dependencies, repository/Squad/Spec Kit state,
credentials, or unrelated local files.

## Owner-only AMO and GitHub setup

1. Sign in to the [AMO Developer Hub](https://addons.mozilla.org/developers/).
2. Create API credentials and retain the JWT issuer and secret securely.
3. In GitHub, create the `firefox-production` environment and restrict it to
   protected version tags; optionally require an owner review.
4. Add environment secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`.
5. Merge the approved version bump to `main`, then create and push the matching
   stable tag, for example `v1.0.0`.

The workflow's successful result means submitted to Mozilla. Confirm review and
public availability in the AMO Developer Hub. After an ambiguous timeout, check
the Developer Hub before rerunning the same version.
