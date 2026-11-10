import { describe, expect, it } from "vitest";
import {
  buildLogicalTable,
  MAXIMUM_COLUMN_SPAN,
  MAXIMUM_ROW_SPAN,
  parseSpan,
  type MatrixSourceCell,
  type MatrixSourceRow
} from "../../src/table/matrix";

function cell(text: string, options: Partial<MatrixSourceCell> = {}): MatrixSourceCell {
  return {
    rowSpan: 1,
    columnSpan: 1,
    isHeader: false,
    scope: null,
    content: () => (text.length === 0 ? [] : [{ type: "text", value: text }]),
    ...options
  };
}

function row(
  cells: readonly MatrixSourceCell[],
  options: Partial<MatrixSourceRow> = {}
): MatrixSourceRow {
  return {
    section: "body",
    rowGroupIndex: 0,
    rowGroupEnd: 99,
    isHeaderRow: false,
    cells,
    ...options
  };
}

describe("shared logical table builder", () => {
  it("places cells in the first free slot and pads short rows with empty cells", () => {
    const logical = buildLogicalTable(
      [
        row([cell("A", { isHeader: true, scope: "col" }), cell("B")], {
          section: "head",
          rowGroupEnd: 1,
          isHeaderRow: true
        }),
        row([cell("1")], { rowGroupIndex: 1, rowGroupEnd: 2 })
      ],
      null
    );

    expect(logical).toEqual({
      caption: null,
      captionText: null,
      columnCount: 2,
      headerRowIndexes: [0],
      rows: [
        {
          section: "head",
          rowGroupIndex: 0,
          cells: [
            {
              kind: "origin",
              text: "A",
              inline: [{ type: "text", value: "A" }],
              isHeader: true,
              scope: "col",
              sourceRow: 0,
              sourceColumn: 0,
              rowSpan: 1,
              columnSpan: 1
            },
            expect.objectContaining({ kind: "origin", text: "B", sourceColumn: 1 })
          ]
        },
        {
          section: "body",
          rowGroupIndex: 1,
          cells: [
            expect.objectContaining({ kind: "origin", text: "1" }),
            { kind: "empty", text: "" }
          ]
        }
      ]
    });
  });

  it("marks covered slots with their owner and skips them when placing later cells", () => {
    const logical = buildLogicalTable(
      [
        row([cell("owner", { rowSpan: 2, columnSpan: 2 }), cell("right")], { rowGroupEnd: 2 }),
        row([cell("below right")], { rowGroupEnd: 2 })
      ],
      null
    );

    expect(logical.rows[1]?.cells).toEqual([
      { kind: "covered", text: "", ownerRow: 0, ownerColumn: 0 },
      { kind: "covered", text: "", ownerRow: 0, ownerColumn: 0 },
      expect.objectContaining({ kind: "origin", text: "below right", sourceColumn: 2 })
    ]);
  });

  it("spans a zero row span to, and clips longer spans at, the end of the row group", () => {
    const logical = buildLogicalTable(
      [
        row([cell("zero", { rowSpan: 0 }), cell("a")], { rowGroupEnd: 2 }),
        row([cell("b")], { rowGroupEnd: 2 }),
        row([cell("long", { rowSpan: 9 }), cell("c")], { rowGroupIndex: 1, rowGroupEnd: 3 })
      ],
      null
    );

    expect(logical.rows[0]?.cells[0]).toMatchObject({ rowSpan: 2 });
    expect(logical.rows[2]?.cells[0]).toMatchObject({ text: "long", rowSpan: 1 });
  });

  it("reads each placed cell's content exactly once", () => {
    let reads = 0;
    buildLogicalTable(
      [
        row([
          cell("x", {
            content: () => {
              reads += 1;
              return [];
            }
          })
        ])
      ],
      null
    );
    expect(reads).toBe(1);
  });

  it("carries the caption and its text", () => {
    const logical = buildLogicalTable(
      [row([cell("v")])],
      [{ type: "text", value: "Cap" }, { type: "break" }, { type: "text", value: "tion" }]
    );
    expect(logical.captionText).toBe("Cap\ntion");
  });

  it.each([
    ["no rows", []],
    ["only empty rows", [row([]), row([])]],
    [
      "overlapping spans",
      [
        row([cell("a"), cell("b", { rowSpan: 2 })], { rowGroupEnd: 2 }),
        row([cell("c", { columnSpan: 2 })], { rowGroupEnd: 2 })
      ]
    ]
  ])("rejects invalid geometry: %s", (_name, rows) => {
    expect(() => buildLogicalTable(rows, null)).toThrowError("Invalid table geometry");
  });
});

describe("span parsing", () => {
  it.each([
    [null, 1],
    ["3", 3],
    [" 2 ", 2],
    ["0", 0]
  ] as const)("parses %j as %i where zero is allowed", (value, expected) => {
    expect(parseSpan(value, MAXIMUM_ROW_SPAN, true)).toBe(expected);
  });

  it.each([
    ["0", false],
    ["-1", true],
    ["1.5", true],
    ["two", true],
    ["", true],
    [String(MAXIMUM_COLUMN_SPAN + 1), true]
  ] as const)("rejects %j", (value, allowZero) => {
    expect(() => parseSpan(value, MAXIMUM_COLUMN_SPAN, allowZero)).toThrowError(
      "Invalid table geometry"
    );
  });
});
