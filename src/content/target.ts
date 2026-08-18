import type { CopyFailureReason } from "../table/model";

export type TargetResolution =
  | { ok: true; table: HTMLTableElement }
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

  const table = target.closest("table");
  if (!(table instanceof HTMLTableElement)) {
    return { ok: false, reason: "no-table" };
  }

  return { ok: true, table };
}
