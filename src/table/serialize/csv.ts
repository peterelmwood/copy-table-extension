import type { LogicalTable } from "../model";

function serializeField(value: string): string {
  return /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function serializeCsv(table: LogicalTable): string {
  return table.rows
    .map((row) =>
      Array.from({ length: table.columnCount }, (_, columnIndex) =>
        serializeField(row.cells[columnIndex]?.text ?? "")
      ).join(",")
    )
    .join("\r\n");
}
