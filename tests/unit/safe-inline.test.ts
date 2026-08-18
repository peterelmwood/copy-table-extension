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
      { type: "text", value: " unsafe aria secret" }
    ]);
    expect(safeInlineText(tokens)).toBe("Visible deep\nChart & summary safe unsafe aria secret");
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

  it("uses computed rendering across ancestors while preserving visually rendered ARIA text", () => {
    document.head.innerHTML = `<style>
      .external-hidden { display: none; }
      .hidden-ancestor { visibility: hidden; }
      .transparent-ancestor { opacity: 0; }
    </style>`;
    document.body.innerHTML = `<table><tr><td id="cell">
      Visible
      <span class="external-hidden">external secret</span>
      <span style="display: none !important">important secret</span>
      <span class="hidden-ancestor"><strong>ancestor secret</strong></span>
      <span class="transparent-ancestor"><em>transparent secret</em></span>
      <span aria-hidden="true">ARIA visible</span>
      tail
    </td></tr></table>`;
    const cell = document.querySelector("#cell");
    if (!(cell instanceof HTMLTableCellElement)) {
      throw new Error("Computed-visibility fixture did not contain a table cell.");
    }

    expect(safeInlineText(extractSafeInline(cell))).toBe("Visible ARIA visible tail");
  });

  it("excludes metadata and other explicitly non-content elements from mutated DOM", () => {
    document.body.innerHTML = '<table><tr><td id="cell">Visible </td></tr></table>';
    const cell = document.querySelector("#cell");
    if (!(cell instanceof HTMLTableCellElement)) {
      throw new Error("Metadata fixture did not contain a table cell.");
    }

    for (const tagName of ["title", "base", "link", "meta", "param", "track"]) {
      const metadata = document.createElement(tagName);
      metadata.append(`${tagName} private metadata`);
      cell.append(metadata);
    }
    cell.append("value");

    expect(safeInlineText(extractSafeInline(cell))).toBe("Visible value");
  });

  it("retains a visible descendant that overrides a hidden ancestor's visibility", () => {
    document.body.innerHTML = `<table><tr><td id="cell">
      <span style="visibility: hidden">
        hidden ancestor
        <strong style="visibility: visible">Visible descendant</strong>
      </span>
    </td></tr></table>`;
    const cell = document.querySelector("#cell");
    if (!(cell instanceof HTMLTableCellElement)) {
      throw new Error("Visibility-override fixture did not contain a table cell.");
    }

    expect(safeInlineText(extractSafeInline(cell))).toBe("Visible descendant");
  });

  it("traverses rendered custom and omitted standard elements as transparent containers", () => {
    document.body.innerHTML = `<table><tr><td id="cell">
      <x-price>£10 <span>per item</span></x-price>
      <dialog open>Available now</dialog>
      <title style="display: inline !important">metadata secret</title>
    </td></tr></table>`;
    const cell = document.querySelector("#cell");
    if (!(cell instanceof HTMLTableCellElement)) {
      throw new Error("Transparent-container fixture did not contain a table cell.");
    }

    expect(safeInlineText(extractSafeInline(cell))).toBe("£10 per item Available now");
  });
});
