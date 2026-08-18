import type { LogicalTable } from "../model";

function escapeMarkdownCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replace(/\r\n|\r|\n/gu, "<br>");
}

function serializeRow(table: LogicalTable, rowIndex: number): string {
  const row = table.rows[rowIndex];
  const values = Array.from({ length: table.columnCount }, (_, columnIndex) =>
    escapeMarkdownCell(row?.cells[columnIndex]?.text ?? "")
  );
  return `| ${values.join(" | ")} |`;
}

export function serializeMarkdown(table: LogicalTable): string {
  if (table.rows.length === 0 || table.columnCount === 0) {
    return "";
  }

  const headerRowIndex = table.headerRowIndexes[0] ?? 0;
  const output = [
    serializeRow(table, headerRowIndex),
    `| ${Array.from({ length: table.columnCount }, () => "---").join(" | ")} |`
  ];

  for (const rowIndex of table.rows.keys()) {
    if (rowIndex !== headerRowIndex) {
      output.push(serializeRow(table, rowIndex));
    }
  }

  return output.join("\n");
}
