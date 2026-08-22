# AMO reviewer build instructions

Copy Table is built with Node.js 24 and the committed npm lockfile. No AMO
credentials are required to reproduce or inspect either local artifact.

```powershell
npm.cmd ci
npm.cmd run release:dry-run -- v1.0.0
```

The dry run validates the tag against both version declarations, runs type
checking, linting, formatting, all automated tests, the clean extension build,
Mozilla manifest lint, and deterministic packaging. It does not require AMO
credentials or submit anything to Mozilla.

The extension archive is written to `web-ext-artifacts/copy_table-1.0.0.zip`.
The reviewer-source archive is written to
`web-ext-artifacts/copy-table-source-1.0.0.zip`. Generated output is not an
input to either archive and should not be edited.

For a source-only rebuild after `npm.cmd ci`, run:

```powershell
npm.cmd run release:source -- v1.0.0
```

If a submitted version has an unclear outcome, the repository owner checks the
AMO Developer Hub before rerunning it. Reviewer reproduction never needs the
owner's JWT issuer or secret.

## Recovering from an interrupted run

The automated test suite briefly writes a deliberately malformed file,
`src/.verify-failure.fixture.ts`, to confirm that a failed verification removes
its release artifact. The test deletes the file again, but interrupting a run
can leave it behind, and every later verification then fails formatting with:

```text
[warn] src/.verify-failure.fixture.ts
[warn] Code style issues found in the above file.
```

Delete the leftover file and rerun:

```powershell
Remove-Item -Force src/.verify-failure.fixture.ts
```

The file is intentionally absent from `.gitignore`, because the formatting check
must keep reporting it.
