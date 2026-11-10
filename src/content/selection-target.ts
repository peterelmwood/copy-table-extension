import { resolveTableTarget, type TargetResolution } from "./target";

const FRAME_ELEMENT_NAMES = new Set(["iframe", "frame"]);

function elementOf(node: Node | null): Element | null {
  if (node === null) {
    return null;
  }
  // A text node's element is its parent; Element nodes are their own.
  return node.nodeType === 1 ? (node as Element) : node.parentElement;
}

function isRootish(element: Element, document: Document): boolean {
  return element === document.body || element === document.documentElement;
}

/**
 * The document of a same-origin frame, or `null` when it can't be reached.
 * Cross-origin frames report no `contentDocument` (or throw), and are never
 * read further.
 */
function reachableFrameDocument(element: Element): Document | null {
  if (!FRAME_ELEMENT_NAMES.has(element.localName)) {
    return null;
  }
  try {
    return (element as HTMLIFrameElement).contentDocument ?? null;
  } catch {
    return null;
  }
}

/**
 * Finds the element the keyboard shortcut should act on in `document`:
 *
 * 1. If focus sits on a frame, descend into it when it is same-origin. Focus
 *    in a cross-origin frame yields nothing: that frame isn't touched, and the
 *    table around the frame element isn't what the user meant.
 * 2. Otherwise a non-empty selection wins, through its anchor node.
 * 3. Otherwise a focused element (a link or control reached with Tab).
 * 4. Otherwise a collapsed selection: the caret a click leaves behind.
 */
export function findSelectionOrFocusElement(document: Document): Element | null {
  const active = document.activeElement;
  if (active !== null && FRAME_ELEMENT_NAMES.has(active.localName)) {
    const frameDocument = reachableFrameDocument(active);
    return frameDocument === null ? null : findSelectionOrFocusElement(frameDocument);
  }

  const selection = document.getSelection();
  const anchor = selection !== null && selection.rangeCount > 0 ? selection.anchorNode : null;

  if (anchor !== null && selection?.isCollapsed === false) {
    return elementOf(anchor);
  }

  if (active !== null && !isRootish(active, document)) {
    return active;
  }

  return elementOf(anchor);
}

/** Resolves the table holding the selection or focus; anything else is `no-table`. */
export function resolveSelectionTarget(document: Document): TargetResolution {
  const element = findSelectionOrFocusElement(document);
  if (element === null) {
    return { ok: false, reason: "no-table" };
  }
  return resolveTableTarget(element);
}
