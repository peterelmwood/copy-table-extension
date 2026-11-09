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

  it("accepts a plain-text companion payload only on HTML successes", () => {
    const success = { ok: true, requestId: "request-1", payload: "<table></table>" };

    expect(isCopyExtractResponse({ ...success, format: "html", plainPayload: "A\tB" })).toBe(true);
    expect(isCopyExtractResponse({ ...success, format: "html" })).toBe(true);
    expect(isCopyExtractResponse({ ...success, format: "csv", plainPayload: "A,B" })).toBe(false);
    expect(isCopyExtractResponse({ ...success, format: "html-source", plainPayload: "A\tB" })).toBe(
      false
    );
    expect(isCopyExtractResponse({ ...success, format: "html-source" })).toBe(true);
    expect(isCopyExtractResponse({ ...success, format: "html", plainPayload: 42 })).toBe(false);
    expect(isCopyExtractResponse({ ...success, format: "html", plainPayload: undefined })).toBe(
      false
    );
    expect(
      isCopyExtractResponse({
        ok: false,
        requestId: "request-1",
        format: "html",
        reason: "no-table",
        plainPayload: "private table text"
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

  describe("table dimensions", () => {
    const success = { ok: true, requestId: "request-1", format: "csv", payload: "A,B" };
    const copiedOutcome = {
      type: "copy-table:outcome",
      requestId: "request-1",
      format: "csv",
      status: "copied"
    };
    const invalidDimensions: readonly unknown[] = [
      { rows: 1.5, columns: 2 },
      { rows: 2, columns: 0.5 },
      { rows: -1, columns: 2 },
      { rows: 2, columns: -1 },
      { rows: Number.MAX_SAFE_INTEGER + 1, columns: 2 },
      { rows: Number.NaN, columns: 2 },
      { rows: Number.POSITIVE_INFINITY, columns: 2 },
      { rows: "2", columns: 2 },
      { rows: 2 },
      { columns: 2 },
      { rows: 2, columns: 2, cells: 4 },
      [2, 2],
      null,
      undefined,
      "2x2"
    ];

    it("accepts non-negative integer counts on success responses", () => {
      expect(isCopyExtractResponse({ ...success, dimensions: { rows: 42, columns: 5 } })).toBe(
        true
      );
      expect(isCopyExtractResponse({ ...success, dimensions: { rows: 0, columns: 0 } })).toBe(true);
      expect(
        isCopyExtractResponse({
          ...success,
          format: "html",
          plainPayload: "A\tB",
          dimensions: { rows: 1, columns: 2 }
        })
      ).toBe(true);
    });

    it("accepts non-negative integer counts on copied outcomes", () => {
      expect(isCopyOutcomeMessage({ ...copiedOutcome, dimensions: { rows: 42, columns: 5 } })).toBe(
        true
      );
      expect(isCopyOutcomeMessage({ ...copiedOutcome, dimensions: { rows: 0, columns: 0 } })).toBe(
        true
      );
    });

    it.each(invalidDimensions.map((dimensions) => [dimensions]))(
      "rejects malformed dimensions %j",
      (dimensions) => {
        expect(isCopyExtractResponse({ ...success, dimensions })).toBe(false);
        expect(isCopyOutcomeMessage({ ...copiedOutcome, dimensions })).toBe(false);
      }
    );

    it("rejects dimensions on failure responses", () => {
      expect(
        isCopyExtractResponse({
          ok: false,
          requestId: "request-1",
          format: "csv",
          reason: "invalid-table",
          dimensions: { rows: 2, columns: 2 }
        })
      ).toBe(false);
    });

    it.each([
      "no-table",
      "target-expired",
      "invalid-table",
      "unexpected",
      "restricted-page",
      "clipboard-failed"
    ])("rejects dimensions on %s outcomes", (status) => {
      expect(isCopyOutcomeMessage({ ...copiedOutcome, status })).toBe(true);
      expect(
        isCopyOutcomeMessage({ ...copiedOutcome, status, dimensions: { rows: 2, columns: 2 } })
      ).toBe(false);
    });
  });
});
