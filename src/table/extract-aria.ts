import {
  buildLogicalTable,
  MAXIMUM_COLUMN_SPAN,
  MAXIMUM_ROW_SPAN,
  parseSpan,
  type MatrixSourceCell,
  type MatrixSourceRow
} from "./matrix";
import type { LogicalTable } from "./model";
import { extractSafeInline, isRenderedSubtree } from "./safe-inline";

const ARIA_TABLE_ROLES = new Set(["table", "grid", "treegrid"]);
const ARIA_CELL_ROLES = new Set(["cell", "gridcell", "columnheader", "rowheader"]);

/**
 * The element's ARIA role: the first token of its `role` attribute, lower-cased.
 * Fallback tokens are ignored.
 */
export function ariaRole(element: Element): string | null {
  const token = element.getAttribute("role")?.trim().split(/\s+/u)[0];
  return token === undefined || token.length === 0 ? null : token.toLowerCase();
}

/** Whether `element` is an ARIA table, grid or treegrid root. */
export function isAriaTableRoot(element: Element): boolean {
  const role = ariaRole(element);
  return role !== null && ARIA_TABLE_ROLES.has(role);
}

/** A nested table of either kind; its rows and content belong to it, not to the outer root. */
function isNestedTableRoot(element: Element): boolean {
  return element.localName === "table" || isAriaTableRoot(element);
}

interface AriaRow {
  /** The nearest `rowgroup` between the row and the root, if any. */
  group: Element | null;
  cells: readonly Element[];
  isHeaderRow: boolean;
}

/**
 * Collects the rendered `row` elements owned by `root`, in document order,
 * looking through `rowgroup`s and other wrappers but not into nested tables,
 * grids or rows.
 */
function collectRows(root: Element): Array<{ element: Element; group: Element | null }> {
  const rows: Array<{ element: Element; group: Element | null }> = [];
  const visit = (parent: Element, group: Element | null): void => {
    for (const child of parent.children) {
      if (isNestedTableRoot(child)) {
        continue;
      }
      const role = ariaRole(child);
      if (role === "row") {
        if (isRenderedSubtree(child)) {
          rows.push({ element: child, group });
        }
        continue;
      }
      visit(child, role === "rowgroup" ? child : group);
    }
  };
  visit(root, null);
  return rows;
}

/** Collects the rendered cells of `row`, looking through wrappers but not into nested tables or rows. */
function collectCells(row: Element): Element[] {
  const cells: Element[] = [];
  const visit = (parent: Element): void => {
    for (const child of parent.children) {
      if (isNestedTableRoot(child)) {
        continue;
      }
      const role = ariaRole(child);
      if (role !== null && ARIA_CELL_ROLES.has(role)) {
        if (isRenderedSubtree(child)) {
          cells.push(child);
        }
        continue;
      }
      if (role !== "row") {
        visit(child);
      }
    }
  };
  visit(row);
  return cells;
}

function matrixCell(cell: Element): MatrixSourceCell {
  const role = ariaRole(cell);
  return {
    rowSpan: parseSpan(cell.getAttribute("aria-rowspan"), MAXIMUM_ROW_SPAN, true),
    columnSpan: parseSpan(cell.getAttribute("aria-colspan"), MAXIMUM_COLUMN_SPAN, false),
    isHeader: role === "columnheader" || role === "rowheader",
    scope: role === "columnheader" ? "col" : role === "rowheader" ? "row" : null,
    // A nested grid's content belongs to that grid, as for nested <table>s.
    content: () => extractSafeInline(cell, isAriaTableRoot)
  };
}

/**
 * Builds the logical table of an ARIA `table`, `grid` or `treegrid` made of
 * non-table elements. Only rendered rows are read, so a virtualized grid
 * yields the rows currently in the DOM.
 *
 * Rows made only of `columnheader` cells are header rows; the leading run of
 * them forms the head section and its own row group, like a `<thead>`.
 * Every other run of rows sharing a `rowgroup` (or sharing none) is a body
 * row group. Spans and geometry follow the semantic-table rules.
 */
export function extractAriaLogicalTable(root: Element): LogicalTable {
  const rows: AriaRow[] = collectRows(root).map(({ element, group }) => {
    const cells = collectCells(element);
    return {
      group,
      cells,
      isHeaderRow: cells.length > 0 && cells.every((cell) => ariaRole(cell) === "columnheader")
    };
  });

  let headRowCount = 0;
  while (rows[headRowCount]?.isHeaderRow === true) {
    headRowCount += 1;
  }

  // Assign row groups: a new group starts at every change of rowgroup and at
  // the end of the head section.
  const groupIndexes: number[] = [];
  let groupIndex = -1;
  for (const [rowIndex, row] of rows.entries()) {
    if (rowIndex === 0 || rowIndex === headRowCount || row.group !== rows[rowIndex - 1]?.group) {
      groupIndex += 1;
    }
    groupIndexes.push(groupIndex);
  }

  const groupEnds: number[] = [];
  for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex -= 1) {
    groupEnds[rowIndex] =
      groupIndexes[rowIndex + 1] === groupIndexes[rowIndex]
        ? (groupEnds[rowIndex + 1] ?? rows.length)
        : rowIndex + 1;
  }

  const sourceRows: MatrixSourceRow[] = rows.map((row, rowIndex) => ({
    section: rowIndex < headRowCount ? "head" : "body",
    rowGroupIndex: groupIndexes[rowIndex] ?? 0,
    rowGroupEnd: groupEnds[rowIndex] ?? rowIndex + 1,
    isHeaderRow: row.isHeaderRow,
    cells: row.cells.map(matrixCell)
  }));

  return buildLogicalTable(sourceRows, null);
}
