import { describe, expect, it, vi } from "vitest";
import { createBrowserInteractionController } from "../../src/background";

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
      payload: "private table text"
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
      payload: "private table text"
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
