import { describe, expect, it } from "vitest";
import { createBrowserInteractionController } from "../../src/background";
import { createContentMessageHandler } from "../../src/content/content-handler";

const ATTEMPT_COUNT = 20;
const MAX_DURATION_MS = 2_000;

function createLargeTable(document_: Document): HTMLTableElement {
  const table = document_.createElement("table");
  // A header row, so JSON exercises its array-of-objects path.
  const headerRow = table.createTHead().insertRow();
  for (let columnIndex = 0; columnIndex < 50; columnIndex += 1) {
    const header = document_.createElement("th");
    header.textContent = `Column ${columnIndex}`;
    headerRow.append(header);
  }
  const body = table.createTBody();

  for (let rowIndex = 0; rowIndex < 100; rowIndex += 1) {
    const row = body.insertRow();
    for (let columnIndex = 0; columnIndex < 50; columnIndex += 1) {
      row.insertCell().textContent = `r${rowIndex}c${columnIndex}`;
    }
  }

  return table;
}

function createLargeAriaGrid(document_: Document): Element {
  const grid = document_.createElement("div");
  grid.setAttribute("role", "grid");
  // A column-header row, matching the table above.
  const headerRow = grid.appendChild(document_.createElement("div"));
  headerRow.setAttribute("role", "row");
  for (let columnIndex = 0; columnIndex < 50; columnIndex += 1) {
    const header = headerRow.appendChild(document_.createElement("div"));
    header.setAttribute("role", "columnheader");
    header.textContent = `Column ${columnIndex}`;
  }
  const rowGroup = grid.appendChild(document_.createElement("div"));
  rowGroup.setAttribute("role", "rowgroup");

  for (let rowIndex = 0; rowIndex < 100; rowIndex += 1) {
    const row = rowGroup.appendChild(document_.createElement("div"));
    row.setAttribute("role", "row");
    for (let columnIndex = 0; columnIndex < 50; columnIndex += 1) {
      const cell = row.appendChild(document_.createElement("div"));
      cell.setAttribute("role", "gridcell");
      cell.textContent = `r${rowIndex}c${columnIndex}`;
    }
  }

  return grid;
}

describe("table conversion performance", () => {
  it.each([
    ["table", "csv", createLargeTable],
    ["table", "json", createLargeTable],
    ["ARIA grid", "csv", createLargeAriaGrid],
    ["ARIA grid", "json", createLargeAriaGrid]
  ] as const)(
    "converts, writes, and acknowledges a 100 by 50 %s as %s within two seconds in 19 of 20 attempts",
    async (_kind, format, createTable) => {
      const isolatedDocument = document.implementation.createHTMLDocument("performance");
      const table = createTable(isolatedDocument);
      const handler = createContentMessageHandler({ getTargetElement: () => table });
      const completionTimes: number[] = [];
      let requestNumber = 0;
      let acknowledgements = 0;
      let lastPayload = "";
      const controller = createBrowserInteractionController({
        inject: async () => undefined,
        sendMessage: async (_tabId, request) => handler(request),
        sendOutcome: async () => {
          acknowledgements += 1;
        },
        writeText: async (payload: string) => {
          lastPayload = payload;
        },
        nextRequestId: () => `performance-${requestNumber++}`
      });

      for (let attempt = 0; attempt < ATTEMPT_COUNT; attempt += 1) {
        const startedAt = performance.now();
        await controller.handleMenuClick(
          { menuItemId: `copy-table:copy-as:${format}`, targetElementId: 1, frameId: 0 },
          { id: 1 }
        );
        completionTimes.push(performance.now() - startedAt);
      }

      expect(acknowledgements).toBe(ATTEMPT_COUNT);
      if (format === "csv") {
        // The header row plus 100 body rows.
        expect(lastPayload.split("\r\n")).toHaveLength(101);
        expect(lastPayload.endsWith(",r99c49")).toBe(true);
      } else {
        expect(lastPayload).toContain('"r99c49"');
      }
      expect(
        completionTimes.filter((duration) => duration < MAX_DURATION_MS).length
      ).toBeGreaterThanOrEqual(19);
    }
  );
});
