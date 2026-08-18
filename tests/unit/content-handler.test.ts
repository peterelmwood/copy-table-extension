import { describe, expect, it, vi } from "vitest";
import { registerContentHandler } from "../../src/content/content-handler";

describe("content handler registration", () => {
  it("registers on Firefox runtime messaging and resolves targets through Firefox menus", () => {
    document.body.innerHTML = "<table id=clicked><tr><td id=cell>selected</td></tr></table>";
    const addListener = vi.fn();
    const getTargetElement = vi.fn(() => document.querySelector("#cell"));
    const browserApi = {
      runtime: { onMessage: { addListener } },
      menus: { getTargetElement }
    };

    registerContentHandler(browserApi, {});

    expect(addListener).toHaveBeenCalledOnce();
    const listener = addListener.mock.calls[0]?.[0] as (message: unknown) => unknown;
    expect(
      listener({
        type: "copy-table:extract",
        requestId: "request-1",
        targetElementId: 12,
        format: "html"
      })
    ).toEqual({
      ok: true,
      requestId: "request-1",
      format: "html",
      payload: '<table id="clicked"><tbody><tr><td id="cell">selected</td></tr></tbody></table>'
    });
    expect(getTargetElement).toHaveBeenCalledWith(12);
  });

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
});
