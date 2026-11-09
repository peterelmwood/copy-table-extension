import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractLogicalTable } from "../../src/table/extract";
import { serializeCsv } from "../../src/table/serialize/csv";
import { serializeHtml } from "../../src/table/serialize/html";
import { serializeMarkdown } from "../../src/table/serialize/markdown";
import { serializeText } from "../../src/table/serialize/text";
import type {
  CopyFormat,
  LogicalTable,
  LogicalTableCell,
  LogicalTableOriginCell,
  SafeInline
} from "../../src/table/model";

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
const rowSpanRowGroupsExpected = JSON.parse(
  readFileSync(resolve(fixtureDirectory, "expected/rowspan-row-groups-table.json"), "utf8")
) as Record<CopyFormat, string>;

function expectedFixture(name: string): Record<CopyFormat, string> {
  return JSON.parse(
    readFileSync(resolve(fixtureDirectory, `expected/${name}.json`), "utf8")
  ) as Record<CopyFormat, string>;
}

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

function inlineCell(
  inline: readonly SafeInline[],
  options: Partial<LogicalTableOriginCell> = {}
): LogicalTableOriginCell {
  return { ...originCell("", 0), inline, ...options };
}

function headerCell(text: string, columnSpan = 1, rowSpan = 1): LogicalTableOriginCell {
  return { ...originCell(text, 0), isHeader: true, scope: "col", rowSpan, columnSpan };
}

const covered = (ownerRow: number, ownerColumn: number): LogicalTableCell => ({
  kind: "covered",
  text: "",
  ownerRow,
  ownerColumn
});

function singleCellTable(
  inline: readonly SafeInline[],
  caption: readonly SafeInline[] | null = null
): LogicalTable {
  return {
    caption,
    captionText: null,
    columnCount: 1,
    headerRowIndexes: [0],
    rows: [
      { section: "head", rowGroupIndex: 0, cells: [headerCell("H")] },
      { section: "body", rowGroupIndex: 1, cells: [inlineCell(inline)] }
    ]
  };
}

function bodyMarkdown(inline: readonly SafeInline[]): string {
  return serializeMarkdown(singleCellTable(inline)).split("\n").at(-1) ?? "";
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

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the row-group-bounded rowspan %s fixture byte-for-byte",
    (format) => {
      expect(serializers[format](fixtureLogicalTable("rowspan-row-groups-table.html"))).toBe(
        rowSpanRowGroupsExpected[format]
      );
    }
  );

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the basic %s fixture byte-for-byte",
    (format) => {
      expect(serializers[format](fixtureLogicalTable("basic-table.html"))).toBe(
        expectedFixture("basic-table")[format]
      );
    }
  );

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the nested-table outer %s fixture byte-for-byte, excluding the inner table",
    (format) => {
      expect(serializers[format](fixtureLogicalTable("nested-table.html"))).toBe(
        expectedFixture("nested-table")[format]
      );
    }
  );

  it.each(["html", "markdown", "text", "csv"] as const)(
    "matches the multi-row-header %s fixture byte-for-byte",
    (format) => {
      expect(serializers[format](fixtureLogicalTable("multi-row-header-table.html"))).toBe(
        expectedFixture("multi-row-header-table")[format]
      );
    }
  );

  it("emits only table structure, links and line breaks for rich-text paste targets", () => {
    // Rich editors render this markup, so the adversarial fixture must not
    // smuggle in any other element, attribute, or link scheme.
    const container = document.createElement("div");
    container.innerHTML = serializeHtml(complexLogicalTable());
    const allowedAttributes: Record<string, readonly string[]> = {
      a: ["href", "rel"],
      th: ["scope", "rowspan", "colspan"],
      td: ["rowspan", "colspan"]
    };

    const elements = [...container.querySelectorAll("*")];
    expect(elements.length).toBeGreaterThan(0);
    for (const element of elements) {
      const tag = element.localName;
      expect([
        "table",
        "caption",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "th",
        "td",
        "a",
        "br"
      ]).toContain(tag);
      for (const attribute of element.getAttributeNames()) {
        expect(allowedAttributes[tag] ?? []).toContain(attribute);
      }
      if (tag === "a") {
        expect(element.getAttribute("href")).toMatch(/^(https?:|mailto:)/);
      }
    }
  });

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

  it("renders safe links as Markdown links", () => {
    expect(
      bodyMarkdown([
        { type: "text", value: "See " },
        {
          type: "link",
          href: "https://example.com/report",
          children: [{ type: "text", value: "the report" }]
        }
      ])
    ).toBe("| See [the report](https://example.com/report) |");
  });

  it("escapes brackets, pipes and emphasis in link text and encodes the destination", () => {
    expect(
      bodyMarkdown([
        {
          type: "link",
          href: "https://example.com/a b(c)<d>|e\\f`g?q=%20",
          children: [{ type: "text", value: "[x] (y) a|b *c* _d_ \\" }]
        }
      ])
    ).toBe(
      "| [\\[x\\] (y) a\\|b \\*c\\* \\_d\\_ \\\\](https://example.com/a%20b%28c%29%3Cd%3E%7Ce%5Cf%60g?q=%20) |"
    );
  });

  it("keeps line breaks inside link text and cells as <br>", () => {
    expect(
      bodyMarkdown([
        {
          type: "link",
          href: "https://example.com/",
          children: [
            { type: "text", value: "one" },
            { type: "break" },
            { type: "text", value: "two" }
          ]
        },
        { type: "break" },
        { type: "text", value: "tail" }
      ])
    ).toBe("| [one<br>two](https://example.com/)<br>tail |");
  });

  it("renders mailto links", () => {
    expect(
      bodyMarkdown([
        {
          type: "link",
          href: "mailto:sales@example.com",
          children: [{ type: "text", value: "Mail" }]
        }
      ])
    ).toBe("| [Mail](mailto:sales@example.com) |");
  });

  it("keeps an unsafe link that extraction dropped as escaped plain text", () => {
    document.body.innerHTML =
      '<table><tr><th>H</th></tr><tr><td><a href="javascript:steal()">click [me] | now</a></td></tr></table>';
    const table = document.querySelector("table");
    if (!(table instanceof HTMLTableElement)) {
      throw new Error("Inline fixture did not contain a semantic table.");
    }

    const markdown = serializeMarkdown(extractLogicalTable(table));
    expect(markdown).toBe("| H |\n| --- |\n| click [me] \\| now |");
    expect(markdown).not.toContain("javascript");
  });

  it("merges two header rows per column and uses a spanned header cell once", () => {
    const logical: LogicalTable = {
      caption: null,
      captionText: null,
      columnCount: 3,
      headerRowIndexes: [0, 1, 2],
      rows: [
        {
          section: "head",
          rowGroupIndex: 0,
          cells: [headerCell("Region", 1, 2), headerCell("Sales", 2), covered(0, 1)]
        },
        {
          section: "head",
          rowGroupIndex: 0,
          cells: [covered(0, 0), headerCell("Q1"), headerCell("Q2")]
        },
        {
          section: "body",
          rowGroupIndex: 1,
          cells: [{ ...headerCell("North"), scope: "row" }, originCell("1", 1), originCell("2", 2)]
        }
      ]
    };

    expect(serializeMarkdown(logical)).toBe(
      "| Region | Sales / Q1 | Q2 |\n| --- | --- | --- |\n| North | 1 | 2 |"
    );
  });

  it("merges three header rows, skipping empty and covered positions", () => {
    const logical: LogicalTable = {
      caption: null,
      captionText: null,
      columnCount: 2,
      headerRowIndexes: [0, 1, 2],
      rows: [
        {
          section: "head",
          rowGroupIndex: 0,
          cells: [headerCell("Year", 2), covered(0, 0)]
        },
        {
          section: "head",
          rowGroupIndex: 0,
          cells: [headerCell("H1", 1, 2), headerCell("H2")]
        },
        {
          section: "head",
          rowGroupIndex: 0,
          cells: [covered(1, 0), { kind: "empty", text: "" }]
        },
        { section: "body", rowGroupIndex: 1, cells: [originCell("a", 0), originCell("b", 1)] }
      ]
    };

    expect(serializeMarkdown(logical)).toBe("| Year / H1 | H2 |\n| --- | --- |\n| a | b |");
  });

  it("merges consecutive all-<th> header rows of a table without <thead>", () => {
    document.body.innerHTML =
      "<table><tr><th colspan=2>Sales</th></tr><tr><th>Q1</th><th>Q2</th></tr>" +
      "<tr><th>North</th><td>1</td></tr><tfoot><tr><th>Total</th><td>1</td></tr></tfoot></table>";
    const table = document.querySelector("table");
    if (!(table instanceof HTMLTableElement)) {
      throw new Error("Inline fixture did not contain a semantic table.");
    }

    expect(serializeMarkdown(extractLogicalTable(table))).toBe(
      "| Sales / Q1 | Q2 |\n| --- | --- |\n| North | 1 |\n| Total | 1 |"
    );
  });

  it("keeps a row-header body row out of the merged header", () => {
    expect(serializeMarkdown(fixtureLogicalTable("rowspan-row-groups-table.html"))).toMatch(
      /^\| Heading \| Value \|\n\| --- \| --- \|\n\| Group A \| A1 \|/u
    );
  });

  it("emits an escaped bold caption line and a blank line before the table", () => {
    expect(
      serializeMarkdown(
        singleCellTable(
          [{ type: "text", value: "v" }],
          [{ type: "text", value: "Q1 *draft* [v2] a_b `x` <b> | \\" }]
        )
      )
    ).toBe("**Q1 \\*draft\\* \\[v2\\] a\\_b \\`x\\` \\<b\\> \\| \\\\**\n\n| H |\n| --- |\n| v |");
  });

  it("emits no caption line when the table has no caption", () => {
    const markdown = serializeMarkdown(singleCellTable([{ type: "text", value: "v" }]));
    expect(markdown).toBe("| H |\n| --- |\n| v |");
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
          rowGroupIndex: 0,
          cells: [originCell("comma, value", 0), originCell('say "yes"', 1)]
        },
        {
          section: "body",
          rowGroupIndex: 0,
          cells: [originCell("line one\nline two", 0), originCell("carriage\rreturn", 1)]
        }
      ]
    };

    expect(serializeCsv(logical)).toBe(
      '"comma, value","say ""yes"""\r\n"line one\nline two","carriage\rreturn"'
    );
  });
});
