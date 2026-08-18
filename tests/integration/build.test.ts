import { existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const distDirectory = resolve(projectRoot, "dist");

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
      "manifest.json",
      "popup",
      "popup/index.html",
      "popup/popup.css",
      "popup/popup.js"
    ]);
  });
});
