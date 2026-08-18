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
      table: document.querySelector("#inner")
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
