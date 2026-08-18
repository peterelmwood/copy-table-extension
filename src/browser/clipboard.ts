export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

export function createClipboardWriter(clipboard: Pick<Clipboard, "writeText">): ClipboardWriter {
  return { writeText: (text) => clipboard.writeText(text) };
}
