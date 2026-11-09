import { describe, expect, it, vi } from "vitest";
import {
  COPY_AS_MENU_ITEMS,
  createCopyAsMenus,
  formatFromMenuItemId
} from "../../src/browser/context-menu";

describe("Copy table as context menu", () => {
  it("creates the exact idempotent parent and child hierarchy", async () => {
    const removeAll = vi.fn(async () => undefined);
    const create = vi.fn();

    await createCopyAsMenus({ create, removeAll });

    expect(removeAll).toHaveBeenCalledOnce();
    expect(create.mock.calls.map(([item]) => item)).toEqual(COPY_AS_MENU_ITEMS);
  });

  it("does not expose extra actions or contexts", () => {
    expect(COPY_AS_MENU_ITEMS).toEqual([
      { id: "copy-table:copy-as", title: "Copy table as", contexts: ["all"] },
      { id: "copy-table:copy-as:html", parentId: "copy-table:copy-as", title: "HTML" },
      {
        id: "copy-table:copy-as:html-source",
        parentId: "copy-table:copy-as",
        title: "HTML source"
      },
      {
        id: "copy-table:copy-as:markdown",
        parentId: "copy-table:copy-as",
        title: "Markdown"
      },
      {
        id: "copy-table:copy-as:text",
        parentId: "copy-table:copy-as",
        title: "Plain text"
      },
      { id: "copy-table:copy-as:csv", parentId: "copy-table:copy-as", title: "CSV" },
      { id: "copy-table:copy-as:json", parentId: "copy-table:copy-as", title: "JSON" }
    ]);
  });

  it("maps every menu item ID back to its format and rejects unknown ones", () => {
    expect(formatFromMenuItemId("copy-table:copy-as:html")).toBe("html");
    expect(formatFromMenuItemId("copy-table:copy-as:html-source")).toBe("html-source");
    expect(formatFromMenuItemId("copy-table:copy-as:csv")).toBe("csv");
    expect(formatFromMenuItemId("copy-table:copy-as")).toBeNull();
    expect(formatFromMenuItemId("copy-table:copy-as:json")).toBe("json");
    expect(formatFromMenuItemId("copy-table:copy-as:xml")).toBeNull();
    expect(formatFromMenuItemId("copy-table:copy-as:html-sourcex")).toBeNull();
    expect(formatFromMenuItemId(42)).toBeNull();
  });
});
