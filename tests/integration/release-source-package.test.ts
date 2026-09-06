import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { collectRegularFiles, createReviewerSourceArchive } from "../../scripts/release.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const testRoot = resolve(projectRoot, ".copy-table-test-output/release-source-tests");
const artifactsDirectory = resolve(testRoot, "basic");
const forbiddenDirectory = resolve(projectRoot, ".reviewer-source-forbidden");
const environmentFixturePath = resolve(projectRoot, "src/.env.reviewer-fixture");
const credentialFixturePath = resolve(projectRoot, "src/credentials.json");
const npmrcFixturePath = resolve(projectRoot, "src/.npmrc");
const suffixedEnvFixturePath = resolve(projectRoot, "src/reviewer-fixture.env");
const privateKeyFixturePath = resolve(projectRoot, "src/reviewer-fixture.pem");
const sourceLinkPath = resolve(projectRoot, "src/.reviewer-source-link-fixture");
const deniedFixturePaths = [
  environmentFixturePath,
  credentialFixturePath,
  npmrcFixturePath,
  suffixedEnvFixturePath,
  privateKeyFixturePath
];

function archiveHash(archivePath: string): Promise<string> {
  return readFile(archivePath).then((content) =>
    createHash("sha256").update(content).digest("hex")
  );
}

// Windows refuses link creation without the privilege, so callers skip instead of failing.
async function createDirectoryLink(
  target: string,
  linkPath: string,
  context: { skip: (reason: string) => void }
): Promise<boolean> {
  try {
    await symlink(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    if (
      process.platform === "win32" &&
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "EACCES" || error.code === "EPERM")
    ) {
      context.skip("Windows denied creation of the symbolic-link fixture.");
      return false;
    }
    throw error;
  }
}

afterEach(async () => {
  await unlink(sourceLinkPath).catch(() => undefined);
  await Promise.all(deniedFixturePaths.map((path) => rm(path, { force: true })));
  await rm(testRoot, { force: true, recursive: true });
  await rm(forbiddenDirectory, { force: true, recursive: true });
});

describe("Firefox reviewer source package", () => {
  it("contains reviewed source, locked build inputs, tests, and reviewer instructions only", async () => {
    const archivePath = await createReviewerSourceArchive({
      artifactsDirectory,
      projectRoot,
      version: "1.0.0"
    });
    const archive = await JSZip.loadAsync(await readFile(archivePath));
    const entries = Object.keys(archive.files).filter((entry) => !archive.files[entry]?.dir);

    expect(archivePath).toBe(resolve(artifactsDirectory, "copy-table-source-1.0.0.zip"));
    expect(entries).toContain("src/manifest.json");
    expect(entries).toContain("scripts/build.mjs");
    expect(entries).toContain("tests/unit/manifest.test.ts");
    expect(entries).toContain("bun.lock");
    expect(entries).toContain("AMO_BUILD.md");
    expect(entries).toContain("amo-metadata.json");
    expect(entries).not.toContain(".github/workflows/build.yml");
    expect(entries).not.toContain("test.html");
    expect(entries.some((entry) => entry.startsWith("node_modules/"))).toBe(false);
    expect(entries.some((entry) => entry.startsWith("dist/"))).toBe(false);
  });

  it("creates byte-identical reviewer archives from identical inputs", async () => {
    const firstArchive = await createReviewerSourceArchive({
      artifactsDirectory: resolve(testRoot, "first"),
      projectRoot,
      version: "1.0.0"
    });
    const secondArchive = await createReviewerSourceArchive({
      artifactsDirectory: resolve(testRoot, "second"),
      projectRoot,
      version: "1.0.0"
    });

    expect(await archiveHash(secondArchive)).toBe(await archiveHash(firstArchive));
  });

  it("rejects a reviewer archive destination outside generated repository output", async () => {
    await expect(
      createReviewerSourceArchive({
        artifactsDirectory: forbiddenDirectory,
        projectRoot,
        version: "1.0.0"
      })
    ).rejects.toThrow(/artifact.*generated repository output/i);
  });

  it("rejects symbolic links in an allowed source directory", async (context) => {
    const targetDirectory = resolve(testRoot, "link-target");
    await mkdir(targetDirectory, { recursive: true });
    await writeFile(resolve(targetDirectory, "sentinel.txt"), "must not be archived\n");

    try {
      await symlink(
        targetDirectory,
        sourceLinkPath,
        process.platform === "win32" ? "junction" : "dir"
      );
    } catch (error) {
      if (
        process.platform === "win32" &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "EACCES" || error.code === "EPERM")
      ) {
        context.skip("Windows denied creation of the symbolic-link fixture.");
        return;
      }
      throw error;
    }

    await expect(
      createReviewerSourceArchive({
        artifactsDirectory: resolve(testRoot, "symlink"),
        projectRoot,
        version: "1.0.0"
      })
    ).rejects.toThrow(/symbolic link/i);
  });

  it.each([
    ["environment file", environmentFixturePath, "AMO_JWT_SECRET=fixture-only\n"],
    ["credential file", credentialFixturePath, '{"secret":"fixture-only"}\n'],
    ["registry configuration", npmrcFixturePath, "//registry.npmjs.org/:_authToken=fixture\n"],
    ["suffixed environment file", suffixedEnvFixturePath, "AMO_JWT_ISSUER=fixture-only\n"],
    ["private key", privateKeyFixturePath, "-----BEGIN PRIVATE KEY-----\nfixture\n"]
  ])("rejects a %s inside an allowed source directory", async (_kind, fixturePath, content) => {
    await writeFile(fixturePath, content);

    await expect(
      createReviewerSourceArchive({
        artifactsDirectory: resolve(testRoot, "environment-file"),
        projectRoot,
        version: "1.0.0"
      })
    ).rejects.toThrow(/environment or credential file/i);
  });

  // readdir follows a symbolic link that replaces the traversal root, so the root needs its own
  // check. Exercised through the exported collector rather than by replacing a real source
  // directory, which would leave the repository broken if the test aborted midway.
  it("rejects a source root that is itself a symbolic link", async (context) => {
    const targetDirectory = resolve(testRoot, "external-root-target");
    const linkedRoot = resolve(testRoot, "linked-root");

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(resolve(targetDirectory, "sentinel.txt"), "must not be archived\n");

    if (!(await createDirectoryLink(targetDirectory, linkedRoot, context))) {
      return;
    }

    await expect(collectRegularFiles(linkedRoot)).rejects.toThrow(/symbolic link/i);
  });

  it("rejects an archive destination reached through a symbolic link", async (context) => {
    const targetDirectory = resolve(testRoot, "external-destination");
    const linkedDestination = resolve(testRoot, "linked-destination");

    await mkdir(targetDirectory, { recursive: true });

    if (!(await createDirectoryLink(targetDirectory, linkedDestination, context))) {
      return;
    }

    await expect(
      createReviewerSourceArchive({
        artifactsDirectory: linkedDestination,
        projectRoot,
        version: "1.0.0"
      })
    ).rejects.toThrow(/symbolic link/i);
    expect(existsSync(resolve(targetDirectory, "copy-table-source-1.0.0.zip"))).toBe(false);
  });

  // This test spawns a complete nested verification (clean, tsc, ESLint, Prettier, the full test
  // collection, build, Mozilla lint, and packaging), which runs well past a one-minute budget.
  it("completes a dry run without credentials or AMO network access", async () => {
    if (process.env.COPY_TABLE_DRY_RUN_NESTED === "1") {
      return;
    }

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      COPY_TABLE_ARTIFACTS_DIR: "release-source-tests/dry-run",
      COPY_TABLE_DRY_RUN_NESTED: "1",
      HTTP_PROXY: "http://127.0.0.1:9",
      HTTPS_PROXY: "http://127.0.0.1:9"
    };
    delete env.AMO_JWT_ISSUER;
    delete env.AMO_JWT_SECRET;
    delete env.WEB_EXT_API_KEY;
    delete env.WEB_EXT_API_SECRET;

    const result = spawnSync(process.execPath, ["scripts/release.mjs", "dry-run", "v1.0.0"], {
      cwd: projectRoot,
      encoding: "utf8",
      env
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Dry run complete");
    const generatedEntries = await readdir(resolve(testRoot, "dry-run"));
    expect(generatedEntries).toContain("copy_table-1.0.0.zip");
    expect(generatedEntries).toContain("copy-table-source-1.0.0.zip");
    expect(existsSync(resolve(testRoot, "dry-run", "copy-table-source-1.0.0.zip"))).toBe(true);
  }, 300_000);
});
