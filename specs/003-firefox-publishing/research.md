# Research: Firefox Build and Public Publishing

## Decision 1: Separate verification and publication workflows

**Decision**: Use `build.yml` for pull requests and pushes to `main`, and
`publish-firefox.yml` only for new tags matching the broad `v*.*.*` trigger.
The release module enforces the exact `vX.Y.Z` grammar.

**Rationale**: Separate workflows make it auditable that normal CI never
references publishing credentials. GitHub environments release secrets only to
jobs that reference the environment, and concurrency can serialize publication
without slowing ordinary CI.

**Alternatives considered**: One workflow with a conditional publish job was
rejected because its secret boundary and trigger logic are harder to audit.
Manual AMO upload was rejected because it duplicates packaging steps and does
not satisfy one-action release submission.

**Sources**:

- [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub Actions concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)

## Decision 2: Keep release policy in a tested Node module

**Decision**: Add `scripts/release.mjs` with commands for stable-tag validation,
reviewer-source packaging, and a no-credential dry run. Workflows call these
commands rather than reimplementing policy in shell expressions.

**Rationale**: The repository already uses Node orchestration and JSZip for
deterministic extension packages. Reusing that boundary enables direct Vitest
coverage on Windows and Linux and keeps workflow YAML declarative.

**Alternatives considered**: Inline PowerShell or Bash was rejected because it
would duplicate cross-platform policy and violate the native-PowerShell local
workflow. A third-party Firefox publishing action was rejected because the
official Mozilla CLI already supports the required path and avoids a new
credential-bearing dependency.

## Decision 3: Validate versions before any AMO call

**Decision**: Accept only `vX.Y.Z`; require its version to equal both
`package.json` and `src/manifest.json`; reject pre-release/build metadata,
malformed tags, and mismatches before build or submission.

**Rationale**: A strict stable channel prevents accidental beta publication and
makes the immutable tag, package, manifest, artifact names, and AMO version
traceable to one value.

**Alternatives considered**: Allowing general semantic versions was rejected
because pre-release distribution is explicitly out of scope. Automatically
editing versions or creating tags was rejected because version review must
remain a normal pull-request change.

## Decision 4: Use locked web-ext 9.4.0 for listed submission

**Decision**: Keep the locked `web-ext` 9.4.0 and invoke `sign` with the listed
channel, `dist/` source, committed AMO metadata, reviewer-source upload,
noninteractive mode, and approval waiting disabled.

**Rationale**: Since version 8, `web-ext sign` can create a new listed AMO entry
and upload human-readable source. Version 9.4.0 supports the current project and
Node 24, so a major tool upgrade is unrelated to this feature. Disabling the
approval wait makes workflow success mean submitted, never necessarily public.

**Alternatives considered**: Direct AMO API calls were rejected because they
would recreate supported CLI behavior. Upgrading to web-ext 10 was rejected as
unnecessary scope. Waiting synchronously for review was rejected because review
can outlast a workflow and timeout ambiguously.

**Sources**:

- [Mozilla web-ext command reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Mozilla source code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)

## Decision 5: Commit minimal complete AMO metadata

**Decision**: Add `amo-metadata.json` with an English summary, category
`web-development`, and version license `ISC`. The manifest supplies the name
and permanent ID `copy-table@peterelmwood.com`.

**Rationale**: Mozilla requires summary, category, and license metadata for the
first listed version. The category matches a structured-table developer tool,
and ISC matches the repository's existing package license.

**Alternatives considered**: Category `other` was rejected as less discoverable.
Changing the license was rejected as unrelated and owner-significant.

**Sources**:

- [Mozilla AMO metadata example](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Mozilla extension categories](https://mozilla.github.io/addons-server/topics/api/categories.html)
- [Mozilla license choices](https://mozilla.github.io/addons-server/topics/api/licenses.html)

## Decision 6: Create a deterministic reviewer-source archive

**Decision**: Package only `src/`, `scripts/`, `tests/`, the build/test
configuration files, `package.json`, `package-lock.json`, `README.md`,
`AMO_BUILD.md`, `LICENSE`, and `amo-metadata.json`. Reject symlinks and exclude
dependencies, generated output, coverage, Git/Squad/Spec Kit state, editor
state, credentials, and local test files.

**Rationale**: An explicit allowlist is reviewable and prevents secret or local
state inclusion. Fixed ordering, timestamps, modes, and compression make the
source artifact reproducible and traceable.

**Alternatives considered**: Archiving the entire checkout with exclusions was
rejected because new sensitive or irrelevant paths could enter silently.
Uploading only `src/` was rejected because reviewers also need scripts, locked
dependencies, tests, and exact build instructions.

## Decision 7: Pin official GitHub actions to immutable commits

**Decision**: Use only official GitHub actions and pin each `uses:` reference
to a full commit SHA with a comment naming the corresponding release. Resolve
the current compatible SHA immediately before implementation and cover the
full-SHA form with workflow contract tests.

**Rationale**: Immutable pins reduce supply-chain drift while comments preserve
maintainability. Hosted `ubuntu-latest` runners satisfy current Node-based
official action runtime requirements.

**Alternatives considered**: Floating major tags were rejected because they can
move without repository review. Third-party actions were rejected because they
would expand the credential-bearing trust boundary.

**Source**: [GitHub secure use reference](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
