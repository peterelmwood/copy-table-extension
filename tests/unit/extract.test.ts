import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractLogicalTable } from "../../src/table/extract";

const fixtureDirectory = resolve(import.meta.dirname, "../fixtures/tables");

function tableFromHtml(html: string): HTMLTableElement {
  document.body.innerHTML = html;
  const table = document.querySelector("table");
  if (!(table instanceof HTMLTableElement)) {
    throw new Error("Test fixture did not contain a semantic table.");
  }
  return table;
}

describe("logical table extraction", () => {
  it("preserves sections, header metadata, uneven rows, and explicit empty cells", () => {
    const table = tableFromHtml(`
      <table>
        <thead><tr><th scope="col">Name</th><th>Value</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>A</td><td></td></tr>
          <tr><th scope="row">B</th><td>2</td><td>last</td></tr>
        </tbody>
        <tfoot><tr><td>Total</td><td>2</td></tr></tfoot>
      </table>
    `);

    const logical = extractLogicalTable(table);

    expect(logical.columnCount).toBe(3);
    expect(logical.headerRowIndexes).toEqual([0, 2]);
    expect(logical.rows.map((row) => row.section)).toEqual(["head", "body", "body", "foot"]);
    expect(logical.rows[1]?.cells).toMatchObject([
      { kind: "origin", text: "A", isHeader: false },
      { kind: "origin", text: "", isHeader: false },
      { kind: "empty", text: "" }
    ]);
    expect(logical.rows[2]?.cells[0]).toMatchObject({
      kind: "origin",
      text: "B",
      isHeader: true,
      scope: "row"
    });
    expect(logical.rows[3]?.cells[2]).toEqual({ kind: "empty", text: "" });
  });

  it("uses top-left ownership and empty covered slots for row and column spans", () => {
    const table = tableFromHtml(`
      <table><tbody>
        <tr><td rowspan="2" colspan="2">owner</td><td>right</td></tr>
        <tr><td>below right</td></tr>
      </tbody></table>
    `);

    const logical = extractLogicalTable(table);

    expect(logical.columnCount).toBe(3);
    expect(logical.rows[0]?.cells[0]).toMatchObject({
      kind: "origin",
      text: "owner",
      sourceRow: 0,
      sourceColumn: 0,
      rowSpan: 2,
      columnSpan: 2
    });
    expect(logical.rows[0]?.cells[1]).toEqual({
      kind: "covered",
      text: "",
      ownerRow: 0,
      ownerColumn: 0
    });
    expect(logical.rows[1]?.cells.slice(0, 2)).toEqual([
      { kind: "covered", text: "", ownerRow: 0, ownerColumn: 0 },
      { kind: "covered", text: "", ownerRow: 0, ownerColumn: 0 }
    ]);
    expect(logical.rows[1]?.cells[2]).toMatchObject({
      kind: "origin",
      text: "below right",
      sourceRow: 1,
      sourceColumn: 2
    });
  });

  it("extracts visible safe inline content from the reviewed complex fixture", () => {
    const table = tableFromHtml(
      readFileSync(resolve(fixtureDirectory, "complex-table.html"), "utf8")
    );

    const logical = extractLogicalTable(table);

    expect(logical.captionText).toBe("Quarterly results");
    expect(logical.columnCount).toBe(3);
    expect(logical.headerRowIndexes).toEqual([0, 4]);
    expect(logical.rows[1]?.cells[0]).toMatchObject({ text: "North\nAmerica" });
    expect(logical.rows[1]?.cells[1]).toMatchObject({
      text: 'Quote "yes", pipe | slash \\ chart'
    });
    expect(logical.rows[1]?.cells[2]).toMatchObject({
      text: "safe & sound unsafe label",
      inline: [
        {
          type: "link",
          href: "https://example.com/report?x=1&y=2",
          children: [{ type: "text", value: "safe & sound" }]
        },
        { type: "text", value: " unsafe label" }
      ]
    });
    expect(logical.rows[2]?.cells).toEqual([
      { kind: "covered", text: "", ownerRow: 1, ownerColumn: 0 },
      expect.objectContaining({ kind: "origin", text: "line one\nline two aria secret" }),
      { kind: "covered", text: "", ownerRow: 2, ownerColumn: 1 }
    ]);
  });

  it("uses rendered CSS visibility and excludes metadata in the logical model", () => {
    const table = tableFromHtml(
      readFileSync(resolve(fixtureDirectory, "visibility-policy-table.html"), "utf8")
    );

    const logical = extractLogicalTable(table);

    expect(logical.rows[1]?.cells[1]).toMatchObject({
      kind: "origin",
      text: "Rendered ARIA visible tail",
      inline: [{ type: "text", value: "Rendered ARIA visible tail" }]
    });
  });

  it("retains a visibility override in the logical model", () => {
    const table = tableFromHtml(
      readFileSync(resolve(fixtureDirectory, "visibility-override-table.html"), "utf8")
    );

    const logical = extractLogicalTable(table);

    expect(logical.rows[1]?.cells[1]).toMatchObject({
      kind: "origin",
      text: "Visible descendant",
      inline: [{ type: "text", value: "Visible descendant" }]
    });
  });

  it("traverses visible custom and omitted standard containers without metadata", () => {
    const table = tableFromHtml(
      readFileSync(resolve(fixtureDirectory, "transparent-container-table.html"), "utf8")
    );

    const logical = extractLogicalTable(table);

    expect(logical.rows[1]?.cells[1]).toMatchObject({
      kind: "origin",
      text: "£10 per item Available now",
      inline: [{ type: "text", value: "£10 per item Available now" }]
    });
  });

  it.each([
    ["zero row span", '<table><tr><td rowspan="0">bad</td></tr></table>'],
    ["non-numeric column span", '<table><tr><td colspan="many">bad</td></tr></table>'],
    ["row span beyond the table", '<table><tr><td rowspan="2">bad</td></tr></table>']
  ])("rejects invalid table geometry: %s", (_caseName, html) => {
    expect(() => extractLogicalTable(tableFromHtml(html))).toThrowError("Invalid table geometry");
  });
});
