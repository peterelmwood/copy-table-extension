import { afterEach, describe, expect, it, vi } from "vitest";
import { renderCopyOutcome } from "../../src/content/feedback";
import type { CopyOutcomeMessage } from "../../src/table/model";

const HOST_SELECTOR = "[data-copy-table-feedback]";

function copied(format: CopyOutcomeMessage["format"] = "html"): CopyOutcomeMessage {
  return { type: "copy-table:outcome", requestId: "request", format, status: "copied" };
}

describe("copy outcome feedback", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("announces a fixed selected-format success message without rendering payload text", () => {
    const toast = renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-1",
      format: "csv",
      status: "copied",
      payload: "private,table,contents"
    } as unknown as CopyOutcomeMessage);

    expect(toast?.textContent).toBe("Copied as CSV.");
    expect(toast?.textContent).not.toContain("private,table,contents");
    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.getAttribute("aria-live")).toBe("polite");
    expect(toast?.getAttribute("aria-atomic")).toBe("true");
  });

  it.each([
    [{ rows: 42, columns: 5 }, "csv", "Copied 42 rows × 5 columns as CSV."],
    [{ rows: 1, columns: 1 }, "html", "Copied 1 row × 1 column as HTML."],
    [{ rows: 3, columns: 1 }, "csv", "Copied 3 rows × 1 column as CSV."],
    [{ rows: 1, columns: 4 }, "markdown", "Copied 1 row × 4 columns as Markdown."],
    [{ rows: 0, columns: 0 }, "text", "Copied 0 rows × 0 columns as Plain text."],
    [{ rows: 2, columns: 2 }, "html-source", "Copied 2 rows × 2 columns as HTML source."]
  ] as const)("announces the copied size %j as %s", (dimensions, format, expectedText) => {
    const toast = renderCopyOutcome(document, { ...copied(format), dimensions });

    expect(toast?.textContent).toBe(expectedText);
    expect(toast?.getAttribute("role")).toBe("status");
  });

  it("keeps the size-free wording when an outcome carries no dimensions", () => {
    expect(renderCopyOutcome(document, copied("csv"))?.textContent).toBe("Copied as CSV.");
  });

  it("never mentions a size on failures, even if one slips through", () => {
    const toast = renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-3",
      format: "csv",
      status: "clipboard-failed",
      dimensions: { rows: 2, columns: 2 }
    });

    expect(toast?.textContent).toBe("Clipboard access failed. Try again.");
  });

  it.each([
    ["no-table", "No table found at the selected location."],
    ["target-expired", "The selected table is no longer available. Try again."],
    ["invalid-table", "This table could not be copied. Try again."],
    ["unexpected", "Copy failed. Try again."],
    ["restricted-page", "This page cannot be accessed."],
    ["clipboard-failed", "Clipboard access failed. Try again."]
  ] as const)("announces fixed accessible feedback for %s", (status, expectedText) => {
    const toast = renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-2",
      format: "html",
      status
    });

    expect(toast?.textContent).toBe(expectedText);
    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.getAttribute("aria-live")).toBe("polite");
    expect(toast?.getAttribute("aria-atomic")).toBe("true");
  });

  it("renders the toast inside a closed shadow root on a custom-named host", () => {
    const toast = renderCopyOutcome(document, copied("markdown"));

    const host = document.querySelector<HTMLElement>(HOST_SELECTOR);
    expect(host?.localName).toBe("copy-table-feedback");
    expect(host?.parentNode).toBe(document.body);
    // A closed root is invisible to the page...
    expect(host?.shadowRoot).toBeNull();
    expect(document.querySelector("[role=status]")).toBeNull();
    expect(document.body.textContent).toBe("");
    // ...but the returned live region lives in it.
    const root = toast?.getRootNode() as ShadowRoot;
    expect(root).toBeInstanceOf(ShadowRoot);
    expect(root.mode).toBe("closed");
    expect(root.host).toBe(host);
    expect(toast?.textContent).toBe("Copied as Markdown.");
  });

  it("protects the host with inline !important declarations", () => {
    renderCopyOutcome(document, copied());

    const host = document.querySelector<HTMLElement>(HOST_SELECTOR);
    expect(host?.style.getPropertyValue("position")).toBe("fixed");
    expect(host?.style.getPropertyPriority("position")).toBe("important");
    expect(host?.style.getPropertyValue("display")).toBe("block");
    expect(host?.style.getPropertyPriority("display")).toBe("important");
    expect(host?.style.getPropertyPriority("z-index")).toBe("important");
  });

  it("replaces an existing toast and removes the replacement after its bounded timeout", () => {
    vi.useFakeTimers();
    renderCopyOutcome(document, copied());
    const toast = renderCopyOutcome(document, {
      type: "copy-table:outcome",
      requestId: "request-4",
      format: "text",
      status: "no-table"
    });

    expect(document.querySelectorAll(HOST_SELECTOR)).toHaveLength(1);
    expect(toast?.textContent).toBe("No table found at the selected location.");
    expect(toast?.isConnected).toBe(true);

    vi.advanceTimersByTime(3_000);
    expect(document.querySelector(HOST_SELECTOR)).toBeNull();
    expect(toast?.isConnected).toBe(false);
  });

  it("falls back to the root element when the document has no body", () => {
    const bodiless = document.implementation.createHTMLDocument("no body");
    bodiless.body.remove();
    expect(bodiless.body).toBeNull();

    const toast = renderCopyOutcome(bodiless, copied("text"));

    expect(toast?.textContent).toBe("Copied as Plain text.");
    expect(bodiless.querySelector(HOST_SELECTOR)?.parentNode).toBe(bodiless.documentElement);
  });

  it("skips without throwing in an SVG document, which can't render an HTML toast", () => {
    const svg = document.implementation.createDocument("http://www.w3.org/2000/svg", "svg");

    expect(renderCopyOutcome(svg, copied("csv"))).toBeNull();
    expect(svg.querySelector(HOST_SELECTOR)).toBeNull();
  });

  it("renders into a frameset document", () => {
    const frameset = document.implementation.createHTMLDocument("frameset");
    frameset.body.replaceWith(frameset.createElement("frameset"));

    const toast = renderCopyOutcome(frameset, copied("csv"));

    expect(toast?.textContent).toBe("Copied as CSV.");
    expect(frameset.querySelectorAll(HOST_SELECTOR)).toHaveLength(1);
  });

  it("skips without throwing when the document has nowhere to attach", () => {
    const empty = document.implementation.createDocument(null, null);

    expect(() => renderCopyOutcome(empty, copied())).not.toThrow();
    expect(renderCopyOutcome(empty, copied())).toBeNull();
  });

  it("returns null instead of throwing if the host can't take a shadow root", () => {
    const attachShadow = vi.spyOn(HTMLElement.prototype, "attachShadow").mockImplementation(() => {
      throw new DOMException("Not supported", "NotSupportedError");
    });
    try {
      expect(renderCopyOutcome(document, copied())).toBeNull();
    } finally {
      attachShadow.mockRestore();
    }
  });
});
