# Data Model: Copy Table as Structured Formats

All entities are ephemeral. No entity is persisted, logged, or transmitted.

## Copy Request

| Field | Type | Rules |
|---|---|---|
| requestId | opaque string | Exists only to correlate one request/outcome; contains no page data |
| targetElementId | integer | Firefox-issued expiring handle from the menu event |
| tabId | integer | Required background routing identifier |
| frameId | integer | Exact clicked document; defaults to top frame only when Firefox omits it |
| format | enum | `html`, `markdown`, `text`, or `csv` |

## Logical Table

| Field | Type | Rules |
|---|---|---|
| caption | safe inline sequence or absent | Visible caption only |
| rows | ordered Logical Row list | Source document order across header/body/footer sections |
| columnCount | positive integer | Maximum occupied logical column count |
| headerRowIndexes | integer set | Rows containing explicit header semantics |

## Logical Row

| Field | Type | Rules |
|---|---|---|
| section | enum | `head`, `body`, or `foot` |
| cells | array length `columnCount` | Each position is an origin cell or covered placeholder |

## Logical Cell Position

Two variants:

- **Origin Cell**: visible text, safe inline sequence, `header` boolean, optional scope, source row/column, and positive row/column spans.
- **Covered Placeholder**: empty value plus the source row/column of its owning origin cell.

Span collisions or invalid span values produce a bounded extraction failure rather than a malformed matrix.

## Safe Inline Token

| Variant | Fields | Rules |
|---|---|---|
| text | value | Visible normalized text only |
| break | none | Meaningful line break |
| link | label tokens, URL | Only approved absolute/relative HTTP(S), mailto, or fragment destinations; no event or style metadata |

Images contribute visible alternative text as text tokens. Nested tables, scripts, styles, form controls, templates, and non-rendered content contribute nothing.

## Copy Outcome

| Field | Type | Rules |
|---|---|---|
| requestId | opaque string | Correlates outcome only |
| status | enum | `success`, `no-table`, `target-expired`, `restricted-page`, `invalid-table`, `clipboard-failed`, `unexpected` |
| format | Copy Format | Safe to show in confirmation |
| message | bounded string | Fixed user-facing copy; never includes page/table payload |

The serialized payload exists only between successful extraction and the clipboard attempt and is deleted from references immediately afterward.
