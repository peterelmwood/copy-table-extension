export const COPY_FORMATS = ["html", "markdown", "text", "csv"] as const;

export type CopyFormat = (typeof COPY_FORMATS)[number];

export type CopyFailureReason = "no-table" | "target-expired" | "invalid-table" | "unexpected";

export type CopyOutcomeStatus =
  "copied" | CopyFailureReason | "restricted-page" | "clipboard-failed";

export interface CopyExtractRequest {
  type: "copy-table:extract";
  requestId: string;
  targetElementId: number;
  format: CopyFormat;
}

export interface CopyExtractSuccess {
  ok: true;
  requestId: string;
  format: CopyFormat;
  payload: string;
}

export interface CopyExtractFailure {
  ok: false;
  requestId: string;
  format: CopyFormat;
  reason: CopyFailureReason;
}

export type CopyExtractResponse = CopyExtractSuccess | CopyExtractFailure;

export interface CopyOutcomeMessage {
  type: "copy-table:outcome";
  requestId: string;
  format: CopyFormat;
  status: CopyOutcomeStatus;
}

export interface LogicalTableCell {
  text: string;
  isHeader: boolean;
}

export interface LogicalTableRow {
  cells: readonly LogicalTableCell[];
}

export interface LogicalTable {
  caption: string | null;
  rows: readonly LogicalTableRow[];
}

export interface SafeInlineText {
  type: "text";
  value: string;
}

export interface SafeInlineLink {
  type: "link";
  text: string;
  href: string;
}

export type SafeInline = SafeInlineText | SafeInlineLink;
