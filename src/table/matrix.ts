import type {
  LogicalTable,
  LogicalTableCell,
  LogicalTableOriginCell,
  LogicalTableRow,
  LogicalTableScope,
  LogicalTableSection,
  SafeInline
} from "./model";
import { safeInlineText } from "./safe-inline";

// The HTML limits for rowspan and colspan. ARIA spans use the same limits so
// both front ends reject the same oversized geometry.
export const MAXIMUM_ROW_SPAN = 65_534;
export const MAXIMUM_COLUMN_SPAN = 1_000;

export function invalidGeometry(): never {
  throw new Error("Invalid table geometry");
}

/**
 * Parses a span attribute value: absent means 1; anything other than a
 * non-negative integer within `maximum` (and non-zero unless `allowZero`)
 * is invalid geometry.
 */
export function parseSpan(rawValue: string | null, maximum: number, allowZero: boolean): number {
  if (rawValue === null) {
    return 1;
  }
  const normalized = rawValue.trim();
  if (!/^\d+$/u.test(normalized)) {
    return invalidGeometry();
  }
  const span = Number(normalized);
  if (!Number.isSafeInteger(span) || span > maximum || (!allowZero && span === 0)) {
    return invalidGeometry();
  }
  return span;
}

/** One source cell, already classified by a front end. */
export interface MatrixSourceCell {
  /** Parsed row span; 0 spans to the end of the row group. */
  rowSpan: number;
  columnSpan: number;
  isHeader: boolean;
  scope: LogicalTableScope | null;
  /** Reads the cell's safe content; called once, only for cells that are placed. */
  content(): readonly SafeInline[];
}

/** One source row, in logical order. */
export interface MatrixSourceRow {
  section: LogicalTableSection;
  rowGroupIndex: number;
  /** Index one past the last row of this row's group; row spans are clipped to it. */
  rowGroupEnd: number;
  isHeaderRow: boolean;
  cells: readonly MatrixSourceCell[];
}

function effectiveRowSpan(span: number, rowIndex: number, rowGroupEnd: number): number {
  const remainingRows = rowGroupEnd - rowIndex;
  return span === 0 ? remainingRows : Math.min(span, remainingRows);
}

function originCell(
  cell: MatrixSourceCell,
  sourceRow: number,
  sourceColumn: number,
  rowSpan: number,
  columnSpan: number
): LogicalTableOriginCell {
  const inline = cell.content();
  return {
    kind: "origin",
    text: safeInlineText(inline),
    inline,
    isHeader: cell.isHeader,
    scope: cell.scope,
    sourceRow,
    sourceColumn,
    rowSpan,
    columnSpan
  };
}

/**
 * Places source cells into a rectangular matrix using the HTML table
 * algorithm's slot occupancy: each cell takes the first free column, spans
 * mark the slots they cover, and overlapping spans are invalid geometry.
 * Shared by the semantic-table and ARIA front ends.
 */
export function buildLogicalTable(
  rows: readonly MatrixSourceRow[],
  caption: readonly SafeInline[] | null
): LogicalTable {
  if (rows.length === 0) {
    return invalidGeometry();
  }

  const matrix: Array<Array<LogicalTableCell | undefined>> = rows.map(() => []);
  const headerRowIndexes: number[] = [];
  let columnCount = 0;

  for (const [rowIndex, sourceRow] of rows.entries()) {
    let columnIndex = 0;

    for (const cell of sourceRow.cells) {
      while (matrix[rowIndex]?.[columnIndex] !== undefined) {
        columnIndex += 1;
      }

      const rowSpan = effectiveRowSpan(cell.rowSpan, rowIndex, sourceRow.rowGroupEnd);
      const columnSpan = cell.columnSpan;

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

      columnIndex += columnSpan;
      columnCount = Math.max(columnCount, columnIndex);
    }

    if (sourceRow.isHeaderRow) {
      headerRowIndexes.push(rowIndex);
    }
    columnCount = Math.max(columnCount, matrix[rowIndex]?.length ?? 0);
  }

  if (columnCount === 0) {
    return invalidGeometry();
  }

  const logicalRows: LogicalTableRow[] = rows.map((sourceRow, rowIndex) => {
    const cells = matrix[rowIndex];
    if (cells === undefined) {
      return invalidGeometry();
    }
    return {
      section: sourceRow.section,
      rowGroupIndex: sourceRow.rowGroupIndex,
      cells: Array.from({ length: columnCount }, (_, columnIndex) =>
        cells[columnIndex] === undefined
          ? { kind: "empty" as const, text: "" as const }
          : cells[columnIndex]
      )
    };
  });

  return {
    caption,
    captionText: caption === null ? null : safeInlineText(caption),
    rows: logicalRows,
    columnCount,
    headerRowIndexes
  };
}
