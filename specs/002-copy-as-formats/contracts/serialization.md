# Contract: Serialization

## Shared geometry

- Rows remain in document order.
- Source row-group boundaries remain distinct.
- Columns are derived from occupied logical positions.
- An origin cell owns its top-left position.
- Positions covered by row/column spans serialize as empty fields in flattened formats.
- Empty and whitespace-only cells remain present as empty fields.
- Nested-table content is excluded when serializing an outer table.
- `rowspan="0"` covers the remaining rows in its owning row group. Positive row spans are clipped at that group boundary. Row spans use the HTML limit of 65,534; column spans use 1,000; invalid or over-limit values fail extraction.

## HTML

- Output is one standalone `<table>` reconstructed from the logical model.
- Allowed structural elements: `table`, `caption`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`.
- Allowed inline elements: escaped text, `br`, and `a` with a validated `href` and safe fixed `rel` where applicable.
- Allowed cell attributes: valid `rowspan`, `colspan`, and header `scope`.
- Scripts, styles, event attributes, IDs/classes, controls, embedded content, unsafe URLs, and remote resources are forbidden.
- Clipboard (issue #7): written as `text/html` together with the Plain text serialization of the same table as `text/plain`, so rich editors render a table and plain-text targets get the tab-separated matrix. A unit test pins the allowed elements and attributes above, since rich targets render this markup.
- **HTML source** writes this same serialization as `text/plain` only, so code editors such as VS Code receive the markup itself.

## Markdown

- Pipe-table syntax with one header row and one separator row.
- Use the first explicit header row; otherwise use the first logical row.
- Preserve every row value exactly once.
- Escape backslashes before pipes and render cell line breaks as `<br>`.
- Covered and empty positions render as empty cells.

> **Amended by issue #12** (Markdown fidelity). The rules above still hold, with these additions:
>
> - **Links.** Safe links (http, https, mailto and relative hrefs already allowed by `sanitizeLinkHref`) render as `[text](href)`. Link text escapes `\`, `|`, `[`, `]`, `*`, `_`, `` ` ``, `<` and `>` with a backslash; the destination percent-encodes whitespace, `(`, `)`, `<`, `>`, `|`, `\` and `` ` `` (existing `%` escapes are kept). Links removed as unsafe during extraction stay plain text. Plain cell text keeps the original escaping.
> - **Header rows.** The header is the first explicit header row plus the header rows directly after it in the same row group: further `<thead>` rows, or rows made only of `<th>` cells. They are merged into the one GFM header row by joining each column's non-empty values, top to bottom, with a slash between single spaces (`Sales / Q1`). Covered (spanned) positions contribute nothing, so a spanned header value appears once, in its origin column. Row-header rows such as `<th scope="row">` plus `<td>` in the body stay body rows. Without any explicit header row, the first logical row is still the header.
> - **Caption.** A non-empty caption is emitted first as `**Caption**`, escaped like link text (links inside it keep their text only), followed by a blank line and then the table.
> - Line breaks in cells, link text and the caption render as `<br>`.

## Plain text

- Tab between fields; LF between rows; no trailing row separator.
- Preserve meaningful in-cell line breaks as spaces so row boundaries remain unambiguous.
- No quoting layer.

## CSV

- Comma between fields; CRLF between records; no extra blank record.
- Double each embedded double quote.
- Quote a field containing comma, double quote, CR, or LF.
- Preserve meaningful in-cell line breaks inside quoted fields.

## JSON

> **Amended by issue #14** (JSON format). A sixth format, written as plain text like CSV:
>
> - **Header rows.** The table has a header when its first logical row is a `<thead>` row or a row made only of `<th>` cells. The header rows are then the same range Markdown merges (that row plus the `<thead>`/all-`<th>` rows directly after it in the same row group), and each column's name joins the non-empty header texts over it, top to bottom, with `/`. Unlike Markdown, a header cell spanning several columns names **every** column it covers (counted once per column even when it also spans rows), so `<th colspan=2>Sales</th>` names two columns.
> - **Names.** An empty name becomes `Column N` (1-based column index). A repeated name gets the first free suffix `_2`, `_3`, … in column order, so naming is deterministic.
> - **With a header:** an array of objects, one per remaining row (body and footer rows alike; the merged header rows are not repeated), with members in column order.
> - **Without a header:** an array of arrays, one per logical row.
> - **Values** are always strings: the same displayed cell text the Plain text and CSV formats use, never retyped as numbers or booleans. In-cell line breaks stay as `\n` (escaped by JSON), as in CSV. Covered (spanned) and empty positions are `""`.
> - **Encoding.** Two-space indentation, identical to `JSON.stringify(value, null, 2)`, with no trailing newline. All escaping is done by `JSON.stringify`. Objects are assembled member by member (each key and value still passed through `JSON.stringify`) so integer-like header names such as `2024` keep their column position instead of being moved first by JavaScript key ordering. A table with no data rows is `[]`.

Fixture outputs, including the row-group-bounded `rowspan="0"` case, are reviewed byte-for-byte and consumed by the serializer unit suite for all four formats. Browser integration tests separately exercise the request, clipboard, payload-release, outcome, and notification boundaries with controlled representative payloads.
