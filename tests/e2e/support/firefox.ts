import { mkdirSync, openSync } from "node:fs";
import { join, resolve } from "node:path";
import { By, until, type WebElement } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";
import type { CopyFormat } from "../../../src/table/model";

/** Labels of the "Copy table as" submenu items, as created by `src/browser/context-menu.ts`. */
const MENU_LABELS: Record<CopyFormat, string> = {
  html: "HTML",
  "html-source": "HTML source",
  markdown: "Markdown",
  text: "Plain text",
  csv: "CSV",
  json: "JSON"
};

const COPY_AS_LABEL = "Copy table as";
/** The toast's host element; the toast itself is in the host's closed shadow root. */
const FEEDBACK_SELECTOR = "[data-copy-table-feedback]";
const TOAST_LIVE_REGION_SELECTOR = '[role="status"][aria-live="polite"][aria-atomic="true"]';
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

export interface ClipboardRepresentations {
  /** MIME types on the clipboard's single item, sorted. */
  types: string[];
  /** The `text/html` representation, if any, with Firefox's read wrapper removed. */
  html: string | null;
}

/**
 * Reads every representation on the clipboard. Firefox hands `text/html` back
 * wrapped in `<html><head></head><body>…</body></html>`; that wrapper is
 * stripped so the result can be compared with the serializer output.
 */
export function readClipboardRepresentations(
  driver: FirefoxDriver
): Promise<ClipboardRepresentations> {
  return inChromeContext(driver, async () => {
    const result = (await driver.executeAsyncScript(
      `const done = arguments[0];
       (async () => {
         const items = await navigator.clipboard.read();
         if (items.length !== 1) throw new Error("Expected one clipboard item, found " + items.length);
         const [item] = items;
         const types = [...item.types].sort();
         const html = types.includes("text/html")
           ? await (await item.getType("text/html")).text()
           : null;
         return { types, html };
       })().then(done, (error) => done({ error: String(error) }));`
    )) as { types?: string[]; html?: string | null; error?: string };
    if (!Array.isArray(result.types)) {
      throw new Error(`Could not read the clipboard item: ${result.error ?? "no types"}`);
    }
    const html =
      typeof result.html === "string"
        ? result.html.replace(/^<html><head><\/head><body>([\s\S]*)<\/body><\/html>$/, "$1")
        : null;
    return { types: result.types, html };
  });
}

/**
 * WebDriver clicks an element's centre, which may be covered by a descendant
 * (for example a nested table inside a cell). Returns an offset from the centre
 * of `target` at which hit-testing lands on `target` itself or a descendant that
 * is not inside a nested table of its own.
 */
async function ownHitPoint(
  driver: FirefoxDriver,
  target: WebElement
): Promise<{ x: number; y: number }> {
  const point = (await driver.executeScript(
    `const target = arguments[0];
     const ownTable = target.closest("table");
     const rect = target.getBoundingClientRect();
     const centreX = rect.left + rect.width / 2;
     const centreY = rect.top + rect.height / 2;
     const hits = (x, y) => {
       const hit = document.elementFromPoint(x, y);
       return hit !== null && target.contains(hit) && hit.closest("table") === ownTable;
     };
     if (hits(centreX, centreY)) return { x: 0, y: 0 };
     for (let y = rect.top + 1; y < rect.bottom; y += 2) {
       for (let x = rect.left + 1; x < rect.right; x += 2) {
         if (hits(x, y)) return { x: Math.round(x - centreX), y: Math.round(y - centreY) };
       }
     }
     return null;`,
    target
  )) as { x: number; y: number } | null;
  if (!point) {
    throw new Error("No point of the target element can be right-clicked directly.");
  }
  return point;
}

/**
 * Right-clicks `target` with a real WebDriver pointer action, then chooses
 * "Copy table as" -> `format` in Firefox's own context menu. This drives the real
 * `menus.onClicked` path, including `targetElementId` and
 * `menus.getTargetElement`, rather than calling the extension directly.
 */
export async function copyViaContextMenu(
  driver: FirefoxDriver,
  target: WebElement,
  format: CopyFormat
): Promise<void> {
  const { x, y } = await ownHitPoint(driver, target);
  await driver.actions().move({ origin: target, x, y }).contextClick().perform();

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

/**
 * Waits for the extension's in-page toast and returns its live region: the
 * element holding the text, inside the host's closed shadow root.
 *
 * Page scripts can't reach a closed root, and the host's own `getText()` is
 * empty because its rendered text lives in the shadow tree. WebDriver's Get
 * Element Shadow Root command can: geckodriver (Marionette) resolves it with
 * the privileged `openOrClosedShadowRoot`, so closed roots are returned too.
 */
export async function waitForToastElement(driver: FirefoxDriver): Promise<WebElement> {
  const host = await driver.wait(
    until.elementLocated(By.css(FEEDBACK_SELECTOR)),
    WAIT_TIMEOUT_MS,
    "The copy toast did not appear."
  );
  let root;
  try {
    root = await host.getShadowRoot();
  } catch (error) {
    throw new Error(`WebDriver did not expose the toast's closed shadow root: ${String(error)}`);
  }
  return root.findElement(By.css(TOAST_LIVE_REGION_SELECTOR));
}

/** Waits for the extension's in-page toast and returns its rendered text. */
export async function waitForToast(driver: FirefoxDriver): Promise<string> {
  return (await waitForToastElement(driver)).getText();
}

/**
 * Returns the first rendered cell that belongs directly to the page's first
 * `<table>` (the table each expected-output fixture describes). Cells hidden by
 * the visibility fixtures can't be right-clicked, and cells of a nested table
 * would copy the nested table instead. ARIA `table`, `grid` and `treegrid`
 * roots count as tables too, so the first root in document order is used,
 * whichever kind it is (no table fixture contains an ARIA root).
 */
export async function firstVisibleCellOfFirstTable(driver: FirefoxDriver): Promise<WebElement> {
  const cell = (await driver.executeScript(
    `const ariaRole = (element) =>
       (element.getAttribute("role") ?? "").trim().split(/\\s+/u)[0].toLowerCase();
     const isAriaRoot = (element) => ["table", "grid", "treegrid"].includes(ariaRole(element));
     const closestRoot = (element) => {
       for (let current = element; current !== null; current = current.parentElement) {
         if (current.localName === "table" || isAriaRoot(current)) return current;
       }
       return null;
     };
     const table = [...document.querySelectorAll("table, [role]")].find(
       (element) => element.localName === "table" || isAriaRoot(element)
     );
     if (!table) return null;
     const cells =
       table.localName === "table"
         ? table.querySelectorAll("th, td")
         : [...table.querySelectorAll("[role]")].filter((element) =>
             ["cell", "gridcell", "columnheader", "rowheader"].includes(ariaRole(element))
           );
     return [...cells].find(
       (cell) =>
         closestRoot(cell) === table &&
         cell.getClientRects().length > 0 &&
         getComputedStyle(cell).visibility === "visible"
     ) ?? null;`
  )) as WebElement | null;
  if (!cell) {
    throw new Error("The page's first table has no visible cell to right-click.");
  }
  return cell;
}

/** Switches WebDriver commands into the `<iframe>` matching `selector` on the top-level page. */
export async function enterFrame(driver: FirefoxDriver, selector: string): Promise<void> {
  await driver.switchTo().defaultContent();
  await driver.switchTo().frame(await driver.findElement(By.css(selector)));
}

export type { FirefoxDriver };
