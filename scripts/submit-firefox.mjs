import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");
const maximumDiagnosticLength = 1024 * 1024;
const ambiguousPostSubmissionPattern =
  /(?:upload of source failed|source(?: code)? upload failed|patch request failed)/iu;
const knownRejectionPattern =
  /(?:HTTP\s+(?:400|401|403|404|409|422|429)\b|validation failed|invalid manifest|unauthori[sz]ed|forbidden|already exists|duplicate version|\brejected\b)/iu;

export function classifySubmissionFailure(diagnostic) {
  if (ambiguousPostSubmissionPattern.test(diagnostic)) {
    return "ambiguous";
  }

  return knownRejectionPattern.test(diagnostic) ? "known" : "ambiguous";
}

export function submissionArguments(sourceArchive) {
  return [
    "node_modules/web-ext/bin/web-ext.js",
    "sign",
    "--source-dir",
    "dist",
    "--artifacts-dir",
    "web-ext-artifacts",
    "--channel",
    "listed",
    "--amo-metadata",
    "amo-metadata.json",
    "--upload-source-code",
    sourceArchive,
    "--approval-timeout",
    "0",
    "--no-input"
  ];
}

function retainDiagnostic(currentDiagnostic, chunk) {
  return `${currentDiagnostic}${chunk}`.slice(-maximumDiagnosticLength);
}

function runSubmission(sourceArchive) {
  return new Promise((resolveSubmission, rejectSubmission) => {
    const childProcess = spawn(process.execPath, submissionArguments(sourceArchive), {
      cwd: projectRoot,
      env: process.env,
      shell: false,
      stdio: ["inherit", "pipe", "pipe"]
    });
    let diagnostic = "";

    childProcess.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      diagnostic = retainDiagnostic(diagnostic, chunk.toString());
    });
    childProcess.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      diagnostic = retainDiagnostic(diagnostic, chunk.toString());
    });
    childProcess.once("error", rejectSubmission);
    childProcess.once("exit", (exitCode) => {
      resolveSubmission({ diagnostic, exitCode: exitCode ?? 1 });
    });
  });
}

async function writeFailureKind(failureKind) {
  if (process.env.GITHUB_OUTPUT !== undefined) {
    await appendFile(process.env.GITHUB_OUTPUT, `failure_kind=${failureKind}\n`, "utf8");
  }
}

async function main() {
  const sourceArchive = process.env.REVIEWER_SOURCE_ARCHIVE;

  if (sourceArchive === undefined || sourceArchive.trim() === "") {
    throw new Error("REVIEWER_SOURCE_ARCHIVE is required for Firefox submission.");
  }

  try {
    const result = await runSubmission(sourceArchive);

    if (result.exitCode === 0) {
      await writeFailureKind("none");
      return;
    }

    await writeFailureKind(classifySubmissionFailure(result.diagnostic));
    process.exitCode = result.exitCode;
  } catch (error) {
    await writeFailureKind("ambiguous");
    throw error;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
