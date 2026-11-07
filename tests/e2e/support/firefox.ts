import { mkdirSync, openSync } from "node:fs";
import { join, resolve } from "node:path";
import { By, until, type WebElement } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";
import type { CopyFormat } from "../../../src/table/model";

/** Labels of the "Copy as" submenu items, as created by `src/browser/context-menu.ts`. */
const MENU_LABELS: Record<CopyFormat, string> = {
  html: "HTML",
  markdown: "Markdown",
  text: "Plain text",
  csv: "CSV"
};

const COPY_AS_LABEL = "Copy as";
const FEEDBACK_SELECTOR = "[data-copy-table-feedback]";
const WAIT_TIMEOUT_MS = 10_000;

// `installWebExtension` exists at runtime (selenium-webdriver >= 4.4x) but is
// not yet in @types/selenium-webdriver.
type FirefoxDriver = firefox.Driver & {
  installWebExtension(path: string, options: { permanent: boolean }): Promise<string>;
};

export interface LaunchOptions {
  /** Directory for the geckodriver log; created if missing. */
  diagnosticsDirectory: string;
}

function geckodriverExecutable(): string {
  if (process.env.GECKODRIVER_BIN) {
    return process.env.GECKODRIVER_BIN;
  }
  // GitHub's Ubuntu runner images expose the preinstalled driver's directory.
  if (process.env.GECKOWEBDRIVER) {
    return join(process.env.GECKOWEBDRIVER, "geckodriver");
  }
  return "geckodriver";
}

/**
 * Starts headless Firefox through geckodriver with access to the browser's
 * privileged ("chrome") context, which is how the tests reach Firefox's own
 * context menu and clipboard. Uses `FIREFOX_BIN` when set, otherwise the
 * `firefox` on PATH.
 */
export async function launchFirefox({
  diagnosticsDirectory
}: LaunchOptions): Promise<FirefoxDriver> {
  mkdirSync(diagnosticsDirectory, { recursive: true });
  const log = openSync(resolve(diagnosticsDirectory, "geckodriver.log"), "a");

  const options = new firefox.Options().addArguments("-headless");
  if (process.env.FIREFOX_BIN) {
    options.setBinary(process.env.FIREFOX_BIN);
  }

  // An explicit executable also keeps Selenium Manager from trying to
  // download a driver or browser.
  const service = new firefox.ServiceBuilder(geckodriverExecutable())
    .addArguments("--allow-system-access")
    .setStdio(["ignore", log, log])
    .build();

  const driver = firefox.Driver.createSession(options, service) as FirefoxDriver;
  await driver.getSession();
  return driver;
}

export async function installExtension(driver: FirefoxDriver, archivePath: string): Promise<void> {
  // Unsigned builds can only be installed temporarily.
  await driver.installWebExtension(archivePath, { permanent: false });
}

async function inChromeContext<T>(driver: FirefoxDriver, action: () => Promise<T>): Promise<T> {
  await driver.setContext(firefox.Context.CHROME);
  try {
    return await action();
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

export function writeClipboard(driver: FirefoxDriver, text: string): Promise<void> {
  return inChromeContext(driver, async () => {
    const error = await driver.executeAsyncScript(
      `const [text, done] = arguments;
       navigator.clipboard.writeText(text).then(() => done(null), (error) => done(String(error)));`,
      text
    );
    if (error) {
      throw new Error(`Could not seed the clipboard: ${String(error)}`);
    }
  });
}

export function readClipboard(driver: FirefoxDriver): Promise<string> {
  return inChromeContext(driver, async () => {
    const result = (await driver.executeAsyncScript(
      `const done = arguments[0];
       navigator.clipboard.readText().then((text) => done({ text }), (error) => done({ error: String(error) }));`
    )) as { text?: string; error?: string };
    if (typeof result.text !== "string") {
      throw new Error(`Could not read the clipboard: ${result.error ?? "no text"}`);
    }
    return result.text;
  });
}

/**
 * Right-clicks `target` with a real WebDriver pointer action, then chooses
 * "Copy as" -> `format` in Firefox's own context menu. This drives the real
 * `menus.onClicked` path, including `targetElementId` and
 * `menus.getTargetElement`, rather than calling the extension directly.
 */
export async function copyViaContextMenu(
  driver: FirefoxDriver,
  target: WebElement,
  format: CopyFormat
): Promise<void> {
  await driver.actions().contextClick(target).perform();

  await inChromeContext(driver, async () => {
    const result = (await driver.executeAsyncScript(
      `const [parentLabel, itemLabel, timeoutMs, done] = arguments;
       const waitFor = async (check, what) => {
         const deadline = Date.now() + timeoutMs;
         while (!check()) {
           if (Date.now() > deadline) throw new Error("Timed out waiting for " + what);
           await new Promise((resolve) => setTimeout(resolve, 50));
         }
       };
       (async () => {
         const menu = document.getElementById("contentAreaContextMenu");
         await waitFor(() => menu.state === "open", "the context menu to open");
         const parent = [...menu.querySelectorAll("menu")].find(
           (element) => element.getAttribute("label") === parentLabel && !element.hidden
         );
         if (!parent) throw new Error("No visible '" + parentLabel + "' menu");
         const item = [...parent.menupopup.children].find(
           (element) => element.getAttribute("label") === itemLabel
         );
         if (!item) throw new Error("No '" + itemLabel + "' item under '" + parentLabel + "'");
         parent.openMenu(true);
         await waitFor(() => parent.menupopup.state === "open", "the '" + parentLabel + "' submenu");
         parent.menupopup.activateItem(item);
         await waitFor(() => menu.state === "closed", "the context menu to close");
       })().then(() => done({ ok: true }), (error) => done({ ok: false, error: String(error) }));`,
      COPY_AS_LABEL,
      MENU_LABELS[format],
      WAIT_TIMEOUT_MS
    )) as { ok: boolean; error?: string };
    if (!result.ok) {
      throw new Error(`Context menu interaction failed: ${result.error ?? "unknown error"}`);
    }
  });
}

/** Waits until the clipboard holds something other than `previous`, and returns it. */
export async function waitForClipboardChange(
  driver: FirefoxDriver,
  previous: string
): Promise<string> {
  let current = previous;
  await driver.wait(
    async () => {
      current = await readClipboard(driver);
      return current !== previous;
    },
    WAIT_TIMEOUT_MS,
    "The clipboard did not change after the copy."
  );
  return current;
}

/** Waits for the extension's in-page toast and returns its text. */
export async function waitForToast(driver: FirefoxDriver): Promise<string> {
  const toast = await driver.wait(
    until.elementLocated(By.css(FEEDBACK_SELECTOR)),
    WAIT_TIMEOUT_MS,
    "The copy toast did not appear."
  );
  return toast.getText();
}

export type { FirefoxDriver };
