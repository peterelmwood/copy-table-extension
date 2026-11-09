import { isCopyExtractRequest, isCopyOutcomeMessage } from "../browser/messages";
import { renderCopyOutcome } from "./feedback";
import type { CopyExtractRequest, CopyExtractResponse, CopyExtractSuccess } from "../table/model";
import { extractLogicalTable } from "../table/extract";
import { serializeCsv } from "../table/serialize/csv";
import { serializeHtml } from "../table/serialize/html";
import { serializeMarkdown } from "../table/serialize/markdown";
import { serializeText } from "../table/serialize/text";
import { resolveSelectionTarget } from "./selection-target";
import { resolveInteractionTarget, type TargetElementLookup } from "./target";

export interface SerializedTable {
  payload: string;
  plainPayload?: string;
}

export interface ContentHandlerDependencies {
  getTargetElement: TargetElementLookup;
  serialize?(table: HTMLTableElement, request: CopyExtractRequest): SerializedTable;
}

function serializeTable(table: HTMLTableElement, request: CopyExtractRequest): SerializedTable {
  // One extraction feeds every representation, so they can never disagree.
  const logicalTable = extractLogicalTable(table);

  switch (request.format) {
    case "html":
      // Rich editors read the markup; plain-text targets get the tab-separated
      // matrix, which also pastes cleanly into spreadsheets.
      return { payload: serializeHtml(logicalTable), plainPayload: serializeText(logicalTable) };
    case "html-source":
      // The same markup as "html", copied as plain text so code editors and
      // other plain-text targets receive the HTML itself.
      return { payload: serializeHtml(logicalTable) };
    case "markdown":
      return { payload: serializeMarkdown(logicalTable) };
    case "text":
      return { payload: serializeText(logicalTable) };
    case "csv":
      return { payload: serializeCsv(logicalTable) };
  }
}

export function createContentMessageHandler(dependencies: ContentHandlerDependencies) {
  const serialize = dependencies.serialize ?? serializeTable;

  return (message: unknown): CopyExtractResponse | undefined => {
    if (!isCopyExtractRequest(message)) {
      return undefined;
    }

    const target =
      "targetElementId" in message
        ? resolveInteractionTarget(message.targetElementId, dependencies.getTargetElement)
        : resolveSelectionTarget(document);
    if (!target.ok) {
      return {
        ok: false,
        requestId: message.requestId,
        format: message.format,
        reason: target.reason
      };
    }

    try {
      const serialized = serialize(target.table, message);
      const response: CopyExtractSuccess = {
        ok: true,
        requestId: message.requestId,
        format: message.format,
        payload: serialized.payload
      };
      if (serialized.plainPayload !== undefined) {
        response.plainPayload = serialized.plainPayload;
      }
      return response;
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

type BrowserMenuTargetApi = { getTargetElement(targetElementId: number): Element | null | void };
type FirefoxRuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0];
type BrowserRuntimeMessages = {
  onMessage: { addListener(listener: FirefoxRuntimeMessageListener): void };
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
    getTargetElement: (targetElementId) =>
      browserApi.menus.getTargetElement(targetElementId) ?? null
  });
  browserApi.runtime.onMessage.addListener((message: unknown) => {
    if (isCopyOutcomeMessage(message)) {
      renderCopyOutcome(document, message);
      return undefined;
    }

    if (!isCopyExtractRequest(message)) {
      return undefined;
    }

    return Promise.resolve(extractMessageHandler(message));
  });
  installationGlobal[CONTENT_HANDLER_INSTALL_GUARD] = true;
}

if (typeof browser !== "undefined") {
  registerContentHandler(browser);
}
