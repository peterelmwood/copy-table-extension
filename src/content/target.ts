import { isAriaTableRoot } from "../table/extract-aria";
import type { CopyFailureReason } from "../table/model";

/** The table a copy reads: a semantic `<table>`, or an ARIA table, grid or treegrid. */
export type TableRoot =
  { kind: "table"; table: HTMLTableElement } | { kind: "aria"; table: Element };

export type TargetResolution =
  | ({ ok: true } & TableRoot)
  | { ok: false; reason: Extract<CopyFailureReason, "no-table" | "target-expired"> };

export type TargetElementLookup = (targetElementId: number) => Element | null;

export function resolveInteractionTarget(
  targetElementId: number,
  getTargetElement: TargetElementLookup
): TargetResolution {
  const target = getTargetElement(targetElementId);

  if (target === null) {
    return { ok: false, reason: "target-expired" };
  }

  // The closest root wins, whether it is a <table> or an ARIA root.
  for (let element: Element | null = target; element !== null; element = element.parentElement) {
    if (element.matches("table")) {
      return element instanceof HTMLTableElement
        ? { ok: true, kind: "table", table: element }
        : { ok: false, reason: "no-table" };
    }
    if (isAriaTableRoot(element)) {
      return { ok: true, kind: "aria", table: element };
    }
  }

  return { ok: false, reason: "no-table" };
}
