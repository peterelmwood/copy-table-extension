import type { LogicalTable, LogicalTableRow, SafeInline } from "../model";
import { headerRowRange } from "./header-rows";

/**
 * Escapes plain cell text: backslashes before pipes, so a literal `|` cannot
 * end the cell and a literal `\` cannot escape the next character.
 */
function escapeCellText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

/**
 * Escapes text whose surrounding Markdown syntax (link text, bold caption)
 * would otherwise be changed by brackets, emphasis markers, code spans or
 * inline HTML, on top of the cell escaping.
 */
function escapeDelimitedText(value: string): string {
  return escapeCellText(value).replace(/[[\]*_`<>]/gu, (character) => `\\${character}`);
}

/**
 * Percent-encodes characters that would end or split a link destination
 * inside a pipe table: whitespace, parentheses, angle brackets, pipes,
 * backslashes and backticks. `%` is left alone so existing escapes are not
 * doubled.
 */
function encodeLinkDestination(href: string): string {
  return href.replace(/[\s()<>|\\`]/gu, (character) => {
    const code = character.charCodeAt(0);
    return code < 0x80
      ? `%${code.toString(16).toUpperCase().padStart(2, "0")}`
      : encodeURIComponent(character);
  });
}

function breakFreeLines(value: string): string {
  return value.replace(/\r\n|\r|\n/gu, "<br>");
}

/**
 * Serializes safe inline tokens as Markdown: links become `[text](href)` and
 * line breaks become `<br>`. All Markdown escaping lives here.
 */
export function serializeInlineMarkdown(
  tokens: readonly SafeInline[],
  context: "cell" | "delimited" = "cell"
): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        const escaped =
          context === "cell" ? escapeCellText(token.value) : escapeDelimitedText(token.value);
        return breakFreeLines(escaped);
      }
      if (token.type === "break") {
        return "<br>";
      }
      if (context === "delimited") {
        // Links cannot nest; keep the inner text only.
        return serializeInlineMarkdown(token.children, "delimited");
      }
      return `[${serializeInlineMarkdown(token.children, "delimited")}](${encodeLinkDestination(token.href)})`;
    })
    .join("");
}

function cellValue(row: LogicalTableRow | undefined, columnIndex: number): string {
  const cell = row?.cells[columnIndex];
  return cell?.kind === "origin" ? serializeInlineMarkdown(cell.inline) : "";
}

function formatRow(values: readonly string[]): string {
  return `| ${values.join(" | ")} |`;
}

function serializeRow(table: LogicalTable, rowIndex: number): string {
  const row = table.rows[rowIndex];
  return formatRow(
    Array.from({ length: table.columnCount }, (_, columnIndex) => cellValue(row, columnIndex))
  );
}

function serializeHeader(table: LogicalTable, headerRows: readonly number[]): string {
  return formatRow(
    Array.from({ length: table.columnCount }, (_, columnIndex) =>
      headerRows
        .map((rowIndex) => cellValue(table.rows[rowIndex], columnIndex))
        .filter((value) => value.length > 0)
        .join(" / ")
    )
  );
}

export function serializeMarkdown(table: LogicalTable): string {
  if (table.rows.length === 0 || table.columnCount === 0) {
    return "";
  }

  const headerRows = headerRowRange(table);
  const output: string[] = [];

  const caption = table.caption === null ? "" : serializeInlineMarkdown(table.caption, "delimited");
  if (caption.length > 0) {
    output.push(`**${caption}**`, "");
  }

  output.push(
    serializeHeader(table, headerRows),
    formatRow(Array.from({ length: table.columnCount }, () => "---"))
  );

  for (const rowIndex of table.rows.keys()) {
    if (!headerRows.includes(rowIndex)) {
      output.push(serializeRow(table, rowIndex));
    }
  }

  return output.join("\n");
}
