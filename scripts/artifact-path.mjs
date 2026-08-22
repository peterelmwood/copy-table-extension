import { lstat, mkdir, realpath, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

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

async function resolveTestArtifactsDirectory({ artifactsOverride, projectRoot, testOutputRoot }) {
  if (isAbsolute(artifactsOverride)) {
    throw new Error(
      "COPY_TABLE_ARTIFACTS_DIR must be a relative path inside .copy-table-test-output."
    );
  }

  const candidateDirectory = resolve(testOutputRoot, artifactsOverride);

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

export function extensionArchiveFileName(version) {
  return `copy_table-${version}.zip`;
}

export async function resolveArtifactsDirectory({ artifactsOverride, projectRoot }) {
  if (artifactsOverride === undefined) {
    return resolve(projectRoot, "web-ext-artifacts");
  }

  return resolveTestArtifactsDirectory({
    artifactsOverride,
    projectRoot,
    testOutputRoot: resolve(projectRoot, ".copy-table-test-output")
  });
}

export async function cleanGeneratedOutput({ artifactsOverride, distDirectory, projectRoot }) {
  const artifactsDirectory = await resolveArtifactsDirectory({ artifactsOverride, projectRoot });

  await Promise.all([
    rm(distDirectory, { force: true, recursive: true }),
    rm(artifactsDirectory, { force: true, recursive: true })
  ]);
}
