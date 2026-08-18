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
const visibilityPolicyExpected = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "expected/visibility-policy-table.json"), "utf8")
) as Record<CopyFormat, string>;
const visibilityOverrideExpected = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "expected/visibility-override-table.json"), "utf8")
) as Record<CopyFormat, string>;
const transparentContainerExpected = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "expected/transparent-container-table.json"), "utf8")
) as Record<CopyFormat, string>;

const serializers = {
  html: serializeHtml,
  markdown: serializeMarkdown,
  text: serializeText,
  csv: serializeCsv
} as const;

function complexLogicalTable() {
  return fixtureLogicalTable("complex-table.html");
}

function fixtureLogicalTable(fixtureName: string) {
  document.body.innerHTML = readFileSync(resolve(fixtureDirectory, fixtureName), "utf8");
  const table = document.querySelector("table");
  if (!(table instanceof HTMLTableElement)) {
    throw new Error(`${fixtureName} did not contain a semantic table.`);
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

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the visibility-override %s fixture byte-for-byte",
    (format) => {
      expect(serializers[format](fixtureLogicalTable("visibility-override-table.html"))).toBe(
        visibilityOverrideExpected[format]
      );
    }
  );

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the transparent-container %s fixture byte-for-byte",
    (format) => {
      const output = serializers[format](fixtureLogicalTable("transparent-container-table.html"));

      expect(output).toBe(transparentContainerExpected[format]);
      expect(output).not.toContain("metadata secret");
    }
  );

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the adversarial visibility-policy %s fixture byte-for-byte",
    (format) => {
      const logical = fixtureLogicalTable("visibility-policy-table.html");

      expect(serializers[format](logical)).toBe(visibilityPolicyExpected[format]);
      expect(serializers[format](logical)).not.toContain("secret");
      expect(serializers[format](logical)).toContain("ARIA visible");
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
