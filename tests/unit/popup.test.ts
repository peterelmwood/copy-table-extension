import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const popupPath = resolve(import.meta.dirname, "../../src/popup/index.html");
const originalDocument = document.documentElement.innerHTML;

function loadPopupMarkup(): void {
  const popupDocument = new DOMParser().parseFromString(
    readFileSync(popupPath, "utf8"),
    "text/html"
  );

  document.head.innerHTML = popupDocument.head.innerHTML;
  document.body.innerHTML = popupDocument.body.innerHTML;
}

afterEach(() => {
  document.documentElement.innerHTML = originalDocument;
});

describe("popup readiness surface", () => {
  it("identifies Copy Structured Data with a semantic ready state and deferred action copy", () => {
    loadPopupMarkup();

    const main = document.querySelector("main[aria-labelledby='popup-title']");
    const title = document.querySelector("h1#popup-title");
    const readiness = document.querySelector("[role='status']");
    const deferredMessage = document.querySelector("#deferred-actions");

    expect(main).not.toBeNull();
    expect(title?.textContent).toBe("Copy Structured Data");
    expect(readiness?.textContent).toBe("Ready");
    expect(readiness?.getAttribute("aria-live")).toBe("polite");
    expect(deferredMessage?.textContent).toBe(
      "Structured-data copy actions are coming in a later feature."
    );
  });

  it("renders the installed version through an injected runtime metadata adapter", async () => {
    loadPopupMarkup();
    const popupModule = (await import("../../src/popup/popup")) as Partial<{
      initializePopup: (document: Document, runtimeMetadata: { getVersion(): string }) => void;
    }>;

    expect(popupModule.initializePopup).toBeTypeOf("function");

    popupModule.initializePopup?.(document, {
      getVersion: () => "1.2.3"
    });

    expect(document.querySelector("#extension-version")?.textContent).toBe("1.2.3");
  });
});
