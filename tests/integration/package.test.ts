import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const testOutputRoot = resolve(projectRoot, ".copy-table-test-output");
const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  await mkdir(testOutputRoot, { recursive: true });

  const directory = await mkdtemp(resolve(testOutputRoot, "release-"));

  temporaryDirectories.push(directory);
  return directory;
}

function testOutputOverride(artifactsDirectory: string): string {
  return relative(testOutputRoot, artifactsDirectory);
}

function runBuildCommand(command: string, artifactsOverride: string) {
  return spawnSync(process.execPath, ["scripts/build.mjs", command], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      COPY_TABLE_ARTIFACTS_DIR: artifactsOverride
    }
  });
}

async function releaseArchivePath(artifactsDirectory: string): Promise<string> {
  expect(existsSync(artifactsDirectory)).toBe(true);

  const archiveEntries = await readdir(artifactsDirectory);
  const archives = archiveEntries.filter((entry) => /\.(?:xpi|zip)$/u.test(entry));

  expect(archives).toHaveLength(1);
  return resolve(artifactsDirectory, archives[0]!);
}

function archiveHash(archivePath: string): string {
  return createHash("sha256").update(readFileSync(archivePath)).digest("hex");
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .flatMap((directory) => [
        rm(directory, { force: true, recursive: true }),
        rm(resolve(projectRoot, testOutputOverride(directory)), { force: true, recursive: true })
      ])
  );
});

describe("Firefox release archive", () => {
  it("accepts a contained repository-local test-output override", async () => {
    const artifactsDirectory = await createTemporaryDirectory();
    const packageResult = runBuildCommand("package", testOutputOverride(artifactsDirectory));

    expect(packageResult.status, packageResult.stderr).toBe(0);
    await releaseArchivePath(artifactsDirectory);
  });

  it("creates byte-identical archives from the same committed inputs", async () => {
    const firstArtifactsDirectory = await createTemporaryDirectory();
    const firstPackageResult = runBuildCommand(
      "package",
      testOutputOverride(firstArtifactsDirectory)
    );

    expect(firstPackageResult.status, firstPackageResult.stderr).toBe(0);
    const firstArchivePath = await releaseArchivePath(firstArtifactsDirectory);

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_100));

    const secondArtifactsDirectory = await createTemporaryDirectory();
    const secondPackageResult = runBuildCommand(
      "package",
      testOutputOverride(secondArtifactsDirectory)
    );

    expect(secondPackageResult.status, secondPackageResult.stderr).toBe(0);
    expect(archiveHash(await releaseArchivePath(secondArtifactsDirectory))).toBe(
      archiveHash(firstArchivePath)
    );
  });

  it("contains only reviewed runtime files and no remote-code markers", async () => {
    const artifactsDirectory = await createTemporaryDirectory();
    const packageResult = runBuildCommand("package", testOutputOverride(artifactsDirectory));

    expect(packageResult.status, packageResult.stderr).toBe(0);

    const archive = await JSZip.loadAsync(
      readFileSync(await releaseArchivePath(artifactsDirectory))
    );
    const files = Object.values(archive.files).filter((file) => !file.dir);

    expect(files.map((file) => file.name).sort()).toEqual([
      "background.js",
      "manifest.json",
      "popup/index.html",
      "popup/popup.css",
      "popup/popup.js"
    ]);

    const packagedJavaScript = await Promise.all(
      files.filter((file) => file.name.endsWith(".js")).map(async (file) => file.async("string"))
    );

    expect(packagedJavaScript.join("\n")).not.toMatch(
      /https?:\/\/|\b(?:fetch|XMLHttpRequest|WebSocket|eval|Function|importScripts)\b/u
    );
  });

  it("removes the release artifact when verification fails", async () => {
    const artifactsDirectory = await createTemporaryDirectory();
    const failureFixturePath = resolve(projectRoot, "src/.verify-failure.fixture.ts");

    await writeFile(failureFixturePath, 'export const verifyFailure="format";\n');

    try {
      const verifyResult = runBuildCommand("verify", testOutputOverride(artifactsDirectory));

      expect(verifyResult.status).not.toBe(0);
      expect(existsSync(artifactsDirectory)).toBe(false);
    } finally {
      await rm(failureFixturePath, { force: true });
    }
  });

  it.each([
    ["test-output root", "."],
    ["repository root", projectRoot],
    ["parent traversal", "../outside-test-output"],
    ["arbitrary absolute path", resolve(tmpdir(), "copy-table-unsafe-artifacts")]
  ])("rejects an unsafe artifact override: %s", (_description, artifactsOverride) => {
    const cleanResult = runBuildCommand("clean", artifactsOverride);

    expect(cleanResult.status).not.toBe(0);
    expect(cleanResult.stderr).toContain("COPY_TABLE_ARTIFACTS_DIR");
  });
});
