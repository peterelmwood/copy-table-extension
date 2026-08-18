# Feature Specification: Firefox Build and Public Publishing

**Feature Branch**: `003-firefox-publishing`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Add separate build and publish workflows, register Copy Table publicly with Firefox Add-ons using the permanent ID copy-table@peterelmwood.com, and publish stable releases from matching version tags."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify Every Proposed Change (Priority: P1)

As a maintainer, I receive an automatic, reproducible build and validation
result for every proposed change and every change accepted into the main line,
without risking an extension-store submission.

**Why this priority**: Public releases are trustworthy only when the same
quality gates protect every change before release credentials are involved.

**Independent Test**: Open a proposed change containing a known validation
failure and confirm that the build reports the failure, creates no public
submission, and exposes no publishing credentials. Correct the failure and
confirm that the build produces a reviewable extension artifact.

**Acceptance Scenarios**:

1. **Given** a proposed repository change, **When** automated validation runs,
   **Then** it installs the locked dependencies, executes all required quality
   gates, and reports a clear pass or failure.
2. **Given** a successful non-release build, **When** the run completes,
   **Then** maintainers can retrieve the packaged extension for 30 days.
3. **Given** any proposed change or ordinary main-line update, **When** its
   build runs, **Then** no Firefox Add-ons submission is attempted and no
   publishing credential is made available to the build.

---

### User Story 2 - Submit a Stable Public Firefox Release (Priority: P2)

As the extension owner, I can mark an approved stable version for release and
have a clean, fully verified copy submitted to the public Firefox Add-ons
listing under the permanent Copy Table identity.

**Why this priority**: This is the distribution outcome of the feature, but it
must depend on the verification foundation from User Story 1.

**Independent Test**: From an approved commit whose declared versions agree,
create a stable release marker and confirm that exactly one clean release is
submitted to the public listing with the required listing metadata and
reviewer source. Repeat with a mismatched or malformed version and confirm that
submission is blocked before contacting Firefox Add-ons.

**Acceptance Scenarios**:

1. **Given** an approved commit with consistent stable version declarations,
   **When** the owner creates the matching `vX.Y.Z` release marker, **Then** the
   system rebuilds and revalidates the extension from a clean checkout before
   attempting submission.
2. **Given** the first valid public submission, **When** Firefox Add-ons accepts
   it, **Then** a public listing is created for
   `copy-table@peterelmwood.com` with the required owner-approved metadata.
3. **Given** an existing public listing, **When** a later valid stable release
   is submitted, **Then** it is associated with the same permanent identity.
4. **Given** an inconsistent, malformed, duplicate, or unsupported release
   version, **When** publication is requested, **Then** the release stops before
   submitting a new version.

---

### User Story 3 - Audit and Recover a Release (Priority: P3)

As an owner or reviewer, I can understand what was built, reproduce it from
human-readable source, distinguish submission from publication, and recover
safely from store or network failures.

**Why this priority**: Mozilla review and external-service failures are outside
the repository's control, so durable evidence and honest status reporting are
required to operate the release process safely.

**Independent Test**: Inspect a completed dry run and a simulated ambiguous
submission failure. Confirm that the source package contains everything needed
to reproduce the build but no generated output, dependency cache, repository
history, or credentials, and that recovery instructions require checking the
Firefox Add-ons developer portal before retrying.

**Acceptance Scenarios**:

1. **Given** a release candidate, **When** its reviewer-source package is
   inspected, **Then** it contains the human-readable source, locked dependency
   description, configuration, tests, and build instructions needed to
   reproduce the submitted extension.
2. **Given** a submission accepted for review, **When** the release run reports
   its outcome, **Then** it labels the version as submitted or pending and does
   not claim the version is publicly available until that is confirmed.
3. **Given** a timeout or otherwise ambiguous response after upload, **When**
   the run fails, **Then** it directs the owner to inspect the developer portal
   before retrying the same version.
4. **Given** a maintainer without publishing credentials, **When** they follow
   the documented dry run, **Then** they can reproduce every local release
   check and artifact without contacting Firefox Add-ons.

### Edge Cases

- A release marker is well formed but does not match one or more declared
  extension versions.
- A pre-release, build-metadata, malformed, or moving release marker attempts
  to enter the stable public channel.
- The public listing already contains the requested version.
- Required listing metadata or reviewer source is missing or incomplete.
- Publishing credentials are absent, expired, revoked, or rejected.
- Firefox Add-ons accepts an upload but the client loses the final response.
- Mozilla review remains pending longer than the automation run.
- Two release requests are initiated close together.
- An artifact contains an undeclared file, a generated file becomes stale, or
  the reviewer-source archive accidentally includes excluded material.
- A future change adds a browser permission without updating the accepted
  feature specification and release evidence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically build and validate every proposed
  change and every change accepted into the main line.
- **FR-002**: Every automated build MUST execute the repository's complete
  required verification contract from locked dependencies.
- **FR-003**: A successful non-release build MUST produce a reviewable packaged
  extension that remains retrievable for 30 days.
- **FR-004**: Proposed-change and ordinary main-line builds MUST NOT initiate a
  Firefox Add-ons submission.
- **FR-005**: Public submission MUST be initiated only by a newly created,
  immutable stable release marker in the exact form `vX.Y.Z`.
- **FR-006**: Before any external submission, the release version MUST match
  every authoritative version declaration in the repository.
- **FR-007**: All public releases MUST use the permanent Firefox extension
  identity `copy-table@peterelmwood.com`.
- **FR-008**: The first valid release MUST be capable of creating the public
  Firefox Add-ons listing, and later releases MUST update that same listing.
- **FR-009**: Every first public submission MUST include the required
  owner-approved listing summary and category; subsequent releases MUST retain
  or deliberately update the listing metadata.
- **FR-010**: Every public submission MUST include a human-readable source
  package and reproducible build instructions suitable for extension review.
- **FR-011**: The release candidate MUST be rebuilt and revalidated from a clean
  checkout rather than trusting an artifact produced by a different run.
- **FR-012**: Publishing credentials MUST be available only to the public
  submission operation and MUST never be available to proposed-change builds.
- **FR-013**: Release automation MUST operate with read-only repository access
  unless a separately accepted requirement demonstrates a need for broader
  access.
- **FR-014**: The system MUST distinguish build success, submission acceptance,
  review pending, public availability, rejection, and ambiguous external
  failure whenever those states are knowable.
- **FR-015**: A failed prerequisite, validation gate, packaging step, or known
  submission rejection MUST stop the release and identify the failed gate.
- **FR-016**: Conflicting publication attempts MUST be serialized so that no
  two runs can submit the same release concurrently.
- **FR-017**: Maintainer documentation MUST cover developer-account setup,
  protected credential configuration, first submission, stable updates, local
  dry runs, status interpretation, and ambiguous-failure recovery.
- **FR-018**: Release artifacts and logs MUST provide enough evidence to trace
  a submitted version back to its immutable repository revision.

### Privacy and Permission Requirements *(mandatory for browser features)*

- **PR-001**: Public submission MUST begin only from an explicit release marker
  created by an authorized repository maintainer.
- **PR-002**: This feature MUST NOT capture, transmit, log, or retain page or
  clipboard content; its external transfer is limited to extension artifacts,
  reviewer source, listing metadata, and release status.
- **PR-003**: This feature MUST introduce no new browser permission. Any future
  permission change requires an accepted functional requirement, rationale,
  and verification evidence before release.
- **PR-004**: Build and submission logs MUST exclude page content, clipboard
  content, publishing secrets, and complete credential-bearing commands.
- **PR-005**: Public distribution in this feature is Firefox-only. Chromium and
  other extension stores remain deferred.

### Key Entities

- **Release Candidate**: An immutable repository revision, stable version, and
  release marker that have passed all prerequisite checks.
- **Extension Artifact**: The installable package built from the release
  candidate and submitted for Firefox Add-ons validation.
- **Reviewer Source Package**: The human-readable project inputs and build
  instructions needed to reproduce the extension artifact.
- **Public Listing**: The Firefox Add-ons identity, metadata, versions, and
  review state associated with `copy-table@peterelmwood.com`.
- **Submission Result**: The known outcome of a release attempt, including the
  immutable revision, version, timestamp, and store-reported state.

### Out of Scope

- Chromium packaging or publication to non-Firefox stores.
- Unlisted, self-hosted, beta, nightly, or other pre-release distribution.
- Automatic version selection, version-file editing, committing, or tag
  creation by the release automation.
- Creation of a separate repository release page or distribution of unsigned
  packages as end-user downloads.
- Bypassing, accelerating, or predicting Mozilla review.
- Adding telemetry, remote services, new browser permissions, or a privacy
  policy requirement unrelated to the existing local-only behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of proposed changes and accepted main-line changes receive a
  reproducible pass-or-fail result without initiating public submission.
- **SC-002**: 100% of malformed or version-mismatched release requests stop
  before a new version is sent to Firefox Add-ons.
- **SC-003**: An authorized owner can submit an eligible stable version in one
  release-marker action and without manually uploading either archive.
- **SC-004**: Every submitted version has one traceable extension artifact and
  one reproducible reviewer-source package associated with the same immutable
  revision.
- **SC-005**: A maintainer can complete the documented no-credential dry run in
  under 10 minutes on a prepared development machine.
- **SC-006**: Automated inspection finds zero dependency directories,
  generated extension output, repository-history data, or credential files in
  the reviewer-source package.
- **SC-007**: Automated inspection finds zero publishing credentials in
  proposed-change execution contexts, retained artifacts, and logs.
- **SC-008**: Release reporting never labels an unconfirmed submission as
  publicly available, across all tested success, pending, rejection, timeout,
  and recovery scenarios.

## Assumptions

- The repository remains hosted where proposed changes, main-line updates,
  immutable version tags, protected release environments, and encrypted
  publishing secrets are available.
- The owner will create or use a Mozilla account, accept the Firefox Add-ons
  developer terms, generate API credentials, and configure those credentials
  in the protected release environment.
- Stable public releases use semantic `X.Y.Z` versions and matching `vX.Y.Z`
  release markers; pre-release publication will receive a separate feature if
  needed.
- Mozilla review timing and final publication decisions are external to this
  repository and may outlast an automation run.
- The existing build, test, packaging, privacy, and permission contracts remain
  authoritative unless this specification explicitly changes them.
- The current source language and generated extension output require a readable
  source submission and reproducible build instructions for reviewer clarity.
