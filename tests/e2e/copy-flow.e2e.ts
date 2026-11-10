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

const FORMATS: readonly CopyFormat[] = ["html", "html-source", "markdown", "text", "csv", "json"];
const FORMAT_LABELS: Record<CopyFormat, string> = {
  html: "HTML",
  "html-source": "HTML source",
  markdown: "Markdown",
  text: "Plain text",
  csv: "CSV",
  json: "JSON"
};

interface TableSize {
  rows: number;
  columns: number;
}

function count(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** The exact success toast for a copy of a table of `size` (issue #13). */
function successToast(format: CopyFormat, size: TableSize): string {
  return (
    `Copied ${count(size.rows, "row", "rows")} × ` +
    `${count(size.columns, "column", "columns")} as ${FORMAT_LABELS[format]}.`
  );
}
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

/**
 * The copied table's size, read from its reviewed plain-text output: one line
 * per logical row (header and footer rows included), one tab-separated field
 * per column. Cell text never contains a newline or tab in that format.
 */
function fixtureSize(fixture: string): TableSize {
  const lines = expectedOutputs(fixture).text.split("\n");
  const widths = new Set(lines.map((line) => line.split("\t").length));
  if (widths.size !== 1) {
    throw new Error(`${fixture}: ragged plain-text output, can't derive its size`);
  }
  return { rows: lines.length, columns: [...widths][0] ?? 0 };
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
    expect(fixtures).toEqual(
      expect.arrayContaining(["complex-table", "nested-table", "aria-grid-table"])
    );
    expect(matrix.length).toBe(fixtures.length * FORMATS.length);
  });

  it("derives the reviewed table sizes the toasts report", () => {
    // Spot-checks fixtureSize against sizes counted by hand from the fixtures.
    expect(fixtureSize("basic-table")).toEqual({ rows: 2, columns: 1 });
    expect(fixtureSize("nested-table")).toEqual({ rows: 1, columns: 1 });
    // One header row, three body rows and one footer row.
    expect(fixtureSize("complex-table")).toEqual({ rows: 5, columns: 3 });
    expect(fixtureSize("multi-row-header-table")).toEqual({ rows: 4, columns: 3 });
    expect(fixtureSize("rowspan-row-groups-table")).toEqual({ rows: 5, columns: 2 });
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
    } else if (format === "html-source") {
      // The same reviewed markup as "html", but as plain text only, so code
      // editors and other plain-text targets receive the HTML itself.
      expect(types).toEqual(["text/plain"]);
      expect(plainText).toBe(expected.html);
    } else {
      expect(types).toEqual(["text/plain"]);
      expect(plainText).toBe(expected[format]);
    }
    expect(await waitForToast(driver)).toBe(successToast(format, fixtureSize(fixture)));
  });

  it("copies only the inner table when a nested table's cell is right-clicked", async () => {
    await openPage("tables/nested-table.html");

    await copyViaContextMenu(driver, await driver.findElement(By.css("#inner td")), "csv");

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe("Inner text");
    // The inner table's own size, not the outer table's.
    expect(await waitForToast(driver)).toBe("Copied 1 row × 1 column as CSV.");
  });

  it("copies the closest root inside an ARIA table: a nested grid or a nested <table>", async () => {
    await openPage("tables/aria-nested-table.html");
    await copyViaContextMenu(
      driver,
      await driver.findElement(By.css("#inner-grid [role=gridcell]")),
      "csv"
    );
    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe("Inner grid text");
    expect(await waitForToast(driver)).toBe(successToast("csv", { rows: 1, columns: 1 }));

    await openPage("tables/aria-nested-table.html");
    await copyViaContextMenu(driver, await driver.findElement(By.css("#inner-table td")), "csv");
    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe("Inner table text");
    expect(await waitForToast(driver)).toBe(successToast("csv", { rows: 1, columns: 1 }));
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
    expect(await waitForToast(driver)).toBe(successToast("csv", fixtureSize("basic-table")));
  });

  it("shows the toast on a page whose CSS tries to hide or restyle it", async () => {
    await openPage("pages/hostile-css.html");

    const cell = await firstVisibleCellOfFirstTable(driver);
    await copyViaContextMenu(driver, cell, "markdown");

    expect(await waitForClipboardChange(driver, CLIPBOARD_SENTINEL)).toBe(
      expectedOutputs("basic-table").markdown
    );
    const toast = await waitForToastElement(driver);
    // The page's table has basic-table's shape: one header row, one value row.
    expect(await toast.getText()).toBe("Copied 2 rows × 1 column as Markdown.");
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
