import type { LogicalTable } from "../model";

export function serializeText(table: LogicalTable): string {
  return table.rows
    .map((row) =>
      Array.from({ length: table.columnCount }, (_, columnIndex) =>
        (row.cells[columnIndex]?.text ?? "").replace(/\r\n|\r|\n/gu, " ")
      ).join("\t")
    )
    .join("\n");
}
