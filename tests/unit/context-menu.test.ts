import { describe, expect, it, vi } from "vitest";
import { COPY_AS_MENU_ITEMS, createCopyAsMenus } from "../../src/browser/context-menu";

describe("Copy as context menu", () => {
  it("creates the exact idempotent parent and child hierarchy", async () => {
    const removeAll = vi.fn(async () => undefined);
    const create = vi.fn();

    await createCopyAsMenus({ create, removeAll });

    expect(removeAll).toHaveBeenCalledOnce();
    expect(create.mock.calls.map(([item]) => item)).toEqual(COPY_AS_MENU_ITEMS);
  });

  it("does not expose extra actions or contexts", () => {
    expect(COPY_AS_MENU_ITEMS).toEqual([
      { id: "copy-table:copy-as", title: "Copy as", contexts: ["all"] },
      { id: "copy-table:copy-as:html", parentId: "copy-table:copy-as", title: "HTML" },
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
      { id: "copy-table:copy-as:csv", parentId: "copy-table:copy-as", title: "CSV" }
    ]);
  });
});
