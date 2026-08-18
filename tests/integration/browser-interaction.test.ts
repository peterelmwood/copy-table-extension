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
});
