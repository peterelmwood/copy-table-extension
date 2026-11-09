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

  it("accepts a keyboard-shortcut request that targets the selection", () => {
    expect(
      isCopyExtractRequest({
        type: "copy-table:extract",
        requestId: "request-1",
        targetSource: "selection",
        format: "csv"
      })
    ).toBe(true);
  });

  it("accepts exactly the two request shapes and rejects mixed or partial ones", () => {
    const base = { type: "copy-table:extract", requestId: "request-1", format: "csv" };

    // Both targets at once.
    expect(isCopyExtractRequest({ ...base, targetElementId: 4, targetSource: "selection" })).toBe(
      false
    );
    // Neither target.
    expect(isCopyExtractRequest(base)).toBe(false);
    // Unknown selection sources.
    expect(isCopyExtractRequest({ ...base, targetSource: "focus" })).toBe(false);
    expect(isCopyExtractRequest({ ...base, targetSource: undefined })).toBe(false);
    // A menu request whose element ID is missing or malformed.
    expect(isCopyExtractRequest({ ...base, targetElementId: undefined })).toBe(false);
    expect(isCopyExtractRequest({ ...base, targetElementId: "4" })).toBe(false);
    expect(isCopyExtractRequest({ ...base, targetElementId: 1.5 })).toBe(false);
    // Extra keys on either shape.
    expect(isCopyExtractRequest({ ...base, targetElementId: 4, frameId: 0 })).toBe(false);
    expect(isCopyExtractRequest({ ...base, targetSource: "selection", frameId: 0 })).toBe(false);
    // The shared fields are still checked on the selection shape.
    expect(isCopyExtractRequest({ ...base, targetSource: "selection", format: "pdf" })).toBe(false);
    expect(isCopyExtractRequest({ ...base, targetSource: "selection", requestId: "" })).toBe(false);
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
});
