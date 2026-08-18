# Copy Structured Data Design

## Objective

Create a Firefox-first browser extension that captures structured data from the
page a user or authorized agent is directly interacting with. The working
product name is **Copy Table**, while **Copy Structured Data** describes the
broader product direction.

## Delivery Model

The repository uses GitHub Spec Kit with the Codex integration as the source of
truth for requirements, research, plans, and tasks. Squad consumes those
artifacts and implements each feature only after its specification, plan, and
task list are complete and validated.

## Architecture

The extension will use Firefox Manifest V3 and TypeScript. Page inspection and
structured-data extraction run in a content-script boundary. Browser commands
and context-menu orchestration run in the background/service-worker boundary.
Pure conversion modules transform a normalized table-shaped model into HTML,
Markdown, plain text, and CSV so extraction and serialization can be tested
without a browser.

All capture is initiated by an explicit user or authorized agent action. Data
is processed locally and copied to the clipboard; no analytics, remote upload,
or persistent capture history is included.

## Squad

The project team contains:

- A technical lead and Spec Kit steward responsible for scope and architecture.
- A Firefox/WebExtensions engineer responsible for manifest and browser APIs.
- A DOM and structured-data engineer responsible for selection and extraction.
- A browser-extension QA engineer responsible for unit, integration, and
  Firefox validation.
- A scribe responsible for decisions, handoffs, and durable team context.

## Feature Sequence

### Feature 1: Firefox Extension Scaffold

Produce an installable Firefox extension foundation with a minimal popup or
status surface, content/background boundaries, build tooling, automated tests,
and documented temporary-install instructions. It must request only permissions
needed for the approved behavior and provide a clean base for later Chromium
support.

### Feature 2: Copy As Structured Data

Add a context-menu flow:

`Copy as` -> `HTML | Markdown | Text | CSV`

The command operates on the semantic table associated with the interaction
target in a supported top-level or same-origin document. Cross-origin embedded
documents remain out of scope without broader host authority. It normalizes headers, rows, and cells, handles
spans or irregular rows predictably, serializes deterministically, writes the
result to the clipboard, and reports unsupported or failed captures clearly.

## Quality and Safety

- Firefox is the only required runtime for the first two features.
- Browser-specific APIs remain behind focused adapters for future Chromium work.
- Capture is explicit, local-first, and permission-minimized.
- Serializers are pure and deterministic.
- Tests cover extraction, escaping, formatting, context-menu routing, and error
  behavior.
- Spec Kit artifacts are authoritative; implementation deviations are recorded
  as decisions and reflected back into the artifacts.

## Exclusions

Chrome packaging, cloud synchronization, telemetry, automatic background page
scraping, OCR, PDF extraction, and arbitrary schema inference are outside these
two features.
