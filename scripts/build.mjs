import { spawn } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(projectRoot, "src");
const distDirectory = resolve(projectRoot, "dist");
const artifactsDirectory = resolve(projectRoot, "web-ext-artifacts");
const webExtCommand = resolve(projectRoot, "node_modules/web-ext/bin/web-ext.js");

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

async function packageExtension() {
  await buildExtension();
  await runNodeCommand([
    webExtCommand,
    "build",
    "--source-dir",
    distDirectory,
    "--artifacts-dir",
    artifactsDirectory,
    "--overwrite-dest"
  ]);
}

async function startFirefox() {
  await buildExtension();
  await runNodeCommand([webExtCommand, "run", "--source-dir", distDirectory]);
}

async function verify() {
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
