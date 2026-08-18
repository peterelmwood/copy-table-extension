import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const popupPath = resolve(import.meta.dirname, "../../src/popup/index.html");
const popupStylePath = resolve(import.meta.dirname, "../../src/popup/popup.css");
const originalDocument = document.documentElement.innerHTML;

function loadPopupMarkup(): void {
  const popupDocument = new DOMParser().parseFromString(
    readFileSync(popupPath, "utf8"),
    "text/html"
  );

  document.head.innerHTML = popupDocument.head.innerHTML;
  document.body.innerHTML = popupDocument.body.innerHTML;
}

function loadPopupStyles(): void {
  const styles = document.createElement("style");

  styles.textContent = readFileSync(popupStylePath, "utf8");
  document.head.append(styles);
}

afterEach(() => {
  document.documentElement.innerHTML = originalDocument;
});

describe("popup readiness surface", () => {
  it("identifies Copy Table with a semantic ready state and deferred action copy", () => {
    loadPopupMarkup();

    const main = document.querySelector("main[aria-labelledby='popup-title']");
    const title = document.querySelector("h1#popup-title");
    const readiness = document.querySelector("[role='status']");
    const deferredMessage = document.querySelector("#deferred-actions");

    expect(main).not.toBeNull();
    expect(title?.textContent).toBe("Copy Table");
    expect(readiness?.textContent).toBe("Ready");
    expect(readiness?.getAttribute("aria-live")).toBe("polite");
    expect(deferredMessage?.textContent).toBe(
      "Structured-data copy actions are coming in a later feature."
    );
  });

  it("renders the installed version through an injected runtime metadata adapter", async () => {
    loadPopupMarkup();
    const popupModule = (await import("../../src/popup/popup")) as Partial<{
      initializePopup: (
        document: Document,
        runtimeMetadata: { getVersion(): string },
        closePopup: () => void
      ) => void;
    }>;

    expect(popupModule.initializePopup).toBeTypeOf("function");

    popupModule.initializePopup?.(
      document,
      {
        getVersion: () => "1.2.3"
      },
      () => undefined
    );

    expect(document.querySelector("#extension-version")?.textContent).toBe("1.2.3");
  });

  it("closes through an explicit keyboard-focusable control without making readiness a tab stop", async () => {
    loadPopupMarkup();
    loadPopupStyles();

    const readinessRegion = document.querySelector<HTMLElement>("#readiness-region");
    const closeButton = document.querySelector<HTMLButtonElement>("#close-popup");
    const popupModule = (await import("../../src/popup/popup")) as Partial<{
      initializePopup: (
        document: Document,
        runtimeMetadata: { getVersion(): string },
        closePopup: () => void
      ) => void;
    }>;
    let closeRequests = 0;

    expect(readinessRegion).not.toBeNull();
    expect(readinessRegion?.hasAttribute("tabindex")).toBe(false);
    expect(closeButton?.textContent).toBe("Close");

    popupModule.initializePopup?.(document, { getVersion: () => "1.2.3" }, () => {
      closeRequests += 1;
    });

    closeButton?.focus();

    expect(document.activeElement).toBe(closeButton);

    closeButton?.click();

    expect(closeRequests).toBe(1);

    const focusVisibleRule = Array.from(document.styleSheets)
      .flatMap((styleSheet) => Array.from(styleSheet.cssRules))
      .find(
        (rule): rule is CSSStyleRule =>
          "selectorText" in rule && rule.selectorText === "#close-popup:focus-visible"
      );

    expect(focusVisibleRule?.style.getPropertyValue("outline")).toBe("3px solid #1455d9");
    expect(focusVisibleRule?.style.getPropertyValue("outline-offset")).toBe("2px");
  });
});
