import { isCopyExtractRequest } from "../browser/messages";
import type { CopyExtractRequest, CopyExtractResponse } from "../table/model";
import { resolveInteractionTarget, type TargetElementLookup } from "./target";

export interface ContentHandlerDependencies {
  getTargetElement: TargetElementLookup;
  serialize?(table: HTMLTableElement, request: CopyExtractRequest): string;
}

function placeholderSerialize(table: HTMLTableElement): string {
  return table.outerHTML;
}

export function createContentMessageHandler(dependencies: ContentHandlerDependencies) {
  const serialize = dependencies.serialize ?? placeholderSerialize;

  return (message: unknown): CopyExtractResponse | undefined => {
    if (!isCopyExtractRequest(message)) {
      return undefined;
    }

    const target = resolveInteractionTarget(message.targetElementId, dependencies.getTargetElement);
    if (!target.ok) {
      return {
        ok: false,
        requestId: message.requestId,
        format: message.format,
        reason: target.reason
      };
    }

    try {
      return {
        ok: true,
        requestId: message.requestId,
        format: message.format,
        payload: serialize(target.table, message)
      };
    } catch {
      return {
        ok: false,
        requestId: message.requestId,
        format: message.format,
        reason: "invalid-table"
      };
    }
  };
}

const CONTENT_HANDLER_INSTALL_GUARD = "__copyTableContentHandlerV1Installed";

type BrowserMenuTargetApi = { getTargetElement(targetElementId: number): Element | null };
type BrowserRuntimeMessages = {
  onMessage: { addListener(listener: (message: unknown) => unknown): void };
};
type FirefoxContentBrowserApi = {
  menus: BrowserMenuTargetApi;
  runtime: BrowserRuntimeMessages;
};
type ContentHandlerInstallationGlobal = Record<string, unknown>;

export function registerContentHandler(
  browserApi: FirefoxContentBrowserApi,
  installationGlobal: ContentHandlerInstallationGlobal = globalThis as ContentHandlerInstallationGlobal
): void {
  if (installationGlobal[CONTENT_HANDLER_INSTALL_GUARD] === true) {
    return;
  }

  browserApi.runtime.onMessage.addListener(
    createContentMessageHandler({
      getTargetElement: (targetElementId) => browserApi.menus.getTargetElement(targetElementId)
    })
  );
  installationGlobal[CONTENT_HANDLER_INSTALL_GUARD] = true;
}

declare const browser: FirefoxContentBrowserApi | undefined;

if (typeof browser !== "undefined") {
  registerContentHandler(browser);
}
