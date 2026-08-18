import type { CopyOutcomeMessage, CopyOutcomeStatus, CopyFormat } from "../table/model";

const FEEDBACK_ATTRIBUTE = "data-copy-table-feedback";
const FEEDBACK_TIMEOUT_MS = 3_000;

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

export function renderCopyOutcome(document_: Document, outcome: CopyOutcomeMessage): void {
  document_.querySelector(`[${FEEDBACK_ATTRIBUTE}]`)?.remove();

  const toast = document_.createElement("div");
  toast.setAttribute(FEEDBACK_ATTRIBUTE, "");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  toast.textContent = feedbackText(outcome);
  toast.style.cssText =
    "position:fixed;right:1rem;bottom:1rem;z-index:2147483647;max-width:24rem;padding:0.75rem 1rem;background:#1f2937;color:#fff;border-radius:0.25rem;font:14px system-ui,sans-serif;";
  document_.body.append(toast);

  globalThis.setTimeout(() => toast.remove(), FEEDBACK_TIMEOUT_MS);
}
