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

describe("table conversion performance", () => {
  it.each(["csv", "json"] as const)(
    "converts, writes, and acknowledges a 100 by 50 table as %s within two seconds in 19 of 20 attempts",
    async (format) => {
      const isolatedDocument = document.implementation.createHTMLDocument("performance");
      const table = createLargeTable(isolatedDocument);
      const handler = createContentMessageHandler({ getTargetElement: () => table });
      const completionTimes: number[] = [];
      let requestNumber = 0;
      let acknowledgements = 0;
      const controller = createBrowserInteractionController({
        inject: async () => undefined,
        sendMessage: async (_tabId, request) => handler(request),
        sendOutcome: async () => {
          acknowledgements += 1;
        },
        writeText: async () => undefined,
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
      expect(
        completionTimes.filter((duration) => duration < MAX_DURATION_MS).length
      ).toBeGreaterThanOrEqual(19);
    }
  );
});
