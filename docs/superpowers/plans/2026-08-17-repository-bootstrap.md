# Copy Structured Data Repository Bootstrap Implementation Plan

> **For agentic workers:** Use the Spec Kit workflow and Squad bridge described
> below. Track feature implementation in each generated `tasks.md` file.

**Goal:** Initialize a reproducible Codex, Spec Kit, and Squad workflow and use
it to deliver the Firefox scaffold followed by structured copy commands.

**Architecture:** Spec Kit owns requirements and planning artifacts. A
browser-extension-focused Squad implements tasks in dependency order. The
extension uses Firefox Manifest V3, TypeScript, browser adapters, pure
normalization/serialization modules, and automated tests.

**Tech Stack:** Git, GitHub Spec Kit, Codex integration, Spec Kit Git and Squad
extensions, `@bradygaster/squad-cli`, Node.js 24, TypeScript, Firefox
WebExtensions APIs.

**Spec:** `docs/superpowers/specs/2026-08-17-copy-structured-data-design.md`

## Global Constraints

- Firefox is the required browser for the first two features.
- Capture occurs only after explicit user or authorized-agent interaction.
- Captured data remains local and is not retained after clipboard delivery.
- Browser permissions must be minimized and documented.
- Feature implementation begins only after `spec.md`, `plan.md`, and `tasks.md`
  are complete and validated.
- Squad must read and follow all available artifacts for the active feature.

---

### Task 1: Repository Tooling

**Files:**
- Create: `.specify/` using the Specify CLI
- Create: `.agents/skills/` using the Codex integration
- Create: `package.json`
- Create: `package-lock.json`

**Interfaces:**
- Consumes: Git, Node.js, npm, uv, Codex, and the installed Specify CLI
- Produces: Codex-visible Spec Kit commands and a pinned local Squad CLI

- [ ] Initialize Spec Kit in place with the Codex and PowerShell options.
- [ ] Add the Spec Kit Git extension.
- [ ] Add the Spec Kit Squad bridge extension.
- [ ] Reactivate the Codex integration so extension skills are registered.
- [ ] Install `@bradygaster/squad-cli@latest` as a development dependency.
- [ ] Verify CLI versions and generated integration files.

### Task 2: Squad Configuration

**Files:**
- Create: `.squad/team.md`
- Create: `.squad/routing.md`
- Create: `.squad/agents/*/charter.md`
- Create: `.github/agents/squad.agent.md`

**Interfaces:**
- Consumes: the approved project design and Spec Kit artifacts
- Produces: persistent browser-extension roles and routing rules

- [ ] Initialize Squad in markdown-first mode.
- [ ] Configure lead, WebExtensions, structured-data, QA, and scribe roles.
- [ ] Route specification, browser API, DOM extraction, and testing work.
- [ ] Run `squad doctor` and resolve repository-local failures.

### Task 3: Constitution

**Files:**
- Modify: `.specify/memory/constitution.md`
- Validate: `.specify/templates/plan-template.md`
- Validate: `.specify/templates/spec-template.md`
- Validate: `.specify/templates/tasks-template.md`

**Interfaces:**
- Consumes: the approved objective and quality constraints
- Produces: governance gates used by both feature plans

- [ ] Define the project objective and non-negotiable principles.
- [ ] Add amendment, versioning, and compliance-review governance.
- [ ] Propagate principle-driven checks into dependent templates if needed.
- [ ] Validate that no placeholders remain.

### Task 4: Firefox Scaffold Feature

**Files:**
- Create: `specs/001-firefox-extension-scaffold/spec.md`
- Create: `specs/001-firefox-extension-scaffold/plan.md`
- Create: `specs/001-firefox-extension-scaffold/tasks.md`
- Create: feature implementation files determined by the generated plan

**Interfaces:**
- Consumes: constitution and Spec Kit templates
- Produces: a tested, temporarily installable Firefox extension foundation

- [ ] Run the specify workflow and complete its quality checklist.
- [ ] Run the plan workflow and resolve all research questions.
- [ ] Generate dependency-ordered tasks with exact file paths.
- [ ] Route open tasks to Squad using the bridge.
- [ ] Verify build, tests, and Firefox installation instructions.
- [ ] Commit the completed feature before starting Feature 2.

### Task 5: Copy As Feature

**Files:**
- Create: `specs/002-copy-as-structured-data/spec.md`
- Create: `specs/002-copy-as-structured-data/plan.md`
- Create: `specs/002-copy-as-structured-data/tasks.md`
- Modify: feature implementation files determined by the generated plan

**Interfaces:**
- Consumes: the completed Firefox scaffold
- Produces: `Copy as` context-menu commands for HTML, Markdown, Text, and CSV

- [ ] Run the specify workflow and complete its quality checklist.
- [ ] Run the plan workflow and resolve all research questions.
- [ ] Generate dependency-ordered tasks with exact file paths.
- [ ] Route open tasks to Squad using the bridge.
- [ ] Verify format escaping, normalization, clipboard behavior, and errors.
- [ ] Run the complete build and test suite and commit the completed feature.

