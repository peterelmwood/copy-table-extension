import type {
  LogicalTable,
  LogicalTableCell,
  LogicalTableOriginCell,
  LogicalTableRow,
  LogicalTableScope,
  LogicalTableSection
} from "./model";
import { extractSafeInline, safeInlineText } from "./safe-inline";

const MAXIMUM_COLUMN_SPAN = 1000;

function invalidGeometry(): never {
  throw new Error("Invalid table geometry");
}

function sourceRows(table: HTMLTableElement): readonly HTMLTableRowElement[] {
  const rows: HTMLTableRowElement[] = [];

  for (const child of table.children) {
    if (child instanceof HTMLTableRowElement) {
      rows.push(child);
      continue;
    }
    if (!["THEAD", "TBODY", "TFOOT"].includes(child.tagName)) {
      continue;
    }
    for (const sectionChild of child.children) {
      if (sectionChild instanceof HTMLTableRowElement) {
        rows.push(sectionChild);
      }
    }
  }

  return rows;
}

function rowSection(row: HTMLTableRowElement): LogicalTableSection {
  if (row.parentElement?.tagName === "THEAD") {
    return "head";
  }
  if (row.parentElement?.tagName === "TFOOT") {
    return "foot";
  }
  return "body";
}

function positiveSpan(cell: HTMLTableCellElement, attribute: "rowspan" | "colspan"): number {
  const rawValue = cell.getAttribute(attribute);
  if (rawValue === null) {
    return 1;
  }
  const normalized = rawValue.trim();
  if (!/^[1-9]\d*$/u.test(normalized)) {
    return invalidGeometry();
  }
  const span = Number(normalized);
  if (!Number.isSafeInteger(span) || span > MAXIMUM_COLUMN_SPAN) {
    return invalidGeometry();
  }
  return span;
}

function cellScope(cell: HTMLTableCellElement): LogicalTableScope | null {
  const scope = cell.getAttribute("scope")?.toLowerCase();
  return scope === "row" || scope === "col" || scope === "rowgroup" || scope === "colgroup"
    ? scope
    : null;
}

function originCell(
  cell: HTMLTableCellElement,
  sourceRow: number,
  sourceColumn: number,
  rowSpan: number,
  columnSpan: number
): LogicalTableOriginCell {
  const inline = extractSafeInline(cell);
  return {
    kind: "origin",
    text: safeInlineText(inline),
    inline,
    isHeader: cell.tagName === "TH",
    scope: cellScope(cell),
    sourceRow,
    sourceColumn,
    rowSpan,
    columnSpan
  };
}

export function extractLogicalTable(table: HTMLTableElement): LogicalTable {
  const rows = sourceRows(table);
  if (rows.length === 0) {
    return invalidGeometry();
  }

  const matrix: Array<Array<LogicalTableCell | undefined>> = rows.map(() => []);
  const headerRowIndexes: number[] = [];
  let columnCount = 0;

  for (const [rowIndex, row] of rows.entries()) {
    let columnIndex = 0;
    let hasHeader = false;

    for (const cell of row.cells) {
      while (matrix[rowIndex]?.[columnIndex] !== undefined) {
        columnIndex += 1;
      }

      const rowSpan = positiveSpan(cell, "rowspan");
      const columnSpan = positiveSpan(cell, "colspan");
      if (rowIndex + rowSpan > rows.length) {
        return invalidGeometry();
      }

      for (let coveredRow = rowIndex; coveredRow < rowIndex + rowSpan; coveredRow += 1) {
        const matrixRow = matrix[coveredRow];
        if (matrixRow === undefined) {
          return invalidGeometry();
        }
        for (
          let coveredColumn = columnIndex;
          coveredColumn < columnIndex + columnSpan;
          coveredColumn += 1
        ) {
          if (matrixRow[coveredColumn] !== undefined) {
            return invalidGeometry();
          }
          matrixRow[coveredColumn] =
            coveredRow === rowIndex && coveredColumn === columnIndex
              ? originCell(cell, rowIndex, columnIndex, rowSpan, columnSpan)
              : {
                  kind: "covered",
                  text: "",
                  ownerRow: rowIndex,
                  ownerColumn: columnIndex
                };
        }
      }

      hasHeader ||= cell.tagName === "TH";
      columnIndex += columnSpan;
      columnCount = Math.max(columnCount, columnIndex);
    }

    if (hasHeader) {
      headerRowIndexes.push(rowIndex);
    }
    columnCount = Math.max(columnCount, matrix[rowIndex]?.length ?? 0);
  }

  if (columnCount === 0) {
    return invalidGeometry();
  }

  const logicalRows: LogicalTableRow[] = rows.map((row, rowIndex) => {
    const cells = matrix[rowIndex];
    if (cells === undefined) {
      return invalidGeometry();
    }
    return {
      section: rowSection(row),
      cells: Array.from({ length: columnCount }, (_, columnIndex) =>
        cells[columnIndex] === undefined
          ? { kind: "empty" as const, text: "" as const }
          : cells[columnIndex]
      )
    };
  });

  const captionElement = Array.from(table.children).find(
    (child): child is HTMLTableCaptionElement => child instanceof HTMLTableCaptionElement
  );
  const caption = captionElement === undefined ? null : extractSafeInline(captionElement);

  return {
    caption,
    captionText: caption === null ? null : safeInlineText(caption),
    rows: logicalRows,
    columnCount,
    headerRowIndexes
  };
}
