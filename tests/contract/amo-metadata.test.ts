import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COPY_AS_MENU_ITEMS } from "../../src/browser/context-menu";

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
    // Every "Copy table as" format, in menu order, so the listing can't fall
    // behind the menu again.
    const formatLabels = COPY_AS_MENU_ITEMS.filter((item) => "parentId" in item).map((item) =>
      item.title.toLowerCase()
    );
    let searchFrom = 0;
    for (const label of formatLabels) {
      const index = summary?.toLowerCase().indexOf(label, searchFrom) ?? -1;
      expect(index, `summary should name "${label}" after the previous format`).toBeGreaterThan(-1);
      searchFrom = index + label.length;
    }
    // AMO caps listing summaries at 250 characters.
    expect(summary?.length).toBeLessThanOrEqual(250);
    expect(summary).toMatch(/^[^.?!]+[.?!]$/);
    expect(metadata.categories).toEqual(["web-development"]);
    expect(metadata.version.license).toBe("ISC");
  });
});
