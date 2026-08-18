import { describe, expect, it, vi } from "vitest";
import { registerContentHandler } from "../../src/content/content-handler";

type FirefoxRuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];

async function deliverThroughFirefoxRuntime(
  listener: FirefoxRuntimeMessageListener,
  message: unknown
): Promise<unknown> {
  const returned: unknown = listener(message, {}, () => {
    throw new Error("The content handler must not use sendResponse.");
  });

  if (returned instanceof Promise) {
    return returned;
  }
  if (returned === undefined || returned === false) {
    return undefined;
  }
  throw new Error("Firefox does not transport a synchronous response object.");
}

describe("content handler registration", () => {
  it("returns extraction responses through Firefox's Promise transport", async () => {
    document.body.innerHTML = "<table id=clicked><tr><td id=cell>selected</td></tr></table>";
    const addListener = vi.fn();
    const getTargetElement = vi.fn(() => document.querySelector("#cell"));
    const browserApi = {
      runtime: { onMessage: { addListener } },
      menus: { getTargetElement }
    };

    registerContentHandler(browserApi, {});

    expect(addListener).toHaveBeenCalledOnce();
    const listener = addListener.mock.calls[0]?.[0] as FirefoxRuntimeMessageListener;
    expect(
      await deliverThroughFirefoxRuntime(listener, {
        type: "copy-table:extract",
        requestId: "request-1",
        targetElementId: 12,
        format: "html"
      })
    ).toEqual({
      ok: true,
      requestId: "request-1",
      format: "html",
      payload: "<table><tbody><tr><td>selected</td></tr></tbody></table>"
    });
    expect(getTargetElement).toHaveBeenCalledWith(12);
  });

  it.each([
    ["html", "<table><tbody><tr><th>Header</th></tr><tr><td>Value</td></tr></tbody></table>"],
    ["markdown", "| Header |\n| --- |\n| Value |"],
    ["text", "Header\nValue"],
    ["csv", "Header\r\nValue"]
  ] as const)(
    "uses the requested %s serializer through the default content boundary",
    async (format, payload) => {
      document.body.innerHTML =
        "<table><tr><th id=cell>Header</th></tr><tr><td>Value</td></tr></table>";
      const handler = registerableHandler(() => document.querySelector("#cell"));

      expect(
        await deliverThroughFirefoxRuntime(handler, {
          type: "copy-table:extract",
          requestId: "request-format",
          targetElementId: 4,
          format
        })
      ).toEqual({
        ok: true,
        requestId: "request-format",
        format,
        payload
      });
    }
  );

  it("installs one listener across repeated one-off injections into the same frame", () => {
    const addListener = vi.fn();
    const browserApi = {
      runtime: { onMessage: { addListener } },
      menus: { getTargetElement: () => null }
    };
    const frameGlobal = {};

    registerContentHandler(browserApi, frameGlobal);
    registerContentHandler(browserApi, frameGlobal);

    expect(addListener).toHaveBeenCalledOnce();
  });

  it("renders a payload-free outcome without looking up a page target", async () => {
    const addListener = vi.fn();
    const getTargetElement = vi.fn(() => null);
    registerContentHandler(
      {
        runtime: { onMessage: { addListener } },
        menus: { getTargetElement }
      },
      {}
    );
    const listener = addListener.mock.calls[0]?.[0] as FirefoxRuntimeMessageListener;

    expect(
      await deliverThroughFirefoxRuntime(listener, {
        type: "copy-table:outcome",
        requestId: "request-outcome",
        format: "markdown",
        status: "clipboard-failed"
      })
    ).toBeUndefined();
    expect(getTargetElement).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Clipboard access failed. Try again.");
  });

  it("does not reserve a response for unrelated messages", async () => {
    const addListener = vi.fn();
    const getTargetElement = vi.fn(() => null);
    registerContentHandler(
      {
        runtime: { onMessage: { addListener } },
        menus: { getTargetElement }
      },
      {}
    );
    const listener = addListener.mock.calls[0]?.[0] as FirefoxRuntimeMessageListener;

    await expect(deliverThroughFirefoxRuntime(listener, { type: "unrelated" })).resolves.toBe(
      undefined
    );
    expect(getTargetElement).not.toHaveBeenCalled();
  });
});

function registerableHandler(getTargetElement: (targetElementId: number) => Element | null) {
  const addListener = vi.fn();
  registerContentHandler(
    {
      runtime: { onMessage: { addListener } },
      menus: { getTargetElement }
    },
    {}
  );
  return addListener.mock.calls[0]?.[0] as FirefoxRuntimeMessageListener;
}
