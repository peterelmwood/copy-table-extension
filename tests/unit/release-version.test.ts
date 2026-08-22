import { describe, expect, it } from "vitest";
import { extensionArchiveFileName } from "../../scripts/artifact-path.mjs";
import { parseStableTag, validateReleaseVersions } from "../../scripts/release.mjs";

describe("stable Firefox release version contract", () => {
  it("derives the extension archive name from the validated version", () => {
    expect(extensionArchiveFileName("1.0.1")).toBe("copy_table-1.0.1.zip");
  });

  it.each([
    ["v0.0.0", "0.0.0"],
    ["v1.0.0", "1.0.0"],
    ["v12.34.56", "12.34.56"]
  ])("accepts %s as stable version %s", (tag, expectedVersion) => {
    expect(parseStableTag(tag)).toBe(expectedVersion);
  });

  it.each([
    "1.0.0",
    "v1.0",
    "v1.0.0.0",
    "v01.0.0",
    "v1.00.0",
    "v1.0.00",
    "v1.0.0-beta.1",
    "v1.0.0+build.1",
    "release-v1.0.0"
  ])("rejects ineligible tag %s", (tag) => {
    expect(() => parseStableTag(tag)).toThrow(/stable release tag/i);
  });

  it("requires tag, package, and manifest versions to agree", () => {
    expect(validateReleaseVersions("v1.0.0", "1.0.0", "1.0.0")).toEqual({
      tag: "v1.0.0",
      version: "1.0.0"
    });
    expect(() => validateReleaseVersions("v1.0.0", "1.0.1", "1.0.0")).toThrow(/package version/i);
    expect(() => validateReleaseVersions("v1.0.0", "1.0.0", "1.0.1")).toThrow(/manifest version/i);
  });
});
