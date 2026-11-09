import type { CopyOutcomeMessage, CopyOutcomeStatus, CopyFormat } from "../table/model";

const FEEDBACK_ATTRIBUTE = "data-copy-table-feedback";
const FEEDBACK_TIMEOUT_MS = 3_000;

/*
 * A custom element name, so page selectors such as `div` or `div[role=status]`
 * never match the host. It is never registered: an unregistered valid custom
 * element name is a plain HTMLElement that can still host a shadow root.
 */
const FEEDBACK_HOST_TAG = "copy-table-feedback";

/*
 * Blueprint: graphite ground, square corners, one steel rule carrying the
 * status. The toast stays a single text-only element so the extension injects
 * as little as possible into the page it was invoked on.
 */
const FEEDBACK_INK = "#22283a";
const FEEDBACK_ACCENT = "#6ba8d8";
const FEEDBACK_ALERT = "#e8a87c";

/*
 * The host is the only node page CSS can reach. `all: initial` drops every
 * inherited and page-assigned property, and inline `!important` declarations
 * beat author-stylesheet `!important` rules aimed at the host. Lengths are in
 * px so a page's root font size can't resize the toast.
 */
const HOST_STYLE = [
  "all:initial",
  "display:block",
  "position:fixed",
  "right:16px",
  "bottom:16px",
  "z-index:2147483647",
  "max-width:384px"
]
  .map((declaration) => `${declaration}!important;`)
  .join("");

/*
 * The live region sits inside the closed shadow root, where page selectors
 * can't match it, and inherits only from the host, which `all: initial` has
 * reset. Styles go through the CSSOM rather than a `<style>` element or a
 * style attribute, so a page's Content-Security-Policy can't block them.
 */
function toastStyle(rule: string): string {
  return (
    `display:block;box-sizing:border-box;margin:0;padding:11px 14px;` +
    `background:${FEEDBACK_INK};color:#ffffff;color-scheme:light;` +
    `border:0;border-left:3px solid ${rule};border-radius:2px;` +
    `font:500 13px/1.45 system-ui,sans-serif;letter-spacing:normal;word-spacing:normal;` +
    `text-align:start;text-transform:none;white-space:normal;overflow-wrap:break-word;` +
    `box-shadow:0 2px 10px rgba(15,18,26,0.28);`
  );
}

const FORMAT_LABELS: Record<CopyFormat, string> = {
  html: "HTML",
  markdown: "Markdown",
  text: "Plain text",
  csv: "CSV"
};

const FAILURE_MESSAGES: Record<Exclude<CopyOutcomeStatus, "copied">, string> = {
  "no-table": "No table found at the selected location.",
  "target-expired": "The selected table is no longer available. Try again.",
  "invalid-table": "This table could not be copied. Try again.",
  unexpected: "Copy failed. Try again.",
  "restricted-page": "This page cannot be accessed.",
  "clipboard-failed": "Clipboard access failed. Try again."
};

function feedbackText(outcome: CopyOutcomeMessage): string {
  if (outcome.status === "copied") {
    return `Copied as ${FORMAT_LABELS[outcome.format]}.`;
  }

  return FAILURE_MESSAGES[outcome.status];
}

function feedbackRule(outcome: CopyOutcomeMessage): string {
  return outcome.status === "copied" ? FEEDBACK_ACCENT : FEEDBACK_ALERT;
}

/**
 * Shows the outcome as a short-lived toast inside a closed shadow root, so the
 * page's CSS can neither hide nor restyle it. Returns the live-region element
 * that holds the text (the page can't reach it), or `null` when the document
 * has nowhere to put a toast. Never throws: the clipboard is already written.
 */
export function renderCopyOutcome(
  document_: Document,
  outcome: CopyOutcomeMessage
): HTMLElement | null {
  try {
    document_.querySelectorAll(`[${FEEDBACK_ATTRIBUTE}]`).forEach((existing) => existing.remove());

    // Frameset and XML/SVG documents may have no body; fall back to the root.
    const parent = document_.body ?? document_.documentElement;
    if (!parent) {
      return null;
    }

    // In a non-XHTML XML document (such as SVG) this is not an HTML element,
    // so it can neither host a shadow root nor render as a box: attachShadow
    // throws and the toast is skipped.
    const host = document_.createElement(FEEDBACK_HOST_TAG);
    host.setAttribute(FEEDBACK_ATTRIBUTE, "");
    host.style.cssText = HOST_STYLE;
    const shadow = host.attachShadow({ mode: "closed" });

    const toast = document_.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    toast.style.cssText = toastStyle(feedbackRule(outcome));
    toast.textContent = feedbackText(outcome);
    shadow.append(toast);
    parent.append(host);

    globalThis.setTimeout(() => host.remove(), FEEDBACK_TIMEOUT_MS);
    return toast;
  } catch {
    return null;
  }
}
