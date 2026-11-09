import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { By } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  extensionArchiveFileName,
  resolveArtifactsDirectory
} from "../../scripts/artifact-path.mjs";
import type { CopyFormat } from "../../src/table/model";
import { startFixtureServer, type FixtureServer } from "./support/fixture-server";
import {
  copyViaContextMenu,
  enterFrame,
  firstVisibleCellOfFirstTable,
  installExtension,
  launchFirefox,
  readClipboard,
  readClipboardRepresentations,
  waitForClipboardChange,
  waitForToast,
  waitForToastElement,
  writeClipboard,
  type FirefoxDriver
} from "./support/firefox";

const projectRoot = resolve(import.meta.dirname, "../..");
const fixturesDirectory = resolve(projectRoot, "tests/fixtures");
const diagnosticsDirectory = resolve(projectRoot, ".copy-table-test-output/e2e");
const CLIPBOARD_SENTINEL = "copy-table e2e: clipboard not yet written";

async function packagedArchivePath(): Promise<string> {
  const manifest = JSON.parse(
    await readFile(resolve(projectRoot, "src/manifest.json"), "utf8")
  ) as {
    version: string;
  };
  const artifactsDirectory = await resolveArtifactsDirectory({
    artifactsOverride: process.env.COPY_TABLE_ARTIFACTS_DIR,
    projectRoot
  });
  const archivePath = resolve(artifactsDirectory, extensionArchiveFileName(manifest.version));
  if (!existsSync(archivePath)) {
    throw new Error(`No packaged extension at ${archivePath}. Run \`bun run package\` first.`);
  }
  return archivePath;
}

const FORMATS: readonly CopyFormat[] = ["html", "markdown", "text", "csv"];
const SUCCESS_TOAST: Record<CopyFormat, string> = {
  html: "Copied as HTML.",
  markdown: "Copied as Markdown.",
  text: "Copied as Plain text.",
  csv: "Copied as CSV."
};
const NO_TABLE_TOAST = "No table found at the selected location.";

// Every fixture with reviewed expected output (see tests/fixtures/tables/expected/).
const expectedDirectory = resolve(fixturesDirectory, "tables/expected");
const fixtures = readdirSync(expectedDirectory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => basename(file, ".json"))
  .sort();

function expectedOutputs(fixture: string): Record<CopyFormat, string> {
  return JSON.parse(readFileSync(resolve(expectedDirectory, `${fixture}.json`), "utf8")) as Record<
    CopyFormat,
    string
  >;
}

const matrix = fixtures.flatMap((fixture) => FORMATS.map((format) => ({ fixture, format })));

describe("Firefox right-click copy flow", () => {
  let driver: FirefoxDriver;
  let server: FixtureServer;

  beforeAll(async () => {
    const archivePath = await packagedArchivePath();
    server = await startFixtureServer(fixturesDirectory);
    driver = await launchFirefox({ diagnosticsDirectory });
    await installExtension(driver, archivePath);
  });

  afterAll(async () => {
    await driver?.quit();
    await server?.close();
  });

  beforeEach(({ onTestFailed, task }) => {
    onTestFailed(async () => {
      const screenshot = await driver.takeScreenshot();
      const fileName = `${task.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      await writeFile(resolve(diagnosticsDirectory, fileName), screenshot, "base64");
    });
  });

  /** Loads `path` in the current tab and puts a known value on the clipboard. */
  async function openPage(path: string): Promise<void> {
    await driver.switchTo().defaultContent();
    await driver.get(server.url(path));
    await writeClipboard(driver, CLIPBOARD_SENTINEL);
  }

  it("covers at least the original fixture set", () => {
    // Guards against the matrix silently shrinking if expected files move.
    expect(fixtures).toEqual(expect.arrayContaining(["complex-table", "nested-table"]));
    expect(matrix.length).toBe(fixtures.length * FORMATS.length);
  });

  it.for(matrix)("copies $fixture as $format", async ({ fixture, format }) => {
    await openPage(`tables/${fixture}.html`);

    const cell = await firstVisibleCellOfFirstTable(driver);
    await copyViaContextMenu(driver, cell, format);

    const expected = expectedOutputs(fixture);
    const plainText = await waitForClipboardChange(driver, CLIPBOARD_SENTINEL);
    const { types, html } = await readClipboardRepresentations(driver);

    if (format === "html") {
      // One rich item: the markup for rich editors, the tab-separated text
      // for plain-text targets.
      expect(types).toEqual(["text/html", "text/plain"]);
      expect(html).toBe(expected.html);
      expect(plainText).toBe(expected.text);
    } else {
      expect(types).toEqual(["text/plain"]);
      expect(plainText).toBe(expected[format]);
    }
    expect(await waitForToast(driver)).toBe(SUCCESS_TOAST[format]);
  });

  it("copies only the inner table when a nested table's cell is right-clicked", async () => {
    await openPage("tables/nested-table.html");

    await copyViaContextMenu(driver, await driver.findElement(By.css("#inner td")), "csv");

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe("Inner text");
    expect(await waitForToast(driver)).toBe(SUCCESS_TOAST.csv);
  });

  it("explains a miss and leaves the clipboard unchanged outside any table", async () => {
    await openPage("pages/frame-host.html");

    await copyViaContextMenu(driver, await driver.findElement(By.css("#outside")), "csv");

    // The outcome toast is only sent after the copy attempt has finished.
    expect(await waitForToast(driver)).toBe(NO_TABLE_TOAST);
    expect(await readClipboard(driver)).toBe(CLIPBOARD_SENTINEL);
  });

  it("copies a table inside a same-origin iframe", async () => {
    await openPage("pages/frame-host.html");

    await enterFrame(driver, "#same-origin-frame");
    const cell = await firstVisibleCellOfFirstTable(driver);
    await copyViaContextMenu(driver, cell, "csv");

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedOutputs("basic-table").csv
    );
    // The toast is rendered in the frame the table lives in.
    await enterFrame(driver, "#same-origin-frame");
    expect(await waitForToast(driver)).toBe(SUCCESS_TOAST.csv);
  });

  it("shows the toast on a page whose CSS tries to hide or restyle it", async () => {
    await openPage("pages/hostile-css.html");

    const cell = await firstVisibleCellOfFirstTable(driver);
    await copyViaContextMenu(driver, cell, "markdown");

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedOutputs("basic-table").markdown
    );
    const toast = await waitForToastElement(driver);
    expect(await toast.getText()).toBe(SUCCESS_TOAST.markdown);
    expect(await toast.isDisplayed()).toBe(true);

    // Rendered at its own size, in the viewport's bottom-right corner, with
    // its own typography rather than the page's.
    const rect = await toast.getRect();
    const viewport = (await driver.executeScript(
      "return { width: innerWidth, height: innerHeight };"
    )) as { width: number; height: number };
    expect(rect.width).toBeGreaterThan(50);
    expect(rect.height).toBeGreaterThan(10);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
    expect(rect.x).toBeGreaterThan(viewport.width / 2);
    expect(rect.y).toBeGreaterThan(viewport.height / 2);
    expect(await toast.getCssValue("font-size")).toBe("13px");
    expect(await toast.getCssValue("letter-spacing")).toBe("normal");
    expect(await toast.getCssValue("color")).toBe("rgb(255, 255, 255)");
    expect(await toast.getCssValue("visibility")).toBe("visible");
  });
});
