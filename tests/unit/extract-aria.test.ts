import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createContentMessageHandler } from "../../src/content/content-handler";
import { ariaRole, extractAriaLogicalTable, isAriaTableRoot } from "../../src/table/extract-aria";
import type { CopyFormat, LogicalTable } from "../../src/table/model";
import { serializeCsv } from "../../src/table/serialize/csv";
import { serializeHtml } from "../../src/table/serialize/html";
import { serializeJson } from "../../src/table/serialize/json";
import { serializeMarkdown } from "../../src/table/serialize/markdown";
import { serializeText } from "../../src/table/serialize/text";

const fixtureDirectory = resolve(import.meta.dirname, "../fixtures/tables");

function ariaRoot(html: string, selector = '[role="grid"], [role="table"], [role="treegrid"]') {
  document.body.innerHTML = html;
  const root = document.querySelector(selector);
  if (root === null) {
    throw new Error("Test fixture did not contain an ARIA table root.");
  }
  return root;
}

function extract(html: string, selector?: string): LogicalTable {
  return extractAriaLogicalTable(ariaRoot(html, selector));
}

function csv(html: string, selector?: string): string {
  return serializeCsv(extract(html, selector));
}

const serializers = {
  html: serializeHtml,
  markdown: serializeMarkdown,
  text: serializeText,
  csv: serializeCsv,
  json: serializeJson
} as const;

describe("ARIA roles", () => {
  it("reads the first role token, case-insensitively", () => {
    document.body.innerHTML =
      '<div id=a role=" Grid  table"></div><div id=b role="presentation grid"></div><div id=c role=""></div>';
    const [a, b, c] = ["#a", "#b", "#c"].map((selector) => document.querySelector(selector)!);
    expect(ariaRole(a!)).toBe("grid");
    expect(isAriaTableRoot(a!)).toBe(true);
    expect(isAriaTableRoot(b!)).toBe(false);
    expect(ariaRole(c!)).toBeNull();
  });
});

describe("ARIA logical table extraction", () => {
  it("extracts a simple grid", () => {
    const logical = extract(`
      <div role="grid">
        <div role="row"><div role="gridcell">a</div><div role="gridcell">b</div></div>
        <div role="row"><div role="gridcell">c</div><div role="gridcell">d</div></div>
      </div>
    `);

    expect(logical.columnCount).toBe(2);
    expect(logical.headerRowIndexes).toEqual([]);
    expect(logical.caption).toBeNull();
    expect(logical.rows.map((row) => [row.section, row.rowGroupIndex])).toEqual([
      ["body", 0],
      ["body", 0]
    ]);
    expect(serializeCsv(logical)).toBe("a,b\r\nc,d");
  });

  it("accepts role=table with cell, and treegrid, roots", () => {
    expect(csv('<div role="table"><div role="row"><span role="cell">x</span></div></div>')).toBe(
      "x"
    );
    expect(
      csv('<div role="treegrid"><div role="row"><span role="gridcell">y</span></div></div>')
    ).toBe("y");
  });

  it("honours aria-colspan and aria-rowspan with covered slots", () => {
    const logical = extract(`
      <div role="grid">
        <div role="row">
          <div role="gridcell" aria-rowspan="2" aria-colspan="2">owner</div>
          <div role="gridcell">right</div>
        </div>
        <div role="row"><div role="gridcell">below right</div></div>
      </div>
    `);

    expect(logical.rows[0]?.cells[0]).toMatchObject({
      kind: "origin",
      text: "owner",
      rowSpan: 2,
      columnSpan: 2
    });
    expect(logical.rows[1]?.cells).toEqual([
      { kind: "covered", text: "", ownerRow: 0, ownerColumn: 0 },
      { kind: "covered", text: "", ownerRow: 0, ownerColumn: 0 },
      expect.objectContaining({ kind: "origin", text: "below right", sourceColumn: 2 })
    ]);
  });

  it("bounds row spans by rowgroup, with aria-rowspan=0 spanning to the group's end", () => {
    const logical = extract(`
      <div role="grid">
        <div role="rowgroup">
          <div role="row"><div role="gridcell" aria-rowspan="0">A</div><div role="gridcell">1</div></div>
          <div role="row"><div role="gridcell">2</div></div>
        </div>
        <div role="rowgroup">
          <div role="row"><div role="gridcell" aria-rowspan="5">B</div><div role="gridcell">3</div></div>
        </div>
        <div role="row"><div role="gridcell">loose</div></div>
      </div>
    `);

    expect(logical.rows.map((row) => row.rowGroupIndex)).toEqual([0, 0, 1, 2]);
    expect(logical.rows[0]?.cells[0]).toMatchObject({ text: "A", rowSpan: 2 });
    expect(logical.rows[2]?.cells[0]).toMatchObject({ text: "B", rowSpan: 1 });
    expect(serializeCsv(logical)).toBe("A,1\r\n,2\r\nB,3\r\nloose,");
  });

  it("finds rows and cells through wrapper elements", () => {
    expect(
      csv(`
        <div role="grid"><section><div role="rowgroup"><div class="wrap">
          <div role="row"><div><span role="gridcell">deep</span></div></div>
        </div></div></section></div>
      `)
    ).toBe("deep");
  });

  it("treats leading all-columnheader rows as the head and rowheaders as row headers", () => {
    const logical = extract(`
      <div role="grid">
        <div role="row"><div role="columnheader" aria-colspan="2">Sales</div></div>
        <div role="row"><div role="columnheader">Q1</div><div role="columnheader">Q2</div></div>
        <div role="row"><div role="rowheader">North</div><div role="gridcell">1</div></div>
        <div role="row"><div role="columnheader">Mid</div><div role="gridcell">x</div></div>
      </div>
    `);

    expect(logical.headerRowIndexes).toEqual([0, 1]);
    expect(logical.rows.map((row) => [row.section, row.rowGroupIndex])).toEqual([
      ["head", 0],
      ["head", 0],
      ["body", 1],
      ["body", 1]
    ]);
    expect(logical.rows[0]?.cells[0]).toMatchObject({ isHeader: true, scope: "col" });
    expect(logical.rows[2]?.cells[0]).toMatchObject({ isHeader: true, scope: "row" });
    expect(logical.rows[2]?.cells[1]).toMatchObject({ isHeader: false, scope: null });
    expect(serializeMarkdown(logical)).toBe(
      "| Sales / Q1 | Q2 |\n| --- | --- |\n| North | 1 |\n| Mid | x |"
    );
  });

  it("keeps a header row's row spans inside the head", () => {
    const logical = extract(`
      <div role="grid">
        <div role="row"><div role="columnheader" aria-rowspan="3">H</div></div>
        <div role="row"><div role="gridcell">a</div></div>
      </div>
    `);
    expect(logical.rows[0]?.cells[0]).toMatchObject({ rowSpan: 1 });
    expect(serializeCsv(logical)).toBe("H\r\na");
  });

  it("excludes unrendered rows and cells, and hidden content inside cells", () => {
    const logical = extract(`
      <div role="grid">
        <div role="row" style="display: none"><div role="gridcell">hidden row</div></div>
        <div role="row" hidden><div role="gridcell">hidden attribute row</div></div>
        <div role="row">
          <div role="gridcell">a</div>
          <div role="gridcell" style="display: none">hidden cell</div>
          <div role="gridcell" style="opacity: 0">transparent cell</div>
          <div role="gridcell">b <span style="display: none">secret</span></div>
          <div role="gridcell" style="visibility: hidden">invisible</div>
        </div>
        <div style="display: none"><div role="row"><div role="gridcell">wrapped</div></div></div>
      </div>
    `);

    expect(logical.rows).toHaveLength(1);
    expect(serializeCsv(logical)).toBe("a,b,");
  });

  it("excludes form controls and widgets inside cells", () => {
    expect(
      csv(`
        <div role="grid"><div role="row">
          <div role="gridcell"><input type="checkbox" aria-label="Select"> 11</div>
          <div role="gridcell">12 <button type="button">Edit</button></div>
          <div role="gridcell"><select><option>pick</option></select>ok<textarea>t</textarea></div>
        </div></div>
      `)
    ).toBe("11,12,ok");
  });

  it("excludes a nested grid's rows and content from the outer grid", () => {
    const html = `
      <div role="grid" id="outer">
        <div role="row">
          <div role="gridcell">outer
            <div role="grid" id="inner"><div role="row"><div role="gridcell">inner</div></div></div>
          </div>
          <div role="gridcell">second</div>
        </div>
      </div>
    `;
    expect(csv(html, "#outer")).toBe("outer,second");
    expect(csv(html, "#inner")).toBe("inner");
  });

  it("excludes a <table> inside a grid cell from the grid", () => {
    expect(
      csv(`
        <div role="grid"><div role="row">
          <div role="gridcell">outer<table><tr><td role="gridcell">inner</td></tr></table></div>
        </div></div>
      `)
    ).toBe("outer");
  });

  it("copies only the rendered rows of a virtualized grid", () => {
    const logical = extract(
      readFileSync(resolve(fixtureDirectory, "aria-virtualized-grid.html"), "utf8")
    );
    expect(logical.rows).toHaveLength(3);
    expect(serializeCsv(logical)).toBe("ID,Name\r\n40,Row forty\r\n41,Row forty-one");
  });

  it.each([
    ["no rows", '<div role="grid"><div role="gridcell">orphan</div></div>'],
    ["only empty rows", '<div role="grid"><div role="row"></div></div>'],
    [
      "only hidden rows",
      '<div role="grid"><div role="row" hidden><div role="gridcell">x</div></div></div>'
    ],
    [
      "non-numeric aria-colspan",
      '<div role="grid"><div role="row"><div role="gridcell" aria-colspan="many">x</div></div></div>'
    ],
    [
      "zero aria-colspan",
      '<div role="grid"><div role="row"><div role="gridcell" aria-colspan="0">x</div></div></div>'
    ],
    [
      "aria-colspan above the HTML limit",
      '<div role="grid"><div role="row"><div role="gridcell" aria-colspan="1001">x</div></div></div>'
    ],
    [
      "aria-rowspan above the HTML limit",
      '<div role="grid"><div role="row"><div role="gridcell" aria-rowspan="65535">x</div></div></div>'
    ],
    [
      "overlapping spans",
      `<div role="grid">
        <div role="row"><div role="gridcell">a</div><div role="gridcell" aria-rowspan="2">b</div></div>
        <div role="row"><div role="gridcell" aria-colspan="2">c</div></div>
      </div>`
    ]
  ])("rejects invalid ARIA geometry: %s", (_name, html) => {
    expect(() => extract(html)).toThrowError("Invalid table geometry");
  });

  it.each(["aria-grid-table", "aria-nested-table", "aria-virtualized-grid"])(
    "matches the reviewed %s fixture byte-for-byte in every format",
    (fixture) => {
      const expected = JSON.parse(
        readFileSync(resolve(fixtureDirectory, `expected/${fixture}.json`), "utf8")
      ) as Record<Exclude<CopyFormat, "html-source">, string>;
      const logical = extract(readFileSync(resolve(fixtureDirectory, `${fixture}.html`), "utf8"));
      for (const format of ["html", "markdown", "text", "csv", "json"] as const) {
        expect(serializers[format](logical)).toBe(expected[format]);
      }
    }
  );
});

describe("ARIA copies through the content handler", () => {
  function request(format: CopyFormat = "csv") {
    return { type: "copy-table:extract", requestId: "r", targetElementId: 1, format } as const;
  }

  it("copies the ARIA grid around the clicked cell", () => {
    document.body.innerHTML =
      '<div role="grid"><div role="row"><div role="gridcell" id="cell">a</div><div role="gridcell">b</div></div></div>';
    const handler = createContentMessageHandler({
      getTargetElement: () => document.querySelector("#cell")
    });
    expect(handler(request())).toEqual({ ok: true, requestId: "r", format: "csv", payload: "a,b" });
    expect(handler(request("html"))).toEqual({
      ok: true,
      requestId: "r",
      format: "html",
      payload: "<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>",
      plainPayload: "a\tb"
    });
  });

  it("reports no-table for a role=row outside any table or grid", () => {
    document.body.innerHTML = '<div role="row"><div role="gridcell" id="cell">stray</div></div>';
    const handler = createContentMessageHandler({
      getTargetElement: () => document.querySelector("#cell")
    });
    expect(handler(request())).toEqual({
      ok: false,
      requestId: "r",
      format: "csv",
      reason: "no-table"
    });
  });

  it("reports invalid-table for a grid without valid geometry", () => {
    document.body.innerHTML =
      '<div role="grid"><div role="row"><div role="gridcell" id="cell" aria-colspan="x">bad</div></div></div>';
    const handler = createContentMessageHandler({
      getTargetElement: () => document.querySelector("#cell")
    });
    expect(handler(request())).toEqual({
      ok: false,
      requestId: "r",
      format: "csv",
      reason: "invalid-table"
    });
  });
});
