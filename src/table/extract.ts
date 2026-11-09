import {
  buildLogicalTable,
  MAXIMUM_COLUMN_SPAN,
  MAXIMUM_ROW_SPAN,
  parseSpan,
  type MatrixSourceCell,
  type MatrixSourceRow
} from "./matrix";
import type { LogicalTable, LogicalTableScope, LogicalTableSection } from "./model";
import { extractSafeInline } from "./safe-inline";

interface SourceRow {
  element: HTMLTableRowElement;
  section: LogicalTableSection;
  rowGroupIndex: number;
  rowGroupEnd: number;
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

function cellScope(cell: HTMLTableCellElement): LogicalTableScope | null {
  const scope = cell.getAttribute("scope")?.toLowerCase();
  return scope === "row" || scope === "col" || scope === "rowgroup" || scope === "colgroup"
    ? scope
    : null;
}

function matrixRow(sourceRow: SourceRow): MatrixSourceRow {
  const cells: MatrixSourceCell[] = [];
  let isHeaderRow = false;
  for (const cell of sourceRow.element.cells) {
    const isHeader = cell.tagName === "TH";
    cells.push({
      rowSpan: parseSpan(cell.getAttribute("rowspan"), MAXIMUM_ROW_SPAN, true),
      columnSpan: parseSpan(cell.getAttribute("colspan"), MAXIMUM_COLUMN_SPAN, false),
      isHeader,
      scope: cellScope(cell),
      content: () => extractSafeInline(cell)
    });
    isHeaderRow ||= isHeader;
  }
  return {
    section: sourceRow.section,
    rowGroupIndex: sourceRow.rowGroupIndex,
    rowGroupEnd: sourceRow.rowGroupEnd,
    isHeaderRow,
    cells
  };
}

export function extractLogicalTable(table: HTMLTableElement): LogicalTable {
  const rows = sourceRows(table).map(matrixRow);

  const captionElement = Array.from(table.children).find(
    (child): child is HTMLTableCaptionElement => child instanceof HTMLTableCaptionElement
  );
  const caption = captionElement === undefined ? null : extractSafeInline(captionElement);

  return buildLogicalTable(rows, caption);
}
