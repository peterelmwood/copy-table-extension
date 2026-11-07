export interface RichClipboardContent {
  /** Markup for rich-text targets (spreadsheets, documents, email). */
  html: string;
  /** Fallback for plain-text targets such as terminals and code editors. */
  text: string;
}

export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
  /** Writes one clipboard item carrying both `text/html` and `text/plain`. */
  writeRich(content: RichClipboardContent): Promise<void>;
}

type ClipboardItemConstructor = new (items: Record<string, Blob>) => ClipboardItem;

export function createClipboardWriter(
  clipboard: Pick<Clipboard, "writeText"> & Partial<Pick<Clipboard, "write">>,
  // `null` means "not supported"; tests pass it explicitly.
  ClipboardItemClass: ClipboardItemConstructor | null | undefined = globalThis.ClipboardItem
): ClipboardWriter {
  return {
    writeText: (text) => clipboard.writeText(text),
    writeRich: ({ html, text }) => {
      if (typeof clipboard.write !== "function" || typeof ClipboardItemClass !== "function") {
        // Firefox releases without the async ClipboardItem API keep the
        // original behaviour: the markup as plain text.
        return clipboard.writeText(html);
      }
      return clipboard.write([
        new ClipboardItemClass({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" })
        })
      ]);
    }
  };
}
