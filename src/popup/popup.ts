import { createRuntimeMetadataAdapter, type RuntimeMetadataAdapter } from "../browser/runtime";

export function initializePopup(
  popupDocument: Document,
  runtimeMetadata: RuntimeMetadataAdapter,
  closePopup: () => void
): void {
  const versionElement = popupDocument.querySelector("#extension-version");
  const closeButton = popupDocument.querySelector<HTMLButtonElement>("#close-popup");

  if (versionElement !== null) {
    versionElement.textContent = runtimeMetadata.getVersion();
  }

  if (closeButton !== null) {
    closeButton.addEventListener("click", closePopup);
  }
}

if (typeof browser !== "undefined") {
  initializePopup(document, createRuntimeMetadataAdapter(browser.runtime), () => window.close());
}
