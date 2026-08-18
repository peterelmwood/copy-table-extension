import type {
  LogicalTable,
  LogicalTableCell,
  LogicalTableOriginCell,
  LogicalTableRow,
  LogicalTableScope,
  LogicalTableSection
} from "./model";
import { extractSafeInline, safeInlineText } from "./safe-inline";

const MAXIMUM_ROW_SPAN = 65_534;
const MAXIMUM_COLUMN_SPAN = 1_000;

interface SourceRow {
  element: HTMLTableRowElement;
  section: LogicalTableSection;
  rowGroupIndex: number;
  rowGroupEnd: number;
}

function invalidGeometry(): never {
  throw new Error("Invalid table geometry");
}

function sourceRows(table: HTMLTableElement): readonly SourceRow[] {
  const groups: Array<{
    rows: HTMLTableRowElement[];
    section: LogicalTableSection;
  }> = [];
  let directRows: HTMLTableRowElement[] = [];

  function flushDirectRows(): void {
    if (directRows.length > 0) {
      groups.push({ rows: directRows, section: "body" });
      directRows = [];
    }
  }

  for (const child of table.children) {
    if (child instanceof HTMLTableRowElement) {
      directRows.push(child);
      continue;
    }
    flushDirectRows();
    if (!["THEAD", "TBODY", "TFOOT"].includes(child.tagName)) {
      continue;
    }
    const groupRows: HTMLTableRowElement[] = [];
    for (const sectionChild of child.children) {
      if (sectionChild instanceof HTMLTableRowElement) {
        groupRows.push(sectionChild);
      }
    }
    if (groupRows.length > 0) {
      groups.push({
        rows: groupRows,
        section: child.tagName === "THEAD" ? "head" : child.tagName === "TFOOT" ? "foot" : "body"
      });
    }
  }
  flushDirectRows();

  const rows: SourceRow[] = [];
  for (const [rowGroupIndex, group] of groups.entries()) {
    const rowGroupEnd = rows.length + group.rows.length;
    for (const element of group.rows) {
      rows.push({ element, section: group.section, rowGroupIndex, rowGroupEnd });
    }
  }

  return rows;
}

function parsedSpan(
  cell: HTMLTableCellElement,
  attribute: "rowspan" | "colspan",
  maximum: number,
  allowZero: boolean
): number {
  const rawValue = cell.getAttribute(attribute);
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

function effectiveRowSpan(
  cell: HTMLTableCellElement,
  rowIndex: number,
  rowGroupEnd: number
): number {
  const span = parsedSpan(cell, "rowspan", MAXIMUM_ROW_SPAN, true);
  const remainingRows = rowGroupEnd - rowIndex;
  return span === 0 ? remainingRows : Math.min(span, remainingRows);
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

  for (const [rowIndex, sourceRow] of rows.entries()) {
    const row = sourceRow.element;
    let columnIndex = 0;
    let hasHeader = false;

    for (const cell of row.cells) {
      while (matrix[rowIndex]?.[columnIndex] !== undefined) {
        columnIndex += 1;
      }

      const rowSpan = effectiveRowSpan(cell, rowIndex, sourceRow.rowGroupEnd);
      const columnSpan = parsedSpan(cell, "colspan", MAXIMUM_COLUMN_SPAN, false);

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
