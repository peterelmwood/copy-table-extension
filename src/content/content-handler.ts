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

type BrowserMenuTargetApi = { getTargetElement(targetElementId: number): Element | null };
type BrowserRuntimeMessages = {
  onMessage: { addListener(listener: (message: unknown) => unknown): void };
};

export function registerContentHandler(
  browserApi: BrowserMenuTargetApi & BrowserRuntimeMessages
): void {
  browserApi.onMessage.addListener(
    createContentMessageHandler({
      getTargetElement: (targetElementId) => browserApi.getTargetElement(targetElementId)
    })
  );
}

declare const browser: (BrowserMenuTargetApi & BrowserRuntimeMessages) | undefined;

if (typeof browser !== "undefined") {
  registerContentHandler(browser);
}
