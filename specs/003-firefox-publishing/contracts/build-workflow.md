# Contract: Verification Build Workflow

## Triggers

- Run for every pull request.
- Run for every push to `main`.
- Do not run merely because a version tag was created.
- Cancel an older in-progress build for the same branch or pull request.

## Security Boundary

- Declare repository permissions as read-only.
- Reference no AMO secret, publishing environment, or credential-bearing step.
- Use only official GitHub actions pinned to full commit SHAs.
- Install dependencies with the lockfile and execute no package lifecycle
  behavior beyond the repository's accepted install contract.

## Required Steps

1. Check out the triggering revision.
2. Install Node.js 24 and the locked npm dependencies.
3. Execute the complete repository verification command.
4. Upload the generated unsigned extension ZIP as a workflow artifact.
5. Retain the artifact for exactly 30 days and fail if the expected file is absent.

## Observable Outcome

The run reports a clear pass or failed gate. A successful run exposes one
reviewable package associated with the triggering revision and makes no AMO
submission.
