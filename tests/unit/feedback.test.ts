import { afterEach, describe, expect, it, vi } from "vitest";
import { renderCopyOutcome } from "../../src/content/feedback";
import type { CopyOutcomeMessage } from "../../src/table/model";

describe("copy outcome feedback", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("announces a fixed selected-format success message without rendering payload text", () => {
    renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-1",
      format: "csv",
      status: "copied",
      payload: "private,table,contents"
    } as unknown as CopyOutcomeMessage);

    const toast = document.querySelector("[data-copy-table-feedback]");
    expect(toast?.textContent).toContain("Copied as CSV.");
    expect(toast?.textContent).not.toContain("private,table,contents");
    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.getAttribute("aria-live")).toBe("polite");
  });

  it.each([
    ["no-table", "No table found at the selected location."],
    ["target-expired", "The selected table is no longer available. Try again."],
    ["invalid-table", "This table could not be copied. Try again."],
    ["unexpected", "Copy failed. Try again."],
    ["restricted-page", "This page cannot be accessed."],
    ["clipboard-failed", "Clipboard access failed. Try again."]
  ] as const)("announces fixed accessible feedback for %s", (status, expectedText) => {
    renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-2",
      format: "html",
      status
    });

    const toast = document.querySelector("[data-copy-table-feedback]");
    expect(toast?.textContent).toContain(expectedText);
    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.getAttribute("aria-live")).toBe("polite");
    expect(toast?.getAttribute("aria-atomic")).toBe("true");
  });

  it("replaces an existing toast and removes the replacement after its bounded timeout", () => {
    vi.useFakeTimers();
    renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-3",
      format: "html",
      status: "copied"
    });
    renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-4",
      format: "text",
      status: "no-table"
    });

    expect(document.querySelectorAll("[data-copy-table-feedback]")).toHaveLength(1);
    expect(document.body.textContent).toContain("No table found at the selected location.");

    vi.advanceTimersByTime(3_000);
    expect(document.querySelector("[data-copy-table-feedback]")).toBeNull();
  });
});
