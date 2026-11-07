import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { By } from "selenium-webdriver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  extensionArchiveFileName,
  resolveArtifactsDirectory
} from "../../scripts/artifact-path.mjs";
import { startFixtureServer, type FixtureServer } from "./support/fixture-server";
import {
  copyViaContextMenu,
  installExtension,
  launchFirefox,
  waitForClipboardChange,
  waitForToast,
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

async function expectedOutputs(fixture: string): Promise<Record<string, string>> {
  return JSON.parse(
    await readFile(resolve(fixturesDirectory, `tables/expected/${fixture}.json`), "utf8")
  ) as Record<string, string>;
}

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

  it("copies the right-clicked table as CSV", async ({ onTestFailed, task }) => {
    onTestFailed(async () => {
      const screenshot = await driver.takeScreenshot();
      const fileName = `${task.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      await writeFile(resolve(diagnosticsDirectory, fileName), screenshot, "base64");
    });

    await driver.get(server.url("tables/complex-table.html"));
    await writeClipboard(driver, CLIPBOARD_SENTINEL);

    const cell = await driver.findElement(By.css("#source thead th"));
    await copyViaContextMenu(driver, cell, "csv");

    const copied = await waitForClipboardChange(driver, CLIPBOARD_SENTINEL);
    expect(copied).toBe((await expectedOutputs("complex-table")).csv);
    expect(await waitForToast(driver)).toBe("Copied as CSV.");
  });
});
