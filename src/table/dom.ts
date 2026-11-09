// Element checks that work across windows. A same-origin frame's nodes come
// from that frame's window, while a content script's interface objects
// (`Element`, `HTMLTableRowElement` and so on) belong to the window it was
// injected into, so a plain `instanceof` rejects them. The keyboard shortcut
// reads a focused same-origin frame from the top frame, so table code checks
// nodes against their own window's interfaces instead.

export function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

/** Whether `node` is the HTML element `<localName>`, whichever window it belongs to. */
export function isHtmlElement<K extends keyof HTMLElementTagNameMap>(
  node: Node,
  localName: K
): node is HTMLElementTagNameMap[K] {
  if (!isElement(node) || node.localName !== localName) {
    return false;
  }
  // HTMLElement excludes SVG and MathML elements that share a local name.
  const OwnHTMLElement = node.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
  return node instanceof OwnHTMLElement;
}
