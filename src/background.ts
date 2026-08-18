import { createClipboardWriter, type ClipboardWriter } from "./browser/clipboard";
import {
  createCopyAsMenus,
  formatFromMenuItemId,
  type ContextMenuApi
} from "./browser/context-menu";
import { isCopyExtractResponse } from "./browser/messages";
import type { CopyExtractRequest, CopyOutcomeMessage, CopyOutcomeStatus } from "./table/model";

const RESTRICTED_PAGE_NOTIFICATION = {
  type: "basic" as const,
  title: "Copy Table",
  message: "Copy Table cannot access this protected page. Open a normal web page and try again."
};

type RestrictedPageNotification = typeof RESTRICTED_PAGE_NOTIFICATION;

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
  sendOutcome?(tabId: number, message: CopyOutcomeMessage, frameId: number): Promise<void>;
  notifyRestrictedPage?(notification: RestrictedPageNotification): Promise<void>;
  nextRequestId?(): string;
}

function defaultRequestId(): string {
  return crypto.randomUUID();
}

export function createBrowserInteractionController(dependencies: BrowserInteractionDependencies) {
  async function notifyRestrictedPage(): Promise<void> {
    try {
      await dependencies.notifyRestrictedPage?.(RESTRICTED_PAGE_NOTIFICATION);
    } catch {
      // System notifications can be disabled; never log page data or retry.
    }
  }

  async function sendOutcome(
    tabId: number,
    request: CopyExtractRequest,
    frameId: number,
    status: CopyOutcomeStatus
  ): Promise<void> {
    try {
      await dependencies.sendOutcome?.(
        tabId,
        {
          type: "copy-table:outcome",
          requestId: request.requestId,
          format: request.format,
          status
        },
        frameId
      );
    } catch {
      // A restricted or navigated frame cannot receive feedback; never log page data.
    }
  }

  return {
    async handleMenuClick(info: MenuClickData, tab: ClickedTab): Promise<void> {
      const format = formatFromMenuItemId(info.menuItemId);
      const frameId = info.frameId ?? 0;
      if (
        format === null ||
        typeof info.targetElementId !== "number" ||
        !Number.isInteger(info.targetElementId) ||
        !Number.isInteger(frameId) ||
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

      try {
        await dependencies.inject(tabId, frameId, ["content/content-handler.js"]);
      } catch {
        await notifyRestrictedPage();
        return;
      }

      let response: unknown;
      try {
        response = await dependencies.sendMessage(tabId, request, frameId);
      } catch {
        await sendOutcome(tabId, request, frameId, "unexpected");
        return;
      }

      if (
        !isCopyExtractResponse(response) ||
        response.requestId !== request.requestId ||
        response.format !== request.format
      ) {
        await sendOutcome(tabId, request, frameId, "unexpected");
        return;
      }

      if (!response.ok) {
        await sendOutcome(tabId, request, frameId, response.reason);
        return;
      }

      const successfulResponse = response;
      let payload = successfulResponse.payload;
      let status: CopyOutcomeStatus = "copied";
      try {
        await dependencies.writeText(payload);
      } catch {
        status = "clipboard-failed";
      } finally {
        payload = "";
        delete (successfulResponse as { payload?: string }).payload;
        response = undefined;
      }
      await sendOutcome(tabId, request, frameId, status);
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
      message: CopyExtractRequest | CopyOutcomeMessage,
      options: { frameId: number }
    ): Promise<unknown>;
  };
  notifications: {
    create(id: string, options: RestrictedPageNotification): Promise<string>;
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
    sendOutcome: async (tabId, message, frameId) => {
      await browserApi.tabs.sendMessage(tabId, message, { frameId });
    },
    notifyRestrictedPage: async (notification) => {
      await browserApi.notifications.create("copy-table:restricted-page", notification);
    },
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
