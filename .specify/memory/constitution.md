<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles: Initial adoption; no prior principles existed.
- Added principles:
  - I. Explicit Interaction and User Agency
  - II. Local-First Data Stewardship
  - III. Least Privilege and Firefox-First Portability
  - IV. Semantic Determinism and Format Fidelity
  - V. Test-First Spec-Driven Delivery
- Added sections:
  - Product and Technical Constraints
  - Development Workflow and Quality Gates
- Removed sections: None.
- Templates:
  - updated: .specify/templates/plan-template.md
  - updated: .specify/templates/spec-template.md
  - updated: .specify/templates/tasks-template.md
- Runtime guidance reviewed:
  - docs/superpowers/specs/2026-08-17-copy-structured-data-design.md
  - docs/superpowers/plans/2026-08-17-repository-bootstrap.md
- Follow-up TODOs: None.
-->

# Copy Structured Data Constitution

## Core Principles

### I. Explicit Interaction and User Agency

The extension MUST capture page data only after an explicit action by the user
or by an agent the user has authorized to interact with that page. It MUST NOT
scan, collect, or copy page content in the background without that action. The
capture target and requested output format MUST be derived from the current
interaction context and MUST be understandable from visible product behavior.

Rationale: structured page content may be sensitive even when it is visible;
an explicit interaction boundary preserves user intent and control.

### II. Local-First Data Stewardship

Captured content MUST be processed locally and MUST NOT be transmitted to a
remote service, included in telemetry, or retained as capture history. The
default successful outcome is clipboard delivery followed by disposal of
transient capture state. Logs and error reports MUST NOT include captured cell
contents or other page data.

Rationale: the product exists to move data under the user's control, not to
create another store or processor of that data.

### III. Least Privilege and Firefox-First Portability

Every requested browser permission MUST be required by an accepted user story,
documented in the feature plan, and covered by a verification task. Host access
MUST be limited to what the active capture flow needs. The first supported
runtime is Firefox Manifest V3. Browser-specific behavior MUST remain behind
focused adapters so future Chromium support does not require rewriting the
extraction or serialization core.

Rationale: narrow permissions reduce risk, while clear browser boundaries keep
future portability achievable without prematurely shipping a Chrome build.

### IV. Semantic Determinism and Format Fidelity

Extraction MUST normalize a selected table or table-like region into a single,
documented structured model before formatting. Given the same normalized input
and options, HTML, Markdown, text, and CSV serializers MUST produce the same
output byte-for-byte. Escaping, headers, empty cells, irregular rows, and cell
spans MUST have explicit, tested behavior. Unsupported targets MUST fail
clearly; the extension MUST NOT silently invent missing data.

Rationale: copied structured data is useful only when its meaning and output
are predictable.

### V. Test-First Spec-Driven Delivery (NON-NEGOTIABLE)

Each feature MUST progress through accepted `spec.md`, `plan.md`, and
`tasks.md` artifacts before implementation begins. Tests MUST be written before
the corresponding production behavior, observed failing for the intended
reason, and then made to pass with the smallest implementation. Unit tests MUST
cover normalization and serializers; integration tests MUST cover browser
routing, permissions, clipboard delivery, and documented error paths. Squad
MUST use the active Spec Kit artifacts as authoritative task context and MUST
record any necessary deviation before implementing it.

Rationale: the project coordinates multiple agents and browser boundaries;
executable specifications and traceable artifacts prevent silent divergence.

## Product and Technical Constraints

- The repository objective is to create an extension for capturing structured
  data from a browser page being directly interacted with by a user or agent.
- The initial product name is **Copy Table**; **Copy Structured Data** is the
  broader descriptive name.
- Firefox is the required runtime for the first two feature increments. Chrome
  packaging and validation are deferred to a future specification.
- TypeScript is the default implementation language. Pure domain modules MUST
  not depend on browser globals.
- No cloud service, authentication system, analytics pipeline, OCR workflow,
  or persistent capture database may be introduced without a constitution
  amendment and a dedicated specification.
- Accessibility, keyboard behavior, and clear failure feedback MUST be included
  whenever a feature adds user-visible interaction.

## Development Workflow and Quality Gates

1. The constitution is reviewed before planning and again after design.
2. Specifications MUST contain prioritized, independently testable user
   stories, measurable outcomes, edge cases, privacy constraints, permission
   requirements, and explicit exclusions.
3. Plans MUST document architecture boundaries, browser compatibility,
   permission rationale, test strategy, and unresolved research. Planning MUST
   stop if a constitution gate fails or clarification remains unresolved.
4. Task lists MUST include test-first work, exact file paths, dependency order,
   independent story checkpoints, documentation, and permission/privacy
   verification.
5. The Spec Kit Squad bridge MUST align active roles after specification and
   route open tasks after task generation. Squad status MUST be checked before
   implementation.
6. A feature is complete only when required tasks are checked off, the build
   and tests pass, the quickstart is validated, and implementation matches the
   accepted specification and plan.

## Governance

This constitution supersedes conflicting project practices and generated
guidance. Amendments require a documented rationale, an explicit approval by
the repository owner, a Sync Impact Report, updates to affected templates and
runtime guidance, and a semantic version change.

Versioning follows semantic versioning: MAJOR for incompatible governance or
principle removals/redefinitions, MINOR for new principles or materially
expanded obligations, and PATCH for clarifications that do not change required
behavior. Every specification, plan, task list, and implementation review MUST
verify constitution compliance. Complexity or exceptions MUST be recorded in
the plan's Complexity Tracking section and approved before implementation.

**Version**: 1.0.0 | **Ratified**: 2026-08-17 | **Last Amended**: 2026-08-17
