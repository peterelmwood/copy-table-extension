# Expected table outputs

Feature 002 serializer fixtures store the reviewed byte-exact HTML, Markdown, plain-text, CSV, and JSON (issue #14) strings for the first semantic table in each fixture as JSON. The suite includes `rowspan="0"`, positive row-span clipping, distinct row-group boundaries, a nested table whose content is excluded from the outer table, and a two-row `<thead>` with spanned header cells, a caption and links (Markdown header merging, issue #12). Fixtures named `aria-*` have no `<table>`: their expected output describes the first ARIA `table`, `grid` or `treegrid` root (issue #19), covering ARIA spans, row groups, column and row headers, hidden rows and cells, widgets, nested roots, and a virtualized grid whose rendered rows are copied. JSON escapes make CRLF records, tabs, and no-trailing-newline requirements reviewable without relying on checkout line-ending conversion.

These files are consumed twice:

- the serializer unit suite (`tests/unit/serializers.test.ts`) checks them against jsdom, and
- the Firefox end-to-end suite (`tests/e2e/copy-flow.e2e.ts`) right-clicks a visible cell of the same table (or ARIA root) in real Firefox and checks the clipboard against every format. Adding a `<name>.json` here adds `<name>.html` to that matrix automatically.
