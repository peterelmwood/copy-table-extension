import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

describe("public AMO listing metadata", () => {
  it("describes the extension in one English sentence with the approved category and license", () => {
    const metadata = JSON.parse(
      readFileSync(resolve(projectRoot, "amo-metadata.json"), "utf8")
    ) as {
      summary: Record<string, string>;
      categories: string[];
      version: { license: string };
    };
    const summary = metadata.summary["en-US"];

    expect(summary).toBeDefined();
    expect(summary).toMatch(/HTML.*Markdown.*plain text.*CSV/i);
    expect(summary).toMatch(/^[^.?!]+[.?!]$/);
    expect(metadata.categories).toEqual(["web-development"]);
    expect(metadata.version.license).toBe("ISC");
  });
});
