import type { LogicalTable, LogicalTableCell, LogicalTableOriginCell } from "../model";
import { headerRowRange, isWholeHeaderRow } from "./header-rows";

const INDENT = "  ";

/** The displayed text of a cell; covered and empty positions are "". */
function cellText(cell: LogicalTableCell | undefined): string {
  return cell?.text ?? "";
}

function rowValues(table: LogicalTable, rowIndex: number): string[] {
  const row = table.rows[rowIndex];
  return Array.from({ length: table.columnCount }, (_, columnIndex) =>
    cellText(row?.cells[columnIndex])
  );
}

/**
 * The leading header rows used as object keys, or `null` when the table has
 * none: the merged range must start at the first logical row, and that row
 * must be a `<thead>` row or a row of only `<th>` cells.
 */
function leadingHeaderRows(table: LogicalTable): number[] | null {
  const range = headerRowRange(table);
  const firstRow = table.rows[0];
  if (
    range[0] !== 0 ||
    firstRow === undefined ||
    (firstRow.section !== "head" && !isWholeHeaderRow(firstRow))
  ) {
    return null;
  }
  return range;
}

/** The origin cell at a position, following a covered cell to its owner. */
function owningCell(
  table: LogicalTable,
  rowIndex: number,
  columnIndex: number
): LogicalTableOriginCell | null {
  const cell = table.rows[rowIndex]?.cells[columnIndex];
  if (cell?.kind === "origin") {
    return cell;
  }
  if (cell?.kind === "covered") {
    const owner = table.rows[cell.ownerRow]?.cells[cell.ownerColumn];
    return owner?.kind === "origin" ? owner : null;
  }
  return null;
}

/**
 * One name per column: the texts of the header cells over that column (a
 * spanning cell names every column it covers, once) joined with " / ".
 */
function rawColumnNames(table: LogicalTable, headerRows: readonly number[]): string[] {
  return Array.from({ length: table.columnCount }, (_, columnIndex) => {
    const owners = new Set<LogicalTableOriginCell>();
    for (const rowIndex of headerRows) {
      const owner = owningCell(table, rowIndex, columnIndex);
      if (owner !== null) {
        owners.add(owner);
      }
    }
    return [...owners]
      .map((owner) => owner.text)
      .filter((text) => text.length > 0)
      .join(" / ");
  });
}

/**
 * Makes column names usable as unique object keys, deterministically in column
 * order: empty names become `Column N` (1-based), and a repeated name gets the
 * first free suffix of `_2`, `_3`, ….
 */
export function uniqueColumnNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name, columnIndex) => {
    const base = name.length > 0 ? name : `Column ${columnIndex + 1}`;
    let candidate = base;
    for (let suffix = 2; used.has(candidate); suffix += 1) {
      candidate = `${base}_${suffix}`;
    }
    used.add(candidate);
    return candidate;
  });
}

/**
 * Pretty-prints records exactly as `JSON.stringify(value, null, 2)` would, but
 * keeps keys in column order: JavaScript objects list integer-like keys (such
 * as year headers) first, which would reorder the columns. Every key and value
 * is still escaped by `JSON.stringify`.
 */
function stringifyRecords(
  keys: readonly string[],
  records: readonly (readonly string[])[]
): string {
  if (records.length === 0) {
    return "[]";
  }
  const objects = records.map((values) => {
    const members = keys.map(
      (key, index) =>
        `${INDENT}${INDENT}${JSON.stringify(key)}: ${JSON.stringify(values[index] ?? "")}`
    );
    return `${INDENT}{\n${members.join(",\n")}\n${INDENT}}`;
  });
  return `[\n${objects.join(",\n")}\n]`;
}

/**
 * Serializes the table as pretty-printed JSON. With leading header rows, an
 * array of objects keyed by the merged header row; otherwise an array of
 * arrays. Values are always the displayed cell text, as strings.
 */
export function serializeJson(table: LogicalTable): string {
  if (table.rows.length === 0 || table.columnCount === 0) {
    return "[]";
  }

  const headerRows = leadingHeaderRows(table);
  if (headerRows === null) {
    return JSON.stringify(
      table.rows.map((_, rowIndex) => rowValues(table, rowIndex)),
      null,
      2
    );
  }

  const keys = uniqueColumnNames(rawColumnNames(table, headerRows));
  const records = [...table.rows.keys()]
    .filter((rowIndex) => !headerRows.includes(rowIndex))
    .map((rowIndex) => rowValues(table, rowIndex));
  return stringifyRecords(keys, records);
}
