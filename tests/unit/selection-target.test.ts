import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findSelectionOrFocusElement,
  resolveSelectionTarget
} from "../../src/content/selection-target";

function selectContents(node: Node): void {
  const selection = node.ownerDocument?.getSelection() ?? document.getSelection();
  const range = (node.ownerDocument ?? document).createRange();
  range.selectNodeContents(node);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function placeCaret(node: Node, offset = 0): void {
  const selection = document.getSelection();
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.innerHTML = "";
});

describe("selection and focus target resolution", () => {
  it("resolves the table holding selected cell text through its text node", () => {
    document.body.innerHTML = `
      <table id="first"><tr><td>first</td></tr></table>
      <table id="second"><tr><td id="cell">selected text</td></tr></table>
    `;
    selectContents(document.querySelector("#cell")!.firstChild!);

    expect(findSelectionOrFocusElement(document)).toBe(document.querySelector("#cell"));
    expect(resolveSelectionTarget(document)).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#second")
    });
  });

  it("resolves the table under a caret left by a click in a cell", () => {
    document.body.innerHTML = '<table id="clicked"><tr><td id="cell">value</td></tr></table>';
    placeCaret(document.querySelector("#cell")!.firstChild!, 2);

    expect(resolveSelectionTarget(document)).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#clicked")
    });
  });

  it("resolves the table of a focused link inside a cell", () => {
    document.body.innerHTML = `
      <p id="elsewhere">elsewhere</p>
      <table id="linked"><tr><td><a id="link" href="#row">row</a></td></tr></table>
    `;
    // A caret elsewhere on the page doesn't outrank keyboard focus.
    placeCaret(document.querySelector("#elsewhere")!.firstChild!);
    document.querySelector<HTMLAnchorElement>("#link")!.focus();

    expect(document.activeElement).toBe(document.querySelector("#link"));
    expect(resolveSelectionTarget(document)).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#linked")
    });
  });

  it("prefers a non-empty selection over a focused element", () => {
    document.body.innerHTML = `
      <table id="focused"><tr><td><a id="link" href="#a">a</a></td></tr></table>
      <table id="selected"><tr><td id="cell">chosen</td></tr></table>
    `;
    document.querySelector<HTMLAnchorElement>("#link")!.focus();
    selectContents(document.querySelector("#cell")!.firstChild!);

    expect(resolveSelectionTarget(document)).toEqual({
      ok: true,
      kind: "table",
      table: document.querySelector("#selected")
    });
  });

  it("resolves an ARIA grid holding selected cell text", () => {
    document.body.innerHTML = `
      <div role="grid" id="grid">
        <div role="row"><div role="gridcell" id="cell">selected text</div></div>
      </div>
    `;
    selectContents(document.querySelector("#cell")!.firstChild!);

    expect(resolveSelectionTarget(document)).toEqual({
      ok: true,
      kind: "aria",
      table: document.querySelector("#grid")
    });
  });

  it("reports no-table when nothing is selected or focused", () => {
    document.body.innerHTML = "<table><tr><td>unrelated</td></tr></table>";

    expect(findSelectionOrFocusElement(document)).toBeNull();
    expect(resolveSelectionTarget(document)).toEqual({ ok: false, reason: "no-table" });
  });

  it("reports no-table for a selection outside any table, without substituting one", () => {
    document.body.innerHTML = `
      <p id="outside">outside text</p>
      <table><tr><td>other</td></tr></table>
    `;
    selectContents(document.querySelector("#outside")!.firstChild!);

    expect(resolveSelectionTarget(document)).toEqual({ ok: false, reason: "no-table" });
  });

  it("descends into a focused same-origin iframe and resolves its table", () => {
    document.body.innerHTML = `
      <table id="host-table"><tr><td>host</td></tr></table>
      <iframe id="frame"></iframe>
    `;
    const frame = document.querySelector<HTMLIFrameElement>("#frame")!;
    const frameDocument = frame.contentDocument!;
    frameDocument.body.innerHTML =
      '<table id="framed"><tr><td id="framed-cell">inside</td></tr></table>';
    const frameCell = frameDocument.querySelector("#framed-cell")!;
    vi.spyOn(document, "activeElement", "get").mockReturnValue(frame);
    selectContents(frameCell.firstChild!);

    const resolution = resolveSelectionTarget(document);

    expect(resolution).toEqual({
      ok: true,
      kind: "table",
      table: frameDocument.querySelector("#framed")
    });
  });

  it("does not touch a focused frame whose document is unreachable (cross-origin)", () => {
    document.body.innerHTML = `
      <table id="around"><tr><td><iframe id="frame"></iframe></td></tr></table>
    `;
    const frame = document.querySelector<HTMLIFrameElement>("#frame")!;
    vi.spyOn(frame, "contentDocument", "get").mockReturnValue(null);
    vi.spyOn(document, "activeElement", "get").mockReturnValue(frame);

    // Neither the frame's content nor the table around the frame is copied.
    expect(resolveSelectionTarget(document)).toEqual({ ok: false, reason: "no-table" });
  });

  it("treats a frame whose document access throws as unreachable", () => {
    document.body.innerHTML = '<iframe id="frame"></iframe>';
    const frame = document.querySelector<HTMLIFrameElement>("#frame")!;
    vi.spyOn(frame, "contentDocument", "get").mockImplementation(() => {
      throw new DOMException("Permission denied", "SecurityError");
    });
    vi.spyOn(document, "activeElement", "get").mockReturnValue(frame);

    expect(findSelectionOrFocusElement(document)).toBeNull();
  });
});
