import { COPY_FORMATS, type CopyFormat } from "../table/model";

const COPY_AS_PARENT_ID = "copy-table:copy-as";

export const COPY_AS_MENU_ITEMS = [
  { id: COPY_AS_PARENT_ID, title: "Copy table as", contexts: ["all"] },
  { id: "copy-table:copy-as:html", parentId: COPY_AS_PARENT_ID, title: "Rich text" },
  {
    id: "copy-table:copy-as:html-source",
    parentId: COPY_AS_PARENT_ID,
    title: "HTML code"
  },
  { id: "copy-table:copy-as:markdown", parentId: COPY_AS_PARENT_ID, title: "Markdown" },
  { id: "copy-table:copy-as:text", parentId: COPY_AS_PARENT_ID, title: "Plain text" },
  { id: "copy-table:copy-as:csv", parentId: COPY_AS_PARENT_ID, title: "CSV" },
  { id: "copy-table:copy-as:json", parentId: COPY_AS_PARENT_ID, title: "JSON" }
] as const;

export interface ContextMenuApi {
  removeAll(): Promise<void>;
  create(item: (typeof COPY_AS_MENU_ITEMS)[number]): void;
}

export async function createCopyAsMenus(api: ContextMenuApi): Promise<void> {
  await api.removeAll();
  COPY_AS_MENU_ITEMS.forEach((item) => api.create(item));
}

export function formatFromMenuItemId(menuItemId: unknown): CopyFormat | null {
  if (typeof menuItemId !== "string") {
    return null;
  }

  const format = menuItemId.slice("copy-table:copy-as:".length);
  return menuItemId.startsWith("copy-table:copy-as:") &&
    (COPY_FORMATS as readonly string[]).includes(format)
    ? (format as CopyFormat)
    : null;
}
