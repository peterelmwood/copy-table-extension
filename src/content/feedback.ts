import type { CopyOutcomeMessage, CopyOutcomeStatus, CopyFormat } from "../table/model";

const FEEDBACK_ATTRIBUTE = "data-copy-table-feedback";
const FEEDBACK_TIMEOUT_MS = 3_000;

/*
 * Blueprint: graphite ground, square corners, one steel rule carrying the
 * status. The toast stays a single text-only element so the extension injects
 * as little as possible into the page it was invoked on.
 */
const FEEDBACK_INK = "#22283a";
const FEEDBACK_ACCENT = "#6ba8d8";
const FEEDBACK_ALERT = "#e8a87c";

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

export function renderCopyOutcome(document_: Document, outcome: CopyOutcomeMessage): void {
  document_.querySelector(`[${FEEDBACK_ATTRIBUTE}]`)?.remove();

  const toast = document_.createElement("div");
  toast.setAttribute(FEEDBACK_ATTRIBUTE, "");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  toast.textContent = feedbackText(outcome);
  toast.style.cssText =
    `position:fixed;right:1rem;bottom:1rem;z-index:2147483647;max-width:24rem;` +
    `padding:0.6875rem 0.875rem;background:${FEEDBACK_INK};color:#ffffff;` +
    `border-radius:2px;border-left:3px solid ${feedbackRule(outcome)};` +
    `font:500 13px/1.45 system-ui,sans-serif;box-shadow:0 2px 10px rgba(15,18,26,0.28);`;
  document_.body.append(toast);

  globalThis.setTimeout(() => toast.remove(), FEEDBACK_TIMEOUT_MS);
}
