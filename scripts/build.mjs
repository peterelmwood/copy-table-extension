import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import JSZip from "jszip";
import { cleanGeneratedOutput, resolveArtifactsDirectory } from "./artifact-path.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(projectRoot, "src");
const distDirectory = resolve(projectRoot, "dist");
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
  await cleanGeneratedOutput({ artifactsOverride, distDirectory, projectRoot });
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
  const artifactsDirectory = await resolveArtifactsDirectory({ artifactsOverride, projectRoot });

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
