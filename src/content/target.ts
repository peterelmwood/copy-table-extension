import { isHtmlElement } from "../table/dom";
import type { CopyFailureReason } from "../table/model";

export type TargetResolution =
  | { ok: true; table: HTMLTableElement }
  | { ok: false; reason: Extract<CopyFailureReason, "no-table" | "target-expired"> };

export type TargetElementLookup = (targetElementId: number) => Element | null;

/** Resolves the nearest semantic table containing a live page element. */
export function resolveTableTarget(target: Element): TargetResolution {
  const table = target.closest("table");
  // Not `instanceof`: the element may belong to a same-origin frame's window.
  if (table === null || !isHtmlElement(table, "table")) {
    return { ok: false, reason: "no-table" };
  }

  return { ok: true, table };
}

export function resolveInteractionTarget(
  targetElementId: number,
  getTargetElement: TargetElementLookup
): TargetResolution {
  const target = getTargetElement(targetElementId);

  if (target === null) {
    return { ok: false, reason: "target-expired" };
  }

  return resolveTableTarget(target);
}
