import { describe, expect, it } from "vitest";
import {
  isCopyExtractRequest,
  isCopyExtractResponse,
  isCopyOutcomeMessage
} from "../../src/browser/messages";

describe("browser message guards", () => {
  it("accepts a complete extraction request for a supported copy format", () => {
    expect(
      isCopyExtractRequest({
        type: "copy-table:extract",
        requestId: "request-1",
        targetElementId: 42,
        format: "csv"
      })
    ).toBe(true);
  });

  it("rejects malformed requests before page access", () => {
    expect(isCopyExtractRequest(null)).toBe(false);
    expect(isCopyExtractRequest({ type: "copy-table:extract", requestId: "request-1" })).toBe(
      false
    );
    expect(
      isCopyExtractRequest({
        type: "copy-table:extract",
        requestId: "request-1",
        targetElementId: -1,
        format: "csv"
      })
    ).toBe(false);
  });

  it("rejects failure responses that leak a payload", () => {
    expect(
      isCopyExtractResponse({
        ok: false,
        requestId: "request-1",
        format: "html",
        reason: "no-table"
      })
    ).toBe(true);
    expect(
      isCopyExtractResponse({
        ok: false,
        requestId: "request-1",
        format: "html",
        reason: "no-table",
        payload: "private table text"
      })
    ).toBe(false);
  });

  it("accepts payload-free outcomes only", () => {
    expect(
      isCopyOutcomeMessage({
        type: "copy-table:outcome",
        requestId: "request-1",
        format: "text",
        status: "copied"
      })
    ).toBe(true);
    expect(
      isCopyOutcomeMessage({
        type: "copy-table:outcome",
        requestId: "request-1",
        format: "text",
        status: "copied",
        payload: "private table text"
      })
    ).toBe(false);
  });
});
