import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractLogicalTable } from "../../src/table/extract";
import { serializeCsv } from "../../src/table/serialize/csv";
import { serializeHtml } from "../../src/table/serialize/html";
import { serializeMarkdown } from "../../src/table/serialize/markdown";
import { serializeText } from "../../src/table/serialize/text";
import type { CopyFormat, LogicalTable, LogicalTableOriginCell } from "../../src/table/model";

const fixtureDirectory = resolve(import.meta.dirname, "../fixtures/tables");
const expected = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "expected/complex-table.json"), "utf8")
) as Record<CopyFormat, string>;

const serializers = {
  html: serializeHtml,
  markdown: serializeMarkdown,
  text: serializeText,
  csv: serializeCsv
} as const;

function complexLogicalTable() {
  document.body.innerHTML = readFileSync(resolve(fixtureDirectory, "complex-table.html"), "utf8");
  const table = document.querySelector("table");
  if (!(table instanceof HTMLTableElement)) {
    throw new Error("Complex fixture did not contain a semantic table.");
  }
  return extractLogicalTable(table);
}

function originCell(text: string, sourceColumn: number): LogicalTableOriginCell {
  return {
    kind: "origin",
    text,
    inline: [{ type: "text", value: text }],
    isHeader: false,
    scope: null,
    sourceRow: 0,
    sourceColumn,
    rowSpan: 1,
    columnSpan: 1
  };
}

describe("table serializers", () => {
  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the reviewed complex-table %s fixture byte-for-byte",
    (format) => {
      expect(serializers[format](complexLogicalTable())).toBe(expected[format]);
    }
  );

  it("uses the first logical row as the Markdown header when no explicit header exists", () => {
    document.body.innerHTML = "<table><tr><td>A</td><td>B</td></tr><tr><td>1</td></tr></table>";
    const table = document.querySelector("table");
    if (!(table instanceof HTMLTableElement)) {
      throw new Error("Inline fixture did not contain a semantic table.");
    }

    expect(serializeMarkdown(extractLogicalTable(table))).toBe(
      "| A | B |\n| --- | --- |\n| 1 |  |"
    );
  });

  it("quotes CSV fields containing commas, quotes, CR, or LF and emits CRLF records", () => {
    const logical: LogicalTable = {
      caption: null,
      captionText: null,
      columnCount: 2,
      headerRowIndexes: [],
      rows: [
        {
          section: "body",
          cells: [originCell("comma, value", 0), originCell('say "yes"', 1)]
        },
        {
          section: "body",
          cells: [originCell("line one\nline two", 0), originCell("carriage\rreturn", 1)]
        }
      ]
    };

    expect(serializeCsv(logical)).toBe(
      '"comma, value","say ""yes"""\r\n"line one\nline two","carriage\rreturn"'
    );
  });
});
