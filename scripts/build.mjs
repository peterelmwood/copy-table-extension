import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDirectory = resolve(projectRoot, "src");
const distDirectory = resolve(projectRoot, "dist");
const artifactsDirectory = resolve(projectRoot, "web-ext-artifacts");

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

const command = process.argv[2];

if (command === "clean") {
  await clean();
} else if (command === "build") {
  await buildExtension();
} else {
  throw new Error("Usage: node scripts/build.mjs <clean|build>");
}
