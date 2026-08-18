import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const distDirectory = resolve(projectRoot, "dist");

function readBuildContents(): Record<string, string> {
  return Object.fromEntries(
    readdirSync(distDirectory, { recursive: true })
      .map((path) => String(path).replaceAll("\\", "/"))
      .filter((path) => statSync(resolve(distDirectory, path)).isFile())
      .sort()
      .map((path) => [
        path,
        createHash("sha256")
          .update(readFileSync(resolve(distDirectory, path)))
          .digest("hex")
      ])
  );
}

describe("clean Firefox extension build", () => {
  it("emits only the required installable files from a clean directory", () => {
    execFileSync(process.execPath, ["scripts/build.mjs", "clean"], {
      cwd: projectRoot,
      stdio: "pipe"
    });
    execFileSync(process.execPath, ["scripts/build.mjs", "build"], {
      cwd: projectRoot,
      stdio: "pipe"
    });

    expect(existsSync(distDirectory)).toBe(true);
    expect(
      readdirSync(distDirectory, { recursive: true })
        .map((path) => String(path).replaceAll("\\", "/"))
        .sort()
    ).toEqual([
      "background.js",
      "content",
      "content/content-handler.js",
      "manifest.json",
      "popup",
      "popup/index.html",
      "popup/popup.css",
      "popup/popup.js"
    ]);
  });

  it("produces equivalent release files when rebuilt from the same committed inputs", () => {
    execFileSync(process.execPath, ["scripts/build.mjs", "build"], {
      cwd: projectRoot,
      stdio: "pipe"
    });
    const firstBuildContents = readBuildContents();

    execFileSync(process.execPath, ["scripts/build.mjs", "build"], {
      cwd: projectRoot,
      stdio: "pipe"
    });

    expect(readBuildContents()).toEqual(firstBuildContents);
  });
});
