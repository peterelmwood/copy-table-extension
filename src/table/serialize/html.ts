import type { LogicalTable, LogicalTableOriginCell, SafeInline } from "../model";

function escapeHtmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function serializeInline(tokens: readonly SafeInline[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        return escapeHtmlText(token.value);
      }
      if (token.type === "break") {
        return "<br>";
      }
      return `<a href="${escapeHtmlAttribute(token.href)}" rel="noopener noreferrer">${serializeInline(token.children)}</a>`;
    })
    .join("");
}

function serializeOriginCell(cell: LogicalTableOriginCell): string {
  const tagName = cell.isHeader ? "th" : "td";
  const attributes: string[] = [];
  if (cell.isHeader && cell.scope !== null) {
    attributes.push(`scope="${cell.scope}"`);
  }
  if (cell.rowSpan > 1) {
    attributes.push(`rowspan="${cell.rowSpan}"`);
  }
  if (cell.columnSpan > 1) {
    attributes.push(`colspan="${cell.columnSpan}"`);
  }
  const serializedAttributes = attributes.length === 0 ? "" : ` ${attributes.join(" ")}`;
  return `<${tagName}${serializedAttributes}>${serializeInline(cell.inline)}</${tagName}>`;
}

export function serializeHtml(table: LogicalTable): string {
  let output = "<table>";
  if (table.caption !== null) {
    output += `<caption>${serializeInline(table.caption)}</caption>`;
  }

  let openSection: string | null = null;
  for (const row of table.rows) {
    const section = row.section === "head" ? "thead" : row.section === "foot" ? "tfoot" : "tbody";
    if (section !== openSection) {
      if (openSection !== null) {
        output += `</${openSection}>`;
      }
      output += `<${section}>`;
      openSection = section;
    }

    output += "<tr>";
    for (const cell of row.cells) {
      if (cell.kind === "covered") {
        continue;
      }
      output += cell.kind === "empty" ? "<td></td>" : serializeOriginCell(cell);
    }
    output += "</tr>";
  }

  if (openSection !== null) {
    output += `</${openSection}>`;
  }
  return `${output}</table>`;
}
