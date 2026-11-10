import { describe, expect, it, vi } from "vitest";
import { createBrowserInteractionController } from "../../src/background";
import { isCopyOutcomeMessage } from "../../src/browser/messages";
import { createContentMessageHandler } from "../../src/content/content-handler";
import { renderCopyOutcome } from "../../src/content/feedback";

describe("browser interaction", () => {
  it("injects and routes only to the clicked tab and frame before one clipboard write", async () => {
    const inject = vi.fn(async () => undefined);
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      requestId: "request-1",
      format: "csv" as const,
      payload: "second-table"
    }));
    const writeText = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject,
      sendMessage,
      writeText,
      nextRequestId: () => "request-1"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(inject).toHaveBeenCalledWith(31, 7, ["content/content-handler.js"]);
    expect(sendMessage).toHaveBeenCalledWith(
      31,
      {
        type: "copy-table:extract",
        requestId: "request-1",
        targetElementId: 9,
        format: "csv"
      },
      7
    );
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("second-table");
  });

  it("ignores unknown menu items without injection, messaging, or clipboard access", async () => {
    const inject = vi.fn(async () => undefined);
    const sendMessage = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({ inject, sendMessage, writeText });

    await controller.handleMenuClick(
      { menuItemId: "unrelated", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(inject).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("uses top frame zero when Firefox omits the menu frame ID", async () => {
    const inject = vi.fn(async () => undefined);
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      requestId: "request-2",
      format: "html" as const,
      payload: "clicked-table"
    }));
    const writeText = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject,
      sendMessage,
      writeText,
      nextRequestId: () => "request-2"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9 },
      { id: 31 }
    );

    expect(inject).toHaveBeenCalledWith(31, 0, ["content/content-handler.js"]);
    expect(sendMessage).toHaveBeenCalledWith(
      31,
      expect.objectContaining({ format: "html", targetElementId: 9 }),
      0
    );
    expect(writeText).toHaveBeenCalledWith("clicked-table");
  });

  it.each([["no-table"], ["target-expired"], ["invalid-table"], ["unexpected"]] as const)(
    "routes the bounded %s extraction outcome without clipboard access",
    async (reason) => {
      const inject = vi.fn(async () => undefined);
      const sendMessage = vi.fn(async () => ({
        ok: false as const,
        requestId: "request-failure",
        format: "csv" as const,
        reason
      }));
      const sendOutcome = vi.fn(async () => undefined);
      const writeText = vi.fn(async () => undefined);
      const controller = createBrowserInteractionController({
        inject,
        sendMessage,
        sendOutcome,
        writeText,
        nextRequestId: () => "request-failure"
      });

      await controller.handleMenuClick(
        { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 7 },
        { id: 31 }
      );

      expect(writeText).not.toHaveBeenCalled();
      expect(sendOutcome).toHaveBeenCalledWith(
        31,
        { type: "copy-table:outcome", requestId: "request-failure", format: "csv", status: reason },
        7
      );
    }
  );

  it("shows fixed protected-page notification when injection is rejected before a content receiver exists", async () => {
    const inject = vi.fn(async () => Promise.reject(new Error("protected page")));
    const sendMessage = vi.fn(async () => undefined);
    const sendOutcome = vi.fn(async () => Promise.reject(new Error("no content receiver")));
    const notify = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = createBrowserInteractionController({
      inject,
      sendMessage,
      sendOutcome,
      notify,
      writeText,
      nextRequestId: () => "request-restricted"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(sendMessage).not.toHaveBeenCalled();
    expect(sendOutcome).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith({
      type: "basic",
      title: "Copy Table",
      message: "Copy Table cannot access this protected page. Open a normal web page and try again."
    });
  });

  it("performs one rejected write without retry or clipboard read and routes payload-free feedback", async () => {
    const inject = vi.fn(async () => undefined);
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      requestId: "request-clipboard",
      format: "text" as const,
      payload: "private table text",
      dimensions: { rows: 4, columns: 2 }
    }));
    const outcomes: unknown[] = [];
    const sendOutcome = vi.fn(async (_tabId: number, message: unknown) => {
      outcomes.push(message);
    });
    const writeText = vi.fn(async () => Promise.reject(new Error("clipboard denied")));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = createBrowserInteractionController({
      inject,
      sendMessage,
      sendOutcome,
      writeText,
      nextRequestId: () => "request-clipboard"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:text", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("private table text");
    expect(consoleError).not.toHaveBeenCalled();
    expect(sendOutcome).toHaveBeenCalledWith(
      31,
      {
        type: "copy-table:outcome",
        requestId: "request-clipboard",
        format: "text",
        status: "clipboard-failed"
      },
      7
    );
    expect(outcomes[0]).not.toHaveProperty("payload");
    // A failed copy doesn't report a size.
    expect(outcomes[0]).not.toHaveProperty("dimensions");
  });

  it("writes an HTML copy as one rich item and never as plain text", async () => {
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      requestId: "request-rich",
      format: "html" as const,
      payload: "<table><tbody><tr><td>A</td></tr></tbody></table>",
      plainPayload: "A",
      dimensions: { rows: 1, columns: 1 }
    }));
    const writeText = vi.fn(async () => undefined);
    const writeRich = vi.fn(async () => undefined);
    const sendOutcome = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage,
      sendOutcome,
      writeText,
      writeRich,
      nextRequestId: () => "request-rich"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(writeRich).toHaveBeenCalledTimes(1);
    expect(writeRich).toHaveBeenCalledWith({
      html: "<table><tbody><tr><td>A</td></tr></tbody></table>",
      text: "A"
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(sendOutcome).toHaveBeenCalledWith(
      31,
      {
        type: "copy-table:outcome",
        requestId: "request-rich",
        format: "html",
        status: "copied",
        dimensions: { rows: 1, columns: 1 }
      },
      0
    );
  });

  it("forwards the table size only into a copied outcome, which still carries no payload", async () => {
    document.body.innerHTML =
      "<table><thead><tr><th>A</th><th>B</th></tr></thead>" +
      "<tbody><tr><td id=cell>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody>" +
      "<tfoot><tr><td>Sum</td><td>6</td></tr></tfoot></table>";
    const handler = createContentMessageHandler({
      getTargetElement: () => document.querySelector("#cell")
    });
    const outcomes: unknown[] = [];
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async (_tabId, request) => handler(request),
      sendOutcome: async (_tabId, message) => {
        outcomes.push(message);
      },
      writeText: async () => undefined,
      nextRequestId: () => "request-size"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(outcomes).toEqual([
      {
        type: "copy-table:outcome",
        requestId: "request-size",
        format: "csv",
        status: "copied",
        dimensions: { rows: 4, columns: 2 }
      }
    ]);
    expect(outcomes[0]).not.toHaveProperty("payload");
    expect(outcomes[0]).not.toHaveProperty("plainPayload");
    expect(isCopyOutcomeMessage(outcomes[0])).toBe(true);
    expect(
      renderCopyOutcome(document, outcomes[0] as Parameters<typeof renderCopyOutcome>[1])
        ?.textContent
    ).toBe("Copied 4 rows × 2 columns as CSV.");
    document.body.replaceChildren();
  });

  it("keeps the size-free outcome for a response without dimensions", async () => {
    const sendOutcome = vi.fn(async (_tabId: number, _message: unknown) => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => ({
        ok: true as const,
        requestId: "request-legacy",
        format: "csv" as const,
        payload: "A"
      }),
      sendOutcome,
      writeText: async () => undefined,
      nextRequestId: () => "request-legacy"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(sendOutcome).toHaveBeenCalledOnce();
    expect(sendOutcome.mock.calls[0]?.[1]).not.toHaveProperty("dimensions");
  });

  it("keeps a single plain-text write for non-HTML formats even when rich writes exist", async () => {
    const writeText = vi.fn(async () => undefined);
    const writeRich = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => ({
        ok: true as const,
        requestId: "request-csv",
        format: "csv" as const,
        payload: "A,B"
      }),
      writeText,
      writeRich,
      nextRequestId: () => "request-csv"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(writeText).toHaveBeenCalledExactlyOnceWith("A,B");
    expect(writeRich).not.toHaveBeenCalled();
  });

  it("writes an HTML source copy as plain text only, never as rich text", async () => {
    const writeText = vi.fn(async () => undefined);
    const writeRich = vi.fn(async () => undefined);
    const sendOutcome = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => ({
        ok: true as const,
        requestId: "request-source",
        format: "html-source" as const,
        payload: "<table><tbody><tr><td>A</td></tr></tbody></table>"
      }),
      sendOutcome,
      writeText,
      writeRich,
      nextRequestId: () => "request-source"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html-source", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      "<table><tbody><tr><td>A</td></tr></tbody></table>"
    );
    expect(writeRich).not.toHaveBeenCalled();
    expect(sendOutcome).toHaveBeenCalledWith(
      31,
      {
        type: "copy-table:outcome",
        requestId: "request-source",
        format: "html-source",
        status: "copied"
      },
      0
    );
  });

  it("reports one rejected rich write as clipboard-failed without retrying as text", async () => {
    const writeText = vi.fn(async () => undefined);
    const writeRich = vi.fn(async () => Promise.reject(new Error("clipboard denied")));
    const sendOutcome = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => ({
        ok: true as const,
        requestId: "request-rich-denied",
        format: "html" as const,
        payload: "<table></table>",
        plainPayload: ""
      }),
      sendOutcome,
      writeText,
      writeRich,
      nextRequestId: () => "request-rich-denied"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(writeRich).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(sendOutcome).toHaveBeenCalledWith(
      31,
      {
        type: "copy-table:outcome",
        requestId: "request-rich-denied",
        format: "html",
        status: "clipboard-failed"
      },
      0
    );
  });

  it("writes the HTML markup as text when no rich writer is available", async () => {
    const writeText = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => ({
        ok: true as const,
        requestId: "request-no-rich",
        format: "html" as const,
        payload: "<table></table>",
        plainPayload: ""
      }),
      writeText,
      nextRequestId: () => "request-no-rich"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9, frameId: 0 },
      { id: 31 }
    );

    expect(writeText).toHaveBeenCalledExactlyOnceWith("<table></table>");
  });

  it("does not notify for an injectable-page extraction failure", async () => {
    const inject = vi.fn(async () => undefined);
    const sendMessage = vi.fn(async () => ({
      ok: false as const,
      requestId: "request-no-table",
      format: "csv" as const,
      reason: "no-table" as const
    }));
    const sendOutcome = vi.fn(async () => undefined);
    const notify = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject,
      sendMessage,
      sendOutcome,
      notify,
      writeText,
      nextRequestId: () => "request-no-table"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(notify).not.toHaveBeenCalled();
    expect(sendOutcome).toHaveBeenCalledWith(
      31,
      {
        type: "copy-table:outcome",
        requestId: "request-no-table",
        format: "csv",
        status: "no-table"
      },
      7
    );
  });

  it("removes serialized payload from the response before waiting for feedback delivery", async () => {
    const response = {
      ok: true as const,
      requestId: "request-lifetime",
      format: "html" as const,
      payload: "private table text",
      plainPayload: "private table text",
      dimensions: { rows: 3, columns: 2 }
    };
    let releaseOutcome: (() => void) | undefined;
    const outcomePending = new Promise<void>((resolve) => {
      releaseOutcome = resolve;
    });
    const sendOutcome = vi.fn(async () => outcomePending);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => response,
      sendOutcome,
      writeText: async () => undefined,
      nextRequestId: () => "request-lifetime"
    });

    const operation = controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );
    await vi.waitFor(() => expect(sendOutcome).toHaveBeenCalledOnce());

    expect(response).not.toHaveProperty("payload");
    expect(response).not.toHaveProperty("plainPayload");
    // Counts are metadata, not table data, so they are not released.
    expect(response.dimensions).toEqual({ rows: 3, columns: 2 });
    releaseOutcome?.();
    await operation;
  });

  it("uses one fixed notification when extraction response delivery fails after injection", async () => {
    const sendOutcome = vi.fn(async () => undefined);
    const notify = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => Promise.reject(new Error("frame navigated")),
      sendOutcome,
      notify,
      writeText,
      nextRequestId: () => "request-delivery"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:csv", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(sendOutcome).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith({
      type: "basic",
      title: "Copy Table",
      message:
        "Copy Table could not deliver the result because the page became unavailable. Try again."
    });
  });

  it("releases the payload before fixed notification fallback when outcome delivery fails", async () => {
    const response = {
      ok: true as const,
      requestId: "request-outcome-delivery",
      format: "html" as const,
      payload: "private table text"
    };
    let payloadPresentWhenNotified: boolean | undefined;
    const notify = vi.fn(async () => {
      payloadPresentWhenNotified = "payload" in response;
    });
    const controller = createBrowserInteractionController({
      inject: async () => undefined,
      sendMessage: async () => response,
      sendOutcome: async () => Promise.reject(new Error("frame disappeared")),
      notify,
      writeText: async () => undefined,
      nextRequestId: () => "request-outcome-delivery"
    });

    await controller.handleMenuClick(
      { menuItemId: "copy-table:copy-as:html", targetElementId: 9, frameId: 7 },
      { id: 31 }
    );

    expect(notify).toHaveBeenCalledOnce();
    expect(payloadPresentWhenNotified).toBe(false);
    expect(notify).toHaveBeenCalledWith({
      type: "basic",
      title: "Copy Table",
      message:
        "Copy Table could not deliver the result because the page became unavailable. Try again."
    });
  });
});
