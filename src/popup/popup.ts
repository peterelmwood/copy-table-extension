import { createRuntimeMetadataAdapter, type RuntimeMetadataAdapter } from "../browser/runtime";

export function initializePopup(
  popupDocument: Document,
  runtimeMetadata: RuntimeMetadataAdapter
): void {
  const versionElement = popupDocument.querySelector("#extension-version");

  if (versionElement !== null) {
    versionElement.textContent = runtimeMetadata.getVersion();
  }
}

if (typeof browser !== "undefined") {
  initializePopup(document, createRuntimeMetadataAdapter(browser.runtime));
}
