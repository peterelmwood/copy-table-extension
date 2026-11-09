import { describe, expect, it, vi } from "vitest";
import { createClipboardWriter } from "../../src/browser/clipboard";

class RecordingClipboardItem {
  constructor(readonly items: Record<string, Blob>) {}
}

function asClipboardItemClass(): new (items: Record<string, Blob>) => ClipboardItem {
  return RecordingClipboardItem as unknown as new (items: Record<string, Blob>) => ClipboardItem;
}

describe("clipboard writer", () => {
  it("writes plain text through writeText", async () => {
    const clipboard = { writeText: vi.fn(async () => undefined), write: vi.fn() };
    await createClipboardWriter(clipboard, asClipboardItemClass()).writeText("a,b");

    expect(clipboard.writeText).toHaveBeenCalledWith("a,b");
    expect(clipboard.write).not.toHaveBeenCalled();
  });

  it("writes one clipboard item carrying both text/html and text/plain", async () => {
    const clipboard = {
      writeText: vi.fn(),
      write: vi.fn(async (_items: ClipboardItem[]) => undefined)
    };
    await createClipboardWriter(clipboard, asClipboardItemClass()).writeRich({
      html: "<table><tbody><tr><td>A</td></tr></tbody></table>",
      text: "A"
    });

    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(clipboard.write).toHaveBeenCalledTimes(1);
    const items = (clipboard.write.mock.calls[0]?.[0] ?? []) as unknown as RecordingClipboardItem[];
    expect(items).toHaveLength(1);
    const representations = items[0]?.items ?? {};
    expect(Object.keys(representations).sort()).toEqual(["text/html", "text/plain"]);
    expect(await representations["text/html"]?.text()).toBe(
      "<table><tbody><tr><td>A</td></tr></tbody></table>"
    );
    expect(representations["text/html"]?.type).toBe("text/html");
    expect(await representations["text/plain"]?.text()).toBe("A");
    expect(representations["text/plain"]?.type).toBe("text/plain");
  });

  it("propagates a rejected rich write without retrying or falling back", async () => {
    const clipboard = {
      writeText: vi.fn(),
      write: vi.fn(async () => Promise.reject(new Error("clipboard denied")))
    };

    await expect(
      createClipboardWriter(clipboard, asClipboardItemClass()).writeRich({ html: "<b>", text: "b" })
    ).rejects.toThrow("clipboard denied");
    expect(clipboard.write).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it.each([
    ["ClipboardItem is unavailable", { write: vi.fn() }, null],
    ["clipboard.write is unavailable", {}, asClipboardItemClass()]
  ] as const)(
    "falls back to the markup as plain text when %s",
    async (_case, extraApi, ClipboardItemClass) => {
      const clipboard = { writeText: vi.fn(async () => undefined), ...extraApi };
      await createClipboardWriter(clipboard, ClipboardItemClass).writeRich({
        html: "<table></table>",
        text: ""
      });

      expect(clipboard.writeText).toHaveBeenCalledWith("<table></table>");
    }
  );
});
