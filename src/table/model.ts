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

export type LogicalTableSection = "head" | "body" | "foot";

export type LogicalTableScope = "row" | "col" | "rowgroup" | "colgroup";

export interface LogicalTableOriginCell {
  kind: "origin";
  text: string;
  inline: readonly SafeInline[];
  isHeader: boolean;
  scope: LogicalTableScope | null;
  sourceRow: number;
  sourceColumn: number;
  rowSpan: number;
  columnSpan: number;
}

export interface LogicalTableCoveredCell {
  kind: "covered";
  text: "";
  ownerRow: number;
  ownerColumn: number;
}

export interface LogicalTableEmptyCell {
  kind: "empty";
  text: "";
}

export type LogicalTableCell =
  LogicalTableOriginCell | LogicalTableCoveredCell | LogicalTableEmptyCell;

export interface LogicalTableRow {
  section: LogicalTableSection;
  rowGroupIndex: number;
  cells: readonly LogicalTableCell[];
}

export interface LogicalTable {
  caption: readonly SafeInline[] | null;
  captionText: string | null;
  rows: readonly LogicalTableRow[];
  columnCount: number;
  headerRowIndexes: readonly number[];
}

export interface SafeInlineText {
  type: "text";
  value: string;
}

export interface SafeInlineLink {
  type: "link";
  href: string;
  children: readonly SafeInline[];
}

export interface SafeInlineBreak {
  type: "break";
}

export type SafeInline = SafeInlineText | SafeInlineLink | SafeInlineBreak;
