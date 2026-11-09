import { describe, expect, it } from "vitest";
import { resolveInteractionTarget } from "../../src/content/target";

describe("interaction target resolution", () => {
  it("selects only the nearest containing semantic table", () => {
    document.body.innerHTML = `
      <table id="outer"><tr><td><table id="inner"><tr><td id="target">nested</td></tr></table></td></tr></table>
      <table id="other"><tr><td>other</td></tr></table>
    `;
    const target = document.querySelector("#target");

    expect(resolveInteractionTarget(1, (id) => (id === 1 ? target : null))).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#inner")
    });
  });

  it.each(["table", "grid", "treegrid", "GRID"])("resolves an ARIA role=%s root", (role) => {
    document.body.innerHTML = `<div id="root" role="${role}"><div role="row"><span id="target">x</span></div></div>`;

    expect(resolveInteractionTarget(1, () => document.querySelector("#target"))).toEqual({
      ok: true,
      kind: "aria",
      table: document.querySelector("#root")
    });
  });

  it("uses the closest root when a <table> is nested inside an ARIA grid", () => {
    document.body.innerHTML = `
      <div role="grid" id="grid"><div role="row"><div role="gridcell" id="grid-cell">
        <table id="table"><tr><td id="table-cell">x</td></tr></table>
      </div></div></div>`;

    expect(resolveInteractionTarget(1, () => document.querySelector("#table-cell"))).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#table")
    });
    expect(resolveInteractionTarget(1, () => document.querySelector("#grid-cell"))).toEqual({
      ok: true,
      kind: "aria",
      table: document.querySelector("#grid")
    });
  });

  it("uses the closest root when an ARIA grid is nested inside a <table> or another grid", () => {
    document.body.innerHTML = `
      <table id="table"><tr><td>
        <div role="grid" id="outer"><div role="row"><div role="gridcell">
          <div role="treegrid" id="inner"><div role="row"><div role="gridcell" id="target">x</div></div></div>
        </div></div></div>
      </td></tr></table>`;

    expect(resolveInteractionTarget(1, () => document.querySelector("#target"))).toEqual({
      ok: true,
      kind: "aria",
      table: document.querySelector("#inner")
    });
  });

  it("treats a <table> with an ARIA role as a semantic table", () => {
    document.body.innerHTML =
      '<table id="table" role="grid"><tr><td id="target">x</td></tr></table>';

    expect(resolveInteractionTarget(1, () => document.querySelector("#target"))).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#table")
    });
  });

  it("reports no-table for ARIA rows and cells outside any root", () => {
    document.body.innerHTML = '<div role="row"><div role="gridcell" id="target">stray</div></div>';

    expect(resolveInteractionTarget(1, () => document.querySelector("#target"))).toEqual({
      ok: false,
      reason: "no-table"
    });
  });

  it("does not substitute another table when the target has expired", () => {
    document.body.innerHTML = "<table id=other><tr><td>other</td></tr></table>";

    expect(resolveInteractionTarget(1, () => null)).toEqual({
      ok: false,
      reason: "target-expired"
    });
  });

  it("reports no-table for a live non-table target", () => {
    document.body.innerHTML = "<p id=target>outside</p><table><tr><td>other</td></tr></table>";
    const target = document.querySelector("#target");

    expect(resolveInteractionTarget(1, () => target)).toEqual({ ok: false, reason: "no-table" });
  });
});
