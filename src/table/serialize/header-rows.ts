import type { LogicalTable, LogicalTableRow } from "../model";

/** True when the row has at least one origin cell and every origin cell is a `<th>`. */
export function isWholeHeaderRow(row: LogicalTableRow): boolean {
  let hasHeader = false;
  for (const cell of row.cells) {
    if (cell.kind === "origin") {
      if (!cell.isHeader) {
        return false;
      }
      hasHeader = true;
    }
  }
  return hasHeader;
}

/**
 * The rows merged into a single header row: the first explicit header row (or
 * the first logical row) plus the header rows that directly follow it in the
 * same row group, i.e. further `<thead>` rows or rows of only `<th>`.
 */
export function headerRowRange(table: LogicalTable): number[] {
  const first = table.headerRowIndexes[0];
  if (first === undefined) {
    return [0];
  }

  const firstRow = table.rows[first];
  const range = [first];
  for (let rowIndex = first + 1; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    if (
      row === undefined ||
      firstRow === undefined ||
      row.section !== firstRow.section ||
      row.rowGroupIndex !== firstRow.rowGroupIndex ||
      !table.headerRowIndexes.includes(rowIndex) ||
      (row.section !== "head" && !isWholeHeaderRow(row))
    ) {
      break;
    }
    range.push(rowIndex);
  }
  return range;
}
