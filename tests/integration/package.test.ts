import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const artifactsDirectory = resolve(projectRoot, "web-ext-artifacts");

function runBuildCommand(command: string) {
  return spawnSync(process.execPath, ["scripts/build.mjs", command], {
    cwd: projectRoot,
    encoding: "utf8"
  });
}

function readArchiveEntries(archivePath: string): string[] {
  const archive = readFileSync(archivePath);
  const endOfCentralDirectorySignature = 0x06054b50;
  const centralDirectorySignature = 0x02014b50;
  const minimumEndOfCentralDirectoryOffset = Math.max(0, archive.length - 65_557);
  let endOfCentralDirectoryOffset = -1;

  for (
    let offset = archive.length - 22;
    offset >= minimumEndOfCentralDirectoryOffset;
    offset -= 1
  ) {
    if (archive.readUInt32LE(offset) === endOfCentralDirectorySignature) {
      endOfCentralDirectoryOffset = offset;
      break;
    }
  }

  if (endOfCentralDirectoryOffset === -1) {
    throw new Error("The Firefox archive does not contain a ZIP central directory.");
  }

  const entryCount = archive.readUInt16LE(endOfCentralDirectoryOffset + 10);
  let entryOffset = archive.readUInt32LE(endOfCentralDirectoryOffset + 16);
  const entries: string[] = [];

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (archive.readUInt32LE(entryOffset) !== centralDirectorySignature) {
      throw new Error("The Firefox archive has an invalid ZIP central directory entry.");
    }

    const fileNameLength = archive.readUInt16LE(entryOffset + 28);
    const extraFieldLength = archive.readUInt16LE(entryOffset + 30);
    const fileCommentLength = archive.readUInt16LE(entryOffset + 32);

    entries.push(archive.toString("utf8", entryOffset + 46, entryOffset + 46 + fileNameLength));
    entryOffset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries.sort();
}

describe("Firefox release archive", () => {
  it("builds from a clean checkout with only the reviewed release files", () => {
    expect(runBuildCommand("clean").status).toBe(0);

    const packageResult = runBuildCommand("package");

    expect(packageResult.status, packageResult.stderr).toBe(0);
    expect(existsSync(artifactsDirectory)).toBe(true);

    const archives = readdirSync(artifactsDirectory).filter((entry) =>
      /\.(?:xpi|zip)$/u.test(entry)
    );

    expect(archives).toHaveLength(1);
    expect(
      readArchiveEntries(resolve(artifactsDirectory, archives[0]!)).filter(
        (entry) => !entry.endsWith("/")
      )
    ).toEqual([
      "background.js",
      "manifest.json",
      "popup/index.html",
      "popup/popup.css",
      "popup/popup.js"
    ]);
  });
});
