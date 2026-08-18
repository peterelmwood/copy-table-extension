import type { SafeInline } from "./model";

const EXCLUDED_ELEMENTS = new Set([
  "AUDIO",
  "BASE",
  "BUTTON",
  "CANVAS",
  "DATALIST",
  "EMBED",
  "FORM",
  "IFRAME",
  "INPUT",
  "LINK",
  "META",
  "NOSCRIPT",
  "OBJECT",
  "OPTION",
  "PARAM",
  "SCRIPT",
  "SELECT",
  "STYLE",
  "SVG",
  "TABLE",
  "TEMPLATE",
  "TEXTAREA",
  "TITLE",
  "TRACK",
  "VIDEO"
]);

const BLOCK_ELEMENTS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "UL"
]);

function isRenderedSubtree(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (view === null) {
    return true;
  }

  let current: Element | null = element;
  while (current !== null) {
    const style = view.getComputedStyle(current);
    const opacity = Number.parseFloat(style.opacity);
    if (
      style.display.toLowerCase() === "none" ||
      opacity === 0 ||
      style.getPropertyValue("content-visibility").toLowerCase() === "hidden"
    ) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

function hasVisibleComputedVisibility(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (view === null) {
    return true;
  }

  const visibility = view.getComputedStyle(element).visibility.toLowerCase();
  return visibility !== "hidden" && visibility !== "collapse";
}

function appendText(tokens: SafeInline[], value: string): void {
  const normalized = value.replace(/[\t\n\f\r ]+/gu, " ");
  if (normalized.length === 0) {
    return;
  }

  const previous = tokens.at(-1);
  if (previous?.type === "text") {
    previous.value = `${previous.value}${normalized}`.replace(/ {2,}/gu, " ");
    return;
  }

  tokens.push({ type: "text", value: normalized });
}

function appendBreak(tokens: SafeInline[]): void {
  const previous = tokens.at(-1);
  if (previous?.type === "text") {
    previous.value = previous.value.trimEnd();
  }
  if (tokens.at(-1)?.type !== "break") {
    tokens.push({ type: "break" });
  }
}

function appendTokens(target: SafeInline[], additions: readonly SafeInline[]): void {
  for (const token of additions) {
    if (token.type === "text") {
      appendText(target, token.value);
    } else if (token.type === "break") {
      appendBreak(target);
    } else {
      target.push(token);
    }
  }
}

function mergeTokens(tokens: readonly SafeInline[]): SafeInline[] {
  const normalized: SafeInline[] = [];
  appendTokens(normalized, tokens);
  return normalized;
}

function normalizeTokens(tokens: SafeInline[]): readonly SafeInline[] {
  const normalized = mergeTokens(tokens);

  while (normalized[0]?.type === "break") {
    normalized.shift();
  }
  while (normalized.at(-1)?.type === "break") {
    normalized.pop();
  }

  while (normalized[0]?.type === "text") {
    normalized[0].value = normalized[0].value.trimStart();
    if (normalized[0].value.length > 0) {
      break;
    }
    normalized.shift();
  }

  while (normalized.at(-1)?.type === "text") {
    const last = normalized.at(-1);
    if (last?.type !== "text") {
      break;
    }
    last.value = last.value.trimEnd();
    if (last.value.length > 0) {
      break;
    }
    normalized.pop();
  }

  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index]?.type !== "break") {
      continue;
    }

    const before = normalized[index - 1];
    const after = normalized[index + 1];
    if (before?.type === "text") {
      before.value = before.value.trimEnd();
    }
    if (after?.type === "text") {
      after.value = after.value.trimStart();
    }
  }

  return normalized.filter((token) => token.type !== "text" || token.value.length > 0);
}

export function sanitizeLinkHref(href: string): string | null {
  const candidate = href.trim();
  if (candidate.length === 0 || /[\u0000-\u001f\u007f\\]/u.test(candidate)) {
    return null;
  }

  if (candidate.startsWith("#") || candidate.startsWith("?")) {
    return candidate;
  }

  try {
    const hasExplicitScheme = /^[a-z][a-z\d+.-]*:/iu.test(candidate);
    if (hasExplicitScheme) {
      const parsed = new URL(candidate);
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) {
        return null;
      }
      if (parsed.protocol === "mailto:" && candidate.toLowerCase() === "mailto:") {
        return null;
      }
    } else if (candidate.startsWith("//")) {
      const parsed = new URL(`https:${candidate}`);
      if (parsed.protocol !== "https:") {
        return null;
      }
    }

    return candidate;
  } catch {
    return null;
  }
}

function collectNode(node: Node, tokens: SafeInline[], parentVisibilityIsVisible: boolean): void {
  if (node.nodeType === Node.TEXT_NODE) {
    if (parentVisibilityIsVisible) {
      appendText(tokens, node.nodeValue ?? "");
    }
    return;
  }
  if (
    !(node instanceof Element) ||
    !isRenderedSubtree(node) ||
    EXCLUDED_ELEMENTS.has(node.tagName)
  ) {
    return;
  }

  const visibilityIsVisible = hasVisibleComputedVisibility(node);

  if (node.tagName === "BR") {
    if (visibilityIsVisible) {
      appendBreak(tokens);
    }
    return;
  }

  if (node.tagName === "IMG") {
    if (visibilityIsVisible) {
      appendText(tokens, node.getAttribute("alt") ?? "");
    }
    return;
  }

  const children: SafeInline[] = [];
  for (const child of node.childNodes) {
    collectNode(child, children, visibilityIsVisible);
  }
  const normalizedChildren = mergeTokens(children);

  if (node.tagName === "A") {
    const href = sanitizeLinkHref(node.getAttribute("href") ?? "");
    if (href !== null && normalizedChildren.length > 0) {
      tokens.push({ type: "link", href, children: normalizedChildren });
      return;
    }
  }

  if (BLOCK_ELEMENTS.has(node.tagName)) {
    appendBreak(tokens);
    appendTokens(tokens, normalizedChildren);
    appendBreak(tokens);
    return;
  }

  appendTokens(tokens, normalizedChildren);
}

export function extractSafeInline(root: Element): readonly SafeInline[] {
  if (!isRenderedSubtree(root)) {
    return [];
  }

  const tokens: SafeInline[] = [];
  const rootVisibilityIsVisible = hasVisibleComputedVisibility(root);
  for (const child of root.childNodes) {
    collectNode(child, tokens, rootVisibilityIsVisible);
  }
  return normalizeTokens(tokens);
}

export function safeInlineText(tokens: readonly SafeInline[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        return token.value;
      }
      if (token.type === "break") {
        return "\n";
      }
      return safeInlineText(token.children);
    })
    .join("");
}
