import {
  COPY_FORMATS,
  type CopyExtractRequest,
  type CopyExtractResponse,
  type CopyFormat,
  type CopyOutcomeMessage
} from "../table/model";

const COPY_FAILURE_REASONS = ["no-table", "target-expired", "invalid-table", "unexpected"] as const;
const COPY_OUTCOME_STATUSES = [
  "copied",
  "no-table",
  "target-expired",
  "invalid-table",
  "unexpected",
  "restricted-page",
  "clipboard-failed"
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => expectedKeys.includes(key));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isCopyTableDimensions(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["rows", "columns"]) &&
    isCount(value.rows) &&
    isCount(value.columns)
  );
}

export function isCopyFormat(value: unknown): value is CopyFormat {
  return typeof value === "string" && COPY_FORMATS.includes(value as CopyFormat);
}

export function isCopyExtractRequest(value: unknown): value is CopyExtractRequest {
  if (
    !isRecord(value) ||
    value.type !== "copy-table:extract" ||
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    !isCopyFormat(value.format)
  ) {
    return false;
  }

  // Exactly one of two targeting shapes: the context menu's element ID, or the
  // keyboard shortcut's selection source. Never both, never neither.
  if ("targetElementId" in value) {
    return (
      hasOnlyKeys(value, ["type", "requestId", "targetElementId", "format"]) &&
      typeof value.targetElementId === "number" &&
      Number.isInteger(value.targetElementId) &&
      value.targetElementId >= 0
    );
  }

  return (
    hasOnlyKeys(value, ["type", "requestId", "targetSource", "format"]) &&
    value.targetSource === "selection"
  );
}

export function isCopyExtractResponse(value: unknown): value is CopyExtractResponse {
  if (!isRecord(value) || typeof value.requestId !== "string" || !isCopyFormat(value.format)) {
    return false;
  }

  if (value.ok === true) {
    if (
      !hasOnlyKeys(value, ["ok", "requestId", "format", "payload", "plainPayload", "dimensions"]) ||
      typeof value.payload !== "string" ||
      ("dimensions" in value && !isCopyTableDimensions(value.dimensions))
    ) {
      return false;
    }
    // Only an HTML copy carries a second, plain-text representation.
    return (
      !("plainPayload" in value) ||
      (value.format === "html" && typeof value.plainPayload === "string")
    );
  }

  return (
    value.ok === false &&
    hasOnlyKeys(value, ["ok", "requestId", "format", "reason"]) &&
    typeof value.reason === "string" &&
    COPY_FAILURE_REASONS.includes(value.reason as (typeof COPY_FAILURE_REASONS)[number])
  );
}

export function isCopyOutcomeMessage(value: unknown): value is CopyOutcomeMessage {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["type", "requestId", "format", "status", "dimensions"]) &&
    value.type === "copy-table:outcome" &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0 &&
    isCopyFormat(value.format) &&
    typeof value.status === "string" &&
    COPY_OUTCOME_STATUSES.includes(value.status as (typeof COPY_OUTCOME_STATUSES)[number]) &&
    // Only a successful copy reports the table's size.
    (!("dimensions" in value) ||
      (value.status === "copied" && isCopyTableDimensions(value.dimensions)))
  );
}
