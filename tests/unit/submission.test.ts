import { describe, expect, it } from "vitest";
import { classifySubmissionFailure, submissionArguments } from "../../scripts/submit-firefox.mjs";

describe("Firefox submission boundary", () => {
  it.each([
    ["HTTP 409: version already exists"],
    ["Validation failed: invalid manifest"],
    ["API responded 401 Unauthorized"]
  ])("classifies a known AMO rejection: %s", (output) => {
    expect(classifySubmissionFailure(output)).toBe("known");
  });

  it.each([
    ["connect ETIMEDOUT addons.mozilla.org"],
    ["socket hang up after upload"],
    ["unexpected signer failure"],
    ["Upload of source failed: Error: Patch request failed: Forbidden"]
  ])("treats an uncertain transport or unknown failure as ambiguous: %s", (output) => {
    expect(classifySubmissionFailure(output)).toBe("ambiguous");
  });

  it("uses the listed channel, committed metadata, reviewer source, and no credential arguments", () => {
    const arguments_ = submissionArguments("web-ext-artifacts/copy-table-source-1.0.1.zip");

    expect(arguments_).toEqual([
      "node_modules/web-ext/bin/web-ext.js",
      "sign",
      "--source-dir",
      "dist",
      "--artifacts-dir",
      "web-ext-artifacts",
      "--channel",
      "listed",
      "--amo-metadata",
      "amo-metadata.json",
      "--upload-source-code",
      "web-ext-artifacts/copy-table-source-1.0.1.zip",
      "--approval-timeout",
      "0",
      "--no-input"
    ]);
    expect(arguments_.join(" ")).not.toMatch(/AMO_JWT_|WEB_EXT_API_|secrets\./);
  });
});
