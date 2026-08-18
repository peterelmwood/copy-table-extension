import { createClipboardWriter, type ClipboardWriter } from "./browser/clipboard";
import {
  createCopyAsMenus,
  formatFromMenuItemId,
  type ContextMenuApi
} from "./browser/context-menu";
import { isCopyExtractResponse } from "./browser/messages";
import type { CopyExtractRequest } from "./table/model";

export interface MenuClickData {
  menuItemId: unknown;
  targetElementId?: number;
  frameId?: number;
}

export interface ClickedTab {
  id?: number;
}

export interface BrowserInteractionDependencies extends ClipboardWriter {
  inject(tabId: number, frameId: number, files: readonly string[]): Promise<void>;
  sendMessage(tabId: number, message: CopyExtractRequest, frameId: number): Promise<unknown>;
  nextRequestId?(): string;
}

function defaultRequestId(): string {
  return crypto.randomUUID();
}

export function createBrowserInteractionController(dependencies: BrowserInteractionDependencies) {
  return {
    async handleMenuClick(info: MenuClickData, tab: ClickedTab): Promise<void> {
      const format = formatFromMenuItemId(info.menuItemId);
      if (
        format === null ||
        typeof info.targetElementId !== "number" ||
        !Number.isInteger(info.targetElementId) ||
        typeof info.frameId !== "number" ||
        !Number.isInteger(info.frameId) ||
        typeof tab.id !== "number" ||
        !Number.isInteger(tab.id)
      ) {
        return;
      }

      const request: CopyExtractRequest = {
        type: "copy-table:extract",
        requestId: (dependencies.nextRequestId ?? defaultRequestId)(),
        targetElementId: info.targetElementId,
        format
      };
      const tabId = tab.id;
      const frameId = info.frameId;

      await dependencies.inject(tabId, frameId, ["content/content-handler.js"]);
      const response = await dependencies.sendMessage(tabId, request, frameId);
      if (
        !isCopyExtractResponse(response) ||
        !response.ok ||
        response.requestId !== request.requestId ||
        response.format !== request.format
      ) {
        return;
      }

      let payload = response.payload;
      try {
        await dependencies.writeText(payload);
      } finally {
        payload = "";
      }
    }
  };
}

interface BackgroundBrowserApi {
  menus: ContextMenuApi & {
    onClicked: { addListener(listener: (info: MenuClickData, tab: ClickedTab) => void): void };
  };
  scripting: {
    executeScript(details: {
      target: { tabId: number; frameIds: number[] };
      files: string[];
    }): Promise<unknown>;
  };
  tabs: {
    sendMessage(
      tabId: number,
      message: CopyExtractRequest,
      options: { frameId: number }
    ): Promise<unknown>;
  };
}

export function initializeBrowserCommandBoundary(
  browserApi: BackgroundBrowserApi,
  clipboard: Clipboard
): void {
  void createCopyAsMenus(browserApi.menus);
  const controller = createBrowserInteractionController({
    inject: async (tabId, frameId, files) => {
      await browserApi.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        files: [...files]
      });
    },
    sendMessage: (tabId, message, frameId) =>
      browserApi.tabs.sendMessage(tabId, message, { frameId }),
    ...createClipboardWriter(clipboard)
  });

  browserApi.menus.onClicked.addListener((info, tab) => {
    void controller.handleMenuClick(info, tab);
  });
}

declare const browser: BackgroundBrowserApi | undefined;

if (typeof browser !== "undefined") {
  initializeBrowserCommandBoundary(browser, navigator.clipboard);
}
