import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import { extensionArchiveFileName, resolveArtifactsDirectory } from "./artifact-path.mjs";

const stableTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const archiveTimestamp = new Date("1980-01-01T00:00:00.000Z");
const sourceDirectories = ["scripts", "src", "tests"];
const sourceFiles = [
  ".prettierignore",
  "AMO_BUILD.md",
  "LICENSE",
  "README.md",
  "amo-metadata.json",
  "bun.lock",
  "eslint.config.js",
  "package.json",
  "prettier.config.js",
  "tsconfig.json",
  "vitest.config.ts"
];

export function parseStableTag(tag) {
  const match = stableTagPattern.exec(tag);
  if (!match) {
    throw new Error(
      `Expected a stable release tag in vX.Y.Z form; received ${JSON.stringify(tag)}.`
    );
  }
  return tag.slice(1);
}

export function validateReleaseVersions(tag, packageVersion, manifestVersion) {
  const version = parseStableTag(tag);
  if (packageVersion !== version) {
    throw new Error(`Package version ${packageVersion} does not match tag version ${version}.`);
  }
  if (manifestVersion !== version) {
    throw new Error(`Manifest version ${manifestVersion} does not match tag version ${version}.`);
  }
  return { tag, version };
}

function compareBytewise(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isStrictChildDirectory(parentDirectory, candidateDirectory) {
  const childPath = relative(parentDirectory, candidateDirectory);
  return (
    childPath !== "" &&
    childPath !== ".." &&
    !childPath.startsWith(`..${sep}`) &&
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

// A lexical containment check cannot see a symbolic link standing in for any path segment, so the
// destination is also walked segment by segment before anything is written to it.
async function validateArtifactsDirectory(projectRoot, artifactsDirectory) {
  const resolvedProjectRoot = resolve(projectRoot);
  const resolvedArtifactsDirectory = resolve(artifactsDirectory);
  const defaultArtifactsDirectory = resolve(resolvedProjectRoot, "web-ext-artifacts");
  const testOutputDirectory = resolve(resolvedProjectRoot, ".copy-table-test-output");

  if (
    resolvedArtifactsDirectory !== defaultArtifactsDirectory &&
    !isStrictChildDirectory(testOutputDirectory, resolvedArtifactsDirectory)
  ) {
    throw new Error(
      "Reviewer artifact directory must use generated repository output under web-ext-artifacts or .copy-table-test-output."
    );
  }

  let currentDirectory = resolvedProjectRoot;

  for (const pathSegment of relative(resolvedProjectRoot, resolvedArtifactsDirectory).split(sep)) {
    if (pathSegment === "") {
      continue;
    }

    currentDirectory = resolve(currentDirectory, pathSegment);

    if ((await lstatIfExists(currentDirectory))?.isSymbolicLink()) {
      throw new Error(
        `Reviewer artifact directory cannot traverse a symbolic link: ${currentDirectory}`
      );
    }
  }

  return resolvedArtifactsDirectory;
}

const credentialFileNames = new Set([
  ".env",
  ".git-credentials",
  ".netrc",
  ".npmrc",
  ".pgpass",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  "id_rsa"
]);
const credentialFileExtensions = new Set([
  ".asc",
  ".env",
  ".gpg",
  ".jks",
  ".key",
  ".keystore",
  ".p12",
  ".pem",
  ".pfx",
  ".ppk"
]);

function isEnvironmentOrCredentialFile(fileName) {
  const normalizedName = fileName.toLowerCase();

  if (credentialFileNames.has(normalizedName) || normalizedName.startsWith(".env.")) {
    return true;
  }

  const extensionIndex = normalizedName.lastIndexOf(".");

  if (extensionIndex > 0 && credentialFileExtensions.has(normalizedName.slice(extensionIndex))) {
    return true;
  }

  return /^(?:credentials?|secrets?)(?:\.|$)/u.test(normalizedName);
}

export async function collectRegularFiles(directory) {
  // readdir follows a symbolic link standing in for the root itself, so the root is checked before
  // its entries rather than only alongside them.
  if ((await lstat(directory)).isSymbolicLink()) {
    throw new Error(`Reviewer source cannot contain a symbolic link: ${directory}`);
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => compareBytewise(left.name, right.name))) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRegularFiles(entryPath)));
    } else if (entry.isFile()) {
      if (isEnvironmentOrCredentialFile(entry.name)) {
        throw new Error(
          `Reviewer source cannot contain an environment or credential file: ${entryPath}`
        );
      }
      files.push(entryPath);
    } else if (entry.isSymbolicLink()) {
      throw new Error(`Reviewer source cannot contain a symbolic link: ${entryPath}`);
    }
  }
  return files;
}

function archiveEntryName(projectRoot, filePath) {
  return relative(projectRoot, filePath).split(sep).join("/");
}

export async function createReviewerSourceArchive({ artifactsDirectory, projectRoot, version }) {
  const validatedArtifactsDirectory = await validateArtifactsDirectory(
    projectRoot,
    artifactsDirectory
  );
  const archive = new JSZip();
  const paths = [];
  for (const directory of sourceDirectories) {
    paths.push(...(await collectRegularFiles(resolve(projectRoot, directory))));
  }
  for (const file of sourceFiles) {
    const filePath = resolve(projectRoot, file);
    if ((await lstat(filePath)).isSymbolicLink()) {
      throw new Error(`Reviewer source cannot contain a symbolic link: ${filePath}`);
    }
    paths.push(filePath);
  }

  for (const filePath of paths.sort((left, right) =>
    compareBytewise(archiveEntryName(projectRoot, left), archiveEntryName(projectRoot, right))
  )) {
    archive.file(archiveEntryName(projectRoot, filePath), await readFile(filePath), {
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
      createFolders: false,
      date: archiveTimestamp,
      unixPermissions: 0o100644
    });
  }

  await mkdir(validatedArtifactsDirectory, { recursive: true });
  const fileName = `copy-table-source-${version}.zip`;
  const archivePath = resolve(validatedArtifactsDirectory, fileName);
  const temporaryArchivePath = resolve(validatedArtifactsDirectory, `.${fileName}.tmp`);
  const content = await archive.generateAsync({
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
    streamFiles: false,
    type: "nodebuffer"
  });
  await writeFile(temporaryArchivePath, content);
  await rename(temporaryArchivePath, archivePath);
  return archivePath;
}

function runNodeCommand(arguments_, projectRoot) {
  return new Promise((resolveCommand, rejectCommand) => {
    const childProcess = spawn(process.execPath, arguments_, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit"
    });
    childProcess.once("error", rejectCommand);
    childProcess.once("exit", (exitCode) => {
      if (exitCode === 0) {
        resolveCommand();
      } else {
        rejectCommand(new Error(`Release command failed with exit code ${exitCode ?? "unknown"}.`));
      }
    });
  });
}

async function readReleaseVersions(projectRoot) {
  const packageManifest = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  const extensionManifest = JSON.parse(
    await readFile(resolve(projectRoot, "src/manifest.json"), "utf8")
  );
  return { extensionManifest, packageManifest };
}

async function validateReleaseInputs(projectRoot, tag) {
  const { extensionManifest, packageManifest } = await readReleaseVersions(projectRoot);
  const candidate = validateReleaseVersions(
    tag,
    packageManifest.version,
    extensionManifest.version
  );
  const extensionId = extensionManifest.browser_specific_settings?.gecko?.id;
  if (extensionId !== "copy-table@peterelmwood.com") {
    throw new Error(`Unexpected Firefox extension ID: ${JSON.stringify(extensionId)}.`);
  }
  const metadata = JSON.parse(await readFile(resolve(projectRoot, "amo-metadata.json"), "utf8"));
  if (
    typeof metadata.summary?.["en-US"] !== "string" ||
    metadata.summary["en-US"].trim() === "" ||
    JSON.stringify(metadata.categories) !== JSON.stringify(["web-development"]) ||
    metadata.version?.license !== "ISC"
  ) {
    throw new Error("AMO metadata does not satisfy the public listing contract.");
  }
  return candidate;
}

async function sha256(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function dryRun(projectRoot, tag) {
  const candidate = await validateReleaseInputs(projectRoot, tag);
  await runNodeCommand([resolve(projectRoot, "scripts/build.mjs"), "verify"], projectRoot);
  const artifactsDirectory = await resolveArtifactsDirectory({
    artifactsOverride: process.env.COPY_TABLE_ARTIFACTS_DIR,
    projectRoot
  });
  const sourceArchivePath = await createReviewerSourceArchive({
    artifactsDirectory,
    projectRoot,
    version: candidate.version
  });
  const extensionArchivePath = resolve(
    artifactsDirectory,
    extensionArchiveFileName(candidate.version)
  );
  process.stdout.write(
    [
      `Dry run complete for ${candidate.tag}.`,
      `${basename(extensionArchivePath)} sha256=${await sha256(extensionArchivePath)}`,
      `${basename(sourceArchivePath)} sha256=${await sha256(sourceArchivePath)}`
    ].join("\n") + "\n"
  );
}

async function runCommand() {
  const projectRoot = resolve(import.meta.dirname, "..");
  const command = process.argv[2];
  const tag = process.argv[3];
  const candidate = await validateReleaseInputs(projectRoot, tag);
  if (command === "validate") {
    process.stdout.write(`${candidate.version}\n`);
    return;
  }
  if (command === "source") {
    const artifactsDirectory = await resolveArtifactsDirectory({
      artifactsOverride: process.env.COPY_TABLE_ARTIFACTS_DIR,
      projectRoot
    });
    const archivePath = await createReviewerSourceArchive({
      artifactsDirectory,
      projectRoot,
      version: candidate.version
    });
    process.stdout.write(`${basename(archivePath)}\n`);
    return;
  }
  if (command === "dry-run") {
    await dryRun(projectRoot, tag);
    return;
  }
  throw new Error("Usage: node scripts/release.mjs <validate|source|dry-run> <vX.Y.Z>");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await runCommand();
}
