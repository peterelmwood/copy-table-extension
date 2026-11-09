import type { CopyFormat } from "../table/model";

/**
 * Keyboard shortcuts declared under `commands` in `src/manifest.json`, mapped
 * to the format each one copies. Users can remap them at about:addons →
 * Manage Extension Shortcuts; the command names stay the same.
 */
const COMMAND_FORMATS: Readonly<Record<string, CopyFormat>> = {
  "copy-table-csv": "csv"
};

/** The shortcut always starts in the tab's top-level document. */
export const TOP_FRAME_ID = 0;

export function formatFromCommand(command: unknown): CopyFormat | null {
  return typeof command === "string" && Object.hasOwn(COMMAND_FORMATS, command)
    ? (COMMAND_FORMATS[command] ?? null)
    : null;
}
