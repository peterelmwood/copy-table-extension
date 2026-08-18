# Feature Specification: Copy Table as Structured Formats

**Feature Branch**: `002-copy-as-formats`  
**Created**: 2026-08-18  
**Status**: Approved  
**Input**: Add a Firefox context-menu `Copy as` submenu that copies the table directly interacted with by the user as HTML, Markdown, plain text, or CSV.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Copy the table under the pointer (Priority: P1)

A user right-clicks within a semantic table in a supported top-level or same-origin document on the active page, expands **Copy as**, and chooses **HTML**, **Markdown**, **Plain text**, or **CSV**. Copy Table resolves the nearest table containing the element that was right-clicked and places only that table's converted representation on the clipboard.

**Why this priority**: The explicit context-menu action and reliable target selection are the feature's core value.

**Independent Test**: On a page containing two tables, right-click a cell in the second table, choose each submenu item in turn, and verify the clipboard contains only the second table in the selected format.

**Acceptance Scenarios**:

1. **Given** a page with one semantic table, **When** the user right-clicks a cell and chooses **Copy as → CSV**, **Then** the clipboard contains the table as CSV and no unrelated page content.
2. **Given** a page with multiple tables, **When** the user invokes a format from within one table, **Then** the nearest containing table is selected without scanning or combining other tables.
3. **Given** a table nested inside a cell of another table, **When** the user invokes a format within the nested table, **Then** the nested table is the target.
4. **Given** a successful copy, **When** the operation finishes, **Then** the page shows brief, non-blocking confirmation naming the chosen format.

---

### User Story 2 — Preserve useful table structure across formats (Priority: P2)

A user copies real-world tables containing captions, headers, empty cells, embedded links, quotes, commas, line breaks, and row or column spans. Each output remains structurally faithful and usable in tools that accept that format.

**Why this priority**: Copying is only useful when the result is predictable and preserves the table's logical shape.

**Independent Test**: Convert a fixed suite of simple and complex tables and compare every format byte-for-byte with reviewed expected outputs.

**Acceptance Scenarios**:

1. **Given** a table with explicit headers and ordinary cells, **When** copied as Markdown, **Then** the output contains a valid header row, separator row, escaped cell content, and every logical data row.
2. **Given** a table containing commas, double quotes, or line breaks, **When** copied as CSV, **Then** fields are quoted and escaped so a standards-compliant CSV reader reconstructs the same logical matrix.
3. **Given** a table with row or column spans, **When** copied as Markdown, plain text, or CSV, **Then** the spanned value occupies its top-left logical cell and covered positions are represented by empty placeholders.
4. **Given** a table with scripts, styles, event attributes, form controls, or a nested table, **When** copied as HTML, **Then** only safe table structure and user-visible cell content are included; executable or interactive page behavior is excluded.

---

### User Story 3 — Fail safely and visibly (Priority: P3)

A user may invoke a format where no eligible table exists, on a protected browser page, inside an unsupported cross-origin embedded document, or when clipboard access is unavailable. Copy Table explains the failure without changing the existing clipboard and without retaining page data.

**Why this priority**: Silent failure and unintended clipboard replacement undermine trust in an interaction-driven capture tool.

**Independent Test**: Exercise no-table, protected-page, missing-target, and clipboard-rejection cases and verify visible feedback, unchanged clipboard content, and no retained or transmitted table data.

**Acceptance Scenarios**:

1. **Given** the right-clicked element is not inside a semantic table, **When** a Copy as format is chosen, **Then** the page receives concise no-table feedback and the clipboard is unchanged.
2. **Given** the page cannot be inspected because the browser protects it or the target is in a cross-origin embedded document outside the approved permission scope, **When** a format is chosen, **Then** the user receives a permission/restriction message and the clipboard is unchanged.
3. **Given** clipboard writing fails, **When** conversion has completed, **Then** the user receives failure feedback and the converted data is discarded.
4. **Given** any completed or failed operation, **When** the interaction ends, **Then** no table content is persisted, logged, transmitted, or reused by a later interaction.

### Edge Cases

- Empty tables and tables containing only a caption.
- Tables with no explicit header cells or header section.
- Uneven rows, empty cells, and cells that contain only whitespace.
- Multiple header rows and headers using row or column spans.
- Deeply nested inline markup, images with alternative text, and links with unsafe destinations.
- Nested tables whose text must not be duplicated into an outer-table conversion.
- Very large tables, including a representative 100-row by 50-column table.
- The target element disappearing between the context-menu opening and format selection.
- Clipboard or page access being revoked while the operation is in progress.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Copy Table MUST add a top-level **Copy as** context-menu item with exactly four child actions labelled **HTML**, **Markdown**, **Plain text**, and **CSV**.
- **FR-002**: A copy action MUST begin only after the user explicitly selects one of the four format actions.
- **FR-003**: Within a supported top-level or same-origin document, the system MUST resolve the nearest semantic table containing the element that was directly right-clicked; it MUST NOT substitute another table elsewhere on the page.
- **FR-004**: The system MUST process only the active interaction target and MUST NOT continuously scan pages or collect tables before a user action.
- **FR-005**: Every format MUST be derived from one shared logical table matrix so row order, column positions, visible text, empty cells, and span placeholders remain consistent.
- **FR-006**: When explicit table headers are absent, Markdown output MUST use the first logical row as its header while preserving every value from that row.
- **FR-007**: Markdown output MUST escape format-significant pipes, backslashes, and cell line breaks so the result remains a valid Markdown table.
- **FR-008**: Plain-text output MUST use tab separators between logical cells and line separators between logical rows.
- **FR-009**: CSV output MUST use comma separators, double-quote escaping, and CRLF record separators; any field containing a comma, quote, or line break MUST be quoted.
- **FR-010**: HTML output MUST contain a standalone table with safe caption, section, row, header-cell, and data-cell structure while excluding scripts, styles, event handlers, form behavior, unsafe destinations, and nested-table duplication.
- **FR-011**: For flattened formats, a spanned cell's value MUST occupy the top-left logical position and every other covered position MUST be empty.
- **FR-012**: Cell extraction MUST use user-visible textual content, preserve meaningful line breaks, include useful image alternative text, and exclude content belonging to nested tables.
- **FR-013**: A successful operation MUST replace the clipboard exactly once with the selected representation and show brief, non-blocking success feedback.
- **FR-014**: A failed operation MUST leave the existing clipboard unchanged and show brief, actionable failure feedback.
- **FR-015**: Converted table data MUST be discarded immediately after the clipboard attempt and MUST NOT be persisted, logged, transmitted, or included in telemetry.
- **FR-016**: The feature MUST work with the existing Firefox scaffold and MUST NOT produce or claim a Chrome package in this feature.
- **FR-017**: Automated tests MUST cover menu structure, Firefox Promise response transport, target resolution, row-group-bounded logical matrix construction, all four serializers, complex spans/escaping, safe HTML, success feedback, and failure behavior.

### Privacy & Permission Requirements *(mandatory)*

- **PR-001**: Page access MUST be temporary and limited to the active tab and supported top-level or same-origin documents after an explicit context-menu action.
- **PR-002**: The extension MUST NOT request broad persistent access to all sites when temporary interaction-scoped access is sufficient.
- **PR-003**: Clipboard authority MUST be limited to writing the explicit result; clipboard reads are prohibited.
- **PR-004**: The only additional browser capabilities permitted are those strictly required to create the context menu, inspect a supported active interaction target, execute the user-requested conversion, write the result, show fixed local restriction feedback when injection is rejected before a page receiver exists, and show one fixed payload-free delivery notification if an already-started operation cannot return or display its outcome.
- **PR-005**: No page URL, table content, converted output, or interaction metadata may leave the local browser or survive the operation.

### Key Entities

- **Interaction Target**: The page element directly right-clicked, its active tab/frame identity, and the nearest containing semantic table.
- **Logical Table Matrix**: An ordered rectangular representation of captions, header metadata, visible cell values, and span-derived empty placeholders.
- **Copy Format**: One of HTML, Markdown, plain text, or CSV, with deterministic serialization rules.
- **Copy Result**: Success or a bounded failure category, selected format, and user-facing feedback; it contains no retained table payload after completion.

### Assumptions

- Version one targets semantic HTML `<table>` elements; ARIA grids and visually table-like `<div>` layouts are out of scope.
- The context menu may be visible outside a table because eligibility is resolved from the exact clicked target after the user selects a format; safe no-table feedback is required in that case.
- The accepted `activeTab` design supports the top-level document and same-origin embedded documents. Direct inspection of cross-origin embedded documents is intentionally unsupported without broader host permission; a visible menu action there fails with fixed restriction feedback and no target substitution.
- Formatting is deterministic and locale-independent; values are copied as displayed text and are not retyped as numbers, dates, or formulas.
- For an outer table cell containing a nested table, only the outer cell's own visible non-table content is included when the outer table is the target.

### Out of Scope

- Chrome/Chromium packaging or store submission.
- Copying arbitrary selections, lists, ARIA grids, canvas content, or non-semantic visual tables.
- Editing, previewing, or configuring conversions before copying.
- Retaining copy history, synchronizing results, analytics, telemetry, or remote processing.
- Rich multi-MIME clipboard writes; each action writes the selected representation as text.
- Inspecting tables inside cross-origin embedded documents or requesting broad/optional host permission to do so.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every reviewed fixture, all four outputs match their approved expected representations exactly in 100% of automated runs.
- **SC-002**: A table up to 100 rows by 50 columns is converted, written, and acknowledged within 2 seconds on a typical developer workstation in at least 95% of 20 attempts.
- **SC-003**: In a page containing multiple and nested tables, 100% of 30 target-selection trials copy only the nearest table containing the directly right-clicked element.
- **SC-004**: All tested no-table, protected-page, cross-origin-frame, missing-target, delivery-loss, and clipboard-rejection cases preserve the previous clipboard and show feedback within 1 second.
- **SC-005**: Permission review confirms zero persistent broad host access, zero clipboard-read access, zero network destinations, and only interaction-required capabilities.
- **SC-006**: A Firefox user can discover the submenu and complete a copy in any supported format in no more than three menu selections without opening the extension popup.
