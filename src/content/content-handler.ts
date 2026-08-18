import { isCopyExtractRequest, isCopyOutcomeMessage } from "../browser/messages";
import { renderCopyOutcome } from "./feedback";
import type { CopyExtractRequest, CopyExtractResponse } from "../table/model";
import { extractLogicalTable } from "../table/extract";
import { serializeCsv } from "../table/serialize/csv";
import { serializeHtml } from "../table/serialize/html";
import { serializeMarkdown } from "../table/serialize/markdown";
import { serializeText } from "../table/serialize/text";
import { resolveInteractionTarget, type TargetElementLookup } from "./target";

export interface ContentHandlerDependencies {
  getTargetElement: TargetElementLookup;
  serialize?(table: HTMLTableElement, request: CopyExtractRequest): string;
}

function serializeTable(table: HTMLTableElement, request: CopyExtractRequest): string {
  const logicalTable = extractLogicalTable(table);

  switch (request.format) {
    case "html":
      return serializeHtml(logicalTable);
    case "markdown":
      return serializeMarkdown(logicalTable);
    case "text":
      return serializeText(logicalTable);
    case "csv":
      return serializeCsv(logicalTable);
  }
}

export function createContentMessageHandler(dependencies: ContentHandlerDependencies) {
  const serialize = dependencies.serialize ?? serializeTable;

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

  const extractMessageHandler = createContentMessageHandler({
    getTargetElement: (targetElementId) => browserApi.menus.getTargetElement(targetElementId)
  });
  browserApi.runtime.onMessage.addListener((message: unknown) => {
    if (isCopyOutcomeMessage(message)) {
      renderCopyOutcome(document, message);
      return undefined;
    }

    return extractMessageHandler(message);
  });
  installationGlobal[CONTENT_HANDLER_INSTALL_GUARD] = true;
}

declare const browser: FirefoxContentBrowserApi | undefined;

if (typeof browser !== "undefined") {
  registerContentHandler(browser);
}
