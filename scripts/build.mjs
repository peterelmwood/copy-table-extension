import { spawn } from "node:child_process";
import { cp, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { build } from "esbuild";
import JSZip from "jszip";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(projectRoot, "src");
const distDirectory = resolve(projectRoot, "dist");
const defaultArtifactsDirectory = resolve(projectRoot, "web-ext-artifacts");
const testOutputRoot = resolve(projectRoot, ".copy-table-test-output");
const artifactsOverride = process.env.COPY_TABLE_ARTIFACTS_DIR;
const webExtCommand = resolve(projectRoot, "node_modules/web-ext/bin/web-ext.js");
const archiveFileName = "copy_table-1.0.0.zip";
const archiveFiles = [
  "background.js",
  "manifest.json",
  "popup/index.html",
  "popup/popup.css",
  "popup/popup.js"
];
const archiveTimestamp = new Date("1980-01-01T00:00:00.000Z");

function isStrictChildDirectory(parentDirectory, candidateDirectory) {
  const childPath = relative(parentDirectory, candidateDirectory);

  return (
    childPath !== "" &&
    childPath !== ".." &&
    !childPath.startsWith("../") &&
    !childPath.startsWith("..\\") &&
    !isAbsolute(childPath)
  );
}

async function lstatIfExists(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function resolveTestArtifactsDirectory(override) {
  if (isAbsolute(override)) {
    throw new Error(
      "COPY_TABLE_ARTIFACTS_DIR must be a relative path inside .copy-table-test-output."
    );
  }

  const candidateDirectory = resolve(testOutputRoot, override);

  if (!isStrictChildDirectory(testOutputRoot, candidateDirectory)) {
    throw new Error(
      "COPY_TABLE_ARTIFACTS_DIR must identify a strict child of .copy-table-test-output."
    );
  }

  const rootStatus = await lstatIfExists(testOutputRoot);

  if (rootStatus?.isSymbolicLink()) {
    throw new Error("COPY_TABLE_ARTIFACTS_DIR cannot use a symbolic-link test-output root.");
  }

  await mkdir(testOutputRoot, { recursive: true });

  if (!isStrictChildDirectory(projectRoot, await realpath(testOutputRoot))) {
    throw new Error("COPY_TABLE_ARTIFACTS_DIR test-output root must remain inside the repository.");
  }

  let currentDirectory = testOutputRoot;

  for (const pathSegment of relative(testOutputRoot, candidateDirectory).split(/[\\/]+/u)) {
    currentDirectory = resolve(currentDirectory, pathSegment);

    if ((await lstatIfExists(currentDirectory))?.isSymbolicLink()) {
      throw new Error("COPY_TABLE_ARTIFACTS_DIR cannot traverse a symbolic link.");
    }
  }

  return candidateDirectory;
}

async function resolveArtifactsDirectory() {
  if (artifactsOverride === undefined) {
    return defaultArtifactsDirectory;
  }

  return resolveTestArtifactsDirectory(artifactsOverride);
}

function runNodeCommand(arguments_) {
  return new Promise((resolveCommand, rejectCommand) => {
    const childProcess = spawn(process.execPath, arguments_, {
      cwd: projectRoot,
      stdio: "inherit"
    });

    childProcess.once("error", rejectCommand);
    childProcess.once("exit", (exitCode) => {
      if (exitCode === 0) {
        resolveCommand();
        return;
      }

      rejectCommand(new Error(`Command failed with exit code ${exitCode ?? "unknown"}.`));
    });
  });
}

async function clean() {
  const artifactsDirectory = await resolveArtifactsDirectory();

  await Promise.all([
    rm(distDirectory, { force: true, recursive: true }),
    rm(artifactsDirectory, { force: true, recursive: true })
  ]);
}

async function copyAssets() {
  await cp(resolve(sourceDirectory, "manifest.json"), resolve(distDirectory, "manifest.json"));
  await cp(
    resolve(sourceDirectory, "popup/index.html"),
    resolve(distDirectory, "popup/index.html")
  );
  await cp(resolve(sourceDirectory, "popup/popup.css"), resolve(distDirectory, "popup/popup.css"));
}

async function buildExtension() {
  await clean();
  await mkdir(resolve(distDirectory, "popup"), { recursive: true });
  await copyAssets();
  await Promise.all([
    build({
      bundle: true,
      entryPoints: [resolve(sourceDirectory, "background.ts")],
      format: "iife",
      globalName: "CopyTableBackground",
      logLevel: "silent",
      outfile: resolve(distDirectory, "background.js"),
      platform: "browser",
      sourcemap: false,
      target: "es2024"
    }),
    build({
      bundle: true,
      entryPoints: [resolve(sourceDirectory, "popup/popup.ts")],
      format: "esm",
      logLevel: "silent",
      outfile: resolve(distDirectory, "popup/popup.js"),
      platform: "browser",
      sourcemap: false,
      target: "es2024"
    })
  ]);
}

async function lintExtension() {
  await runNodeCommand([webExtCommand, "lint", "--source-dir", distDirectory]);
}

async function createDeterministicArchive() {
  const archive = new JSZip();

  for (const archiveFile of archiveFiles) {
    archive.file(archiveFile, await readFile(resolve(distDirectory, archiveFile)), {
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
      createFolders: false,
      date: archiveTimestamp,
      unixPermissions: 0o100644
    });
  }

  return archive.generateAsync({
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
    streamFiles: false,
    type: "nodebuffer"
  });
}

async function packageExtension() {
  await buildExtension();
  const artifactsDirectory = await resolveArtifactsDirectory();

  await mkdir(artifactsDirectory, { recursive: true });

  const archivePath = resolve(artifactsDirectory, archiveFileName);
  const temporaryArchivePath = resolve(artifactsDirectory, `.${archiveFileName}.tmp`);

  await writeFile(temporaryArchivePath, await createDeterministicArchive());
  await rename(temporaryArchivePath, archivePath);
}

async function startFirefox() {
  await buildExtension();
  await runNodeCommand([webExtCommand, "run", "--source-dir", distDirectory]);
}

async function verify() {
  try {
    await clean();
    await runNodeCommand([resolve(projectRoot, "node_modules/typescript/lib/tsc.js"), "--noEmit"]);
    await runNodeCommand([resolve(projectRoot, "node_modules/eslint/bin/eslint.js"), "."]);
    await runNodeCommand([
      resolve(projectRoot, "node_modules/prettier/bin/prettier.cjs"),
      "--check",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "vitest.config.ts",
      "eslint.config.js",
      "prettier.config.js",
      "scripts",
      "src",
      "tests"
    ]);
    await runNodeCommand([resolve(projectRoot, "node_modules/vitest/vitest.mjs"), "run"]);
    await buildExtension();
    await lintExtension();
    await packageExtension();
  } catch (error) {
    await clean();
    throw error;
  }
}

const command = process.argv[2];

if (command === "clean") {
  await clean();
} else if (command === "build") {
  await buildExtension();
} else if (command === "lint") {
  await buildExtension();
  await lintExtension();
} else if (command === "package") {
  await packageExtension();
} else if (command === "start:firefox") {
  await startFirefox();
} else if (command === "verify") {
  await verify();
} else {
  throw new Error("Usage: node scripts/build.mjs <clean|build|lint|package|start:firefox|verify>");
}
