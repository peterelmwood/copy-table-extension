import { describe, expect, it } from "vitest";
import { extractSafeInline, safeInlineText, sanitizeLinkHref } from "../../src/table/safe-inline";

describe("safe inline extraction", () => {
  it.each([
    "https://example.com/report",
    "http://example.com/report",
    "/reports/current",
    "../reports/current",
    "?page=2",
    "#totals",
    "mailto:analyst@example.com",
    "//cdn.example.com/report"
  ])("retains an approved HTTP(S), mailto, fragment, or relative destination: %s", (href) => {
    expect(sanitizeLinkHref(href)).toBe(href);
  });

  it.each([
    "javascript:alert(1)",
    "  JaVaScRiPt:alert(1)",
    "data:text/html,secret",
    "vbscript:msgbox(1)",
    "file:///private/report",
    "blob:https://example.com/id",
    ""
  ])("rejects an executable, local, opaque, or empty destination: %s", (href) => {
    expect(sanitizeLinkHref(href)).toBeNull();
  });

  it("keeps visible text, breaks, image alt text, and safe links without executable markup", () => {
    const cell = document.createElement("td");
    cell.innerHTML = `
      Visible <strong>deep</strong><br>
      <img src="remote.png" alt="Chart &amp; summary">
      <a href="https://example.com/?x=1&amp;y=2" onclick="steal()"><em>safe</em></a>
      <a href="javascript:steal()">unsafe</a>
      <script>script secret</script>
      <style>.secret { display: block }</style>
      <input value="control secret">
      <span hidden>hidden secret</span>
      <span aria-hidden="true">aria secret</span>
      <span style="visibility: hidden">styled secret</span>
    `;

    const tokens = extractSafeInline(cell);

    expect(tokens).toEqual([
      { type: "text", value: "Visible deep" },
      { type: "break" },
      { type: "text", value: "Chart & summary " },
      {
        type: "link",
        href: "https://example.com/?x=1&y=2",
        children: [{ type: "text", value: "safe" }]
      },
      { type: "text", value: " unsafe" }
    ]);
    expect(safeInlineText(tokens)).toBe("Visible deep\nChart & summary safe unsafe");
  });

  it("excludes text owned by a nested table while retaining the outer cell text", () => {
    const cell = document.createElement("td");
    cell.innerHTML = "Outer before <table><tr><td>nested secret</td></tr></table> outer after";

    expect(safeInlineText(extractSafeInline(cell))).toBe("Outer before outer after");
  });

  it("preserves visible word boundaries across nested inline elements", () => {
    const cell = document.createElement("td");
    cell.innerHTML = 'Alpha <strong>beta </strong><em>gamma</em> <a href="/safe">linked </a>label';

    expect(safeInlineText(extractSafeInline(cell))).toBe("Alpha beta gamma linked label");
  });

  it("preserves meaningful line boundaries introduced by block content", () => {
    const cell = document.createElement("td");
    cell.innerHTML = "Before<div>First block</div><div>Second <strong>block</strong></div>After";

    expect(safeInlineText(extractSafeInline(cell))).toBe(
      "Before\nFirst block\nSecond block\nAfter"
    );
  });
});
