import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { By } from "selenium-webdriver";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  extensionArchiveFileName,
  resolveArtifactsDirectory
} from "../../scripts/artifact-path.mjs";
import { startFixtureServer, type FixtureServer } from "./support/fixture-server";
import {
  enterFrame,
  installExtension,
  launchFirefox,
  pressCopyTableShortcut,
  readClipboard,
  readClipboardRepresentations,
  waitForClipboardChange,
  waitForToast,
  writeClipboard,
  type FirefoxDriver
} from "./support/firefox";

const projectRoot = resolve(import.meta.dirname, "../..");
const fixturesDirectory = resolve(projectRoot, "tests/fixtures");
const diagnosticsDirectory = resolve(projectRoot, ".copy-table-test-output/e2e");
const CLIPBOARD_SENTINEL = "copy-table e2e: clipboard not yet written";
const NO_TABLE_TOAST = "No table found at the selected location.";

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

function expectedOutputs(fixture: string): { csv: string; text: string } {
  return JSON.parse(
    readFileSync(resolve(fixturesDirectory, `tables/expected/${fixture}.json`), "utf8")
  ) as { csv: string; text: string };
}

function expectedCsv(fixture: string): string {
  return expectedOutputs(fixture).csv;
}

function count(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** The exact CSV success toast for a table of `rows` by `columns` (issue #13). */
function csvToast(rows: number, columns: number): string {
  return `Copied ${count(rows, "row", "rows")} × ${count(columns, "column", "columns")} as CSV.`;
}

/** The CSV success toast for a fixture, sized from its reviewed plain-text output. */
function fixtureCsvToast(fixture: string): string {
  const lines = expectedOutputs(fixture).text.split("\n");
  const widths = new Set(lines.map((line) => line.split("\t").length));
  if (widths.size !== 1) {
    throw new Error(`${fixture}: ragged plain-text output, can't derive its size`);
  }
  return csvToast(lines.length, [...widths][0] ?? 0);
}

describe("Firefox keyboard shortcut copy flow", () => {
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
      const fileName = `shortcut-${task.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      await writeFile(resolve(diagnosticsDirectory, fileName), screenshot, "base64");
    });
  });

  /** Loads `path` in the current tab and puts a known value on the clipboard. */
  async function openPage(path: string): Promise<void> {
    await driver.switchTo().defaultContent();
    await driver.get(server.url(path));
    await writeClipboard(driver, CLIPBOARD_SENTINEL);
  }

  /** Selects the text of the element matching `selector` in the current frame. */
  async function selectTextOf(selector: string): Promise<void> {
    await driver.executeScript(
      `const range = document.createRange();
       range.selectNodeContents(document.querySelector(arguments[0]));
       getSelection().removeAllRanges();
       getSelection().addRange(range);`,
      selector
    );
  }

  it("copies the table holding the selected text as CSV", async () => {
    await openPage("tables/complex-table.html");
    await selectTextOf("#source > tbody > tr > td");

    await pressCopyTableShortcut(driver);

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedCsv("complex-table")
    );
    expect((await readClipboardRepresentations(driver)).types).toEqual(["text/plain"]);
    expect(await waitForToast(driver)).toBe(fixtureCsvToast("complex-table"));
  });

  it("copies the ARIA grid holding the selected text as CSV", async () => {
    await openPage("tables/aria-grid-table.html");
    await selectTextOf('[role="gridcell"]');

    await pressCopyTableShortcut(driver);

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedCsv("aria-grid-table")
    );
    expect(await waitForToast(driver)).toBe(fixtureCsvToast("aria-grid-table"));
  });

  it("copies the nested table under the caret a click leaves", async () => {
    await openPage("tables/nested-table.html");
    await driver.findElement(By.css("#inner td")).click();

    await pressCopyTableShortcut(driver);

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe("Inner text");
    expect(await waitForToast(driver)).toBe(csvToast(1, 1));
  });

  it("copies the table holding a focused link", async () => {
    await openPage("tables/multi-row-header-table.html");
    await driver.executeScript(`document.querySelector("td a").focus();`);

    await pressCopyTableShortcut(driver);

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedCsv("multi-row-header-table")
    );
    expect(await waitForToast(driver)).toBe(fixtureCsvToast("multi-row-header-table"));
  });

  it("explains a miss and leaves the clipboard unchanged for a selection outside any table", async () => {
    await openPage("pages/frame-host.html");
    await selectTextOf("#outside");

    await pressCopyTableShortcut(driver);

    // The outcome toast is only sent after the copy attempt has finished.
    expect(await waitForToast(driver)).toBe(NO_TABLE_TOAST);
    expect(await readClipboard(driver)).toBe(CLIPBOARD_SENTINEL);
  });

  it("copies a table in a focused same-origin iframe from the top frame", async () => {
    await openPage("pages/frame-host.html");
    await enterFrame(driver, "#same-origin-frame");
    // A real click moves focus into the frame and leaves a caret in the cell.
    await driver.findElement(By.css("td")).click();
    await driver.switchTo().defaultContent();

    await pressCopyTableShortcut(driver);

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedCsv("basic-table")
    );
    // The shortcut runs in the top frame, so its toast is shown there.
    expect(await waitForToast(driver)).toBe(fixtureCsvToast("basic-table"));
  });
});
