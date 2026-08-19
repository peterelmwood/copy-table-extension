# Contract: Public Firefox Publishing Workflow

## Trigger and Concurrency

- Trigger only on newly pushed tags matching the broad `v*.*.*` pattern.
- Validate the exact stable grammar `vX.Y.Z` before any AMO operation.
- Serialize all Firefox publication attempts and never cancel an in-progress
  submission in favor of a newer one.

## Security Boundary

- Declare repository permissions as read-only.
- Bind the publish job to the `firefox-production` environment.
- Read credentials only from environment secrets `AMO_JWT_ISSUER` and
  `AMO_JWT_SECRET`, mapped to the Mozilla CLI's supported environment names.
- Never interpolate credentials into command arguments, output, summaries, or
  retained artifacts.
- Use only official GitHub actions pinned to full commit SHAs.

## Pre-Submission Gates

1. Check out the exact tag revision with no persisted Git credential.
2. Install Node.js 24 and locked dependencies.
3. Require tag, package, and manifest versions to agree.
4. Require manifest ID `copy-table@peterelmwood.com`.
5. Execute the complete repository verification command from the clean checkout.
6. Create and inspect the deterministic reviewer-source archive.
7. Confirm required AMO metadata and both credential variables are present.

## Submission

Invoke the locked Mozilla `web-ext sign` command with:

- source directory `dist/`;
- channel `listed`;
- committed AMO metadata;
- reviewer-source archive upload;
- noninteractive mode;
- approval waiting disabled.

## Result and Failure Guidance

- Exit success means the version was submitted to AMO; the workflow summary
  must call it submitted or pending, never published.
- A known validation or API rejection identifies the failed gate.
- Any timeout or connection loss after upload is labeled ambiguous and directs
  the owner to inspect the AMO Developer Hub before rerunning the same version.
