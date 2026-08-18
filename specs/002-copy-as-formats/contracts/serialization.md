# Contract: Serialization

## Shared geometry

- Rows remain in document order.
- Columns are derived from occupied logical positions.
- An origin cell owns its top-left position.
- Positions covered by row/column spans serialize as empty fields in flattened formats.
- Empty and whitespace-only cells remain present as empty fields.
- Nested-table content is excluded when serializing an outer table.

## HTML

- Output is one standalone `<table>` reconstructed from the logical model.
- Allowed structural elements: `table`, `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`.
- Allowed inline elements: escaped text, `br`, and `a` with a validated `href` and safe fixed `rel` where applicable.
- Allowed cell attributes: valid `rowspan`, `colspan`, and header `scope`.
- Scripts, styles, event attributes, IDs/classes, controls, embedded content, unsafe URLs, and remote resources are forbidden.

## Markdown

- Pipe-table syntax with one header row and one separator row.
- Use the first explicit header row; otherwise use the first logical row.
- Preserve every row value exactly once.
- Escape backslashes before pipes and render cell line breaks as `<br>`.
- Covered and empty positions render as empty cells.

## Plain text

- Tab between fields; LF between rows; no trailing row separator.
- Preserve meaningful in-cell line breaks as spaces so row boundaries remain unambiguous.
- No quoting layer.

## CSV

- Comma between fields; CRLF between records; no extra blank record.
- Double each embedded double quote.
- Quote a field containing comma, double quote, CR, or LF.
- Preserve meaningful in-cell line breaks inside quoted fields.

Fixture outputs are reviewed byte-for-byte and shared by unit and integration tests.
