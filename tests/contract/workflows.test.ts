import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const projectRoot = resolve(import.meta.dirname, "../..");

type WorkflowStep = {
  "continue-on-error"?: boolean;
  env?: Record<string, string>;
  id?: string;
  if?: string;
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
};

type Workflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: Record<string, { if?: string; "runs-on": string; steps: WorkflowStep[] }>;
};

function loadWorkflow(name: string): Workflow {
  return parse(readFileSync(resolve(projectRoot, ".github/workflows", name), "utf8")) as Workflow;
}

describe("verification workflow contract", () => {
  it("verifies pull requests and main while retaining an unsigned artifact", () => {
    const workflow = loadWorkflow("build.yml");
    const triggers = workflow.on;
    const job = workflow.jobs.verify;

    expect(job).toBeDefined();
    if (!job) {
      throw new Error("The verification workflow must define a verify job.");
    }

    expect(triggers).toHaveProperty("pull_request");
    expect(triggers.push).toEqual({ branches: ["main"] });
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.concurrency).toEqual({
      group: "verify-${{ github.workflow }}-${{ github.ref }}",
      "cancel-in-progress": true
    });
    expect(job["runs-on"]).toBe("ubuntu-latest");
    expect(job.steps.map((step) => step.uses).filter(Boolean)).toEqual([
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
      "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"
    ]);
    const checkout = job.steps.find((step) => step.uses?.startsWith("actions/checkout@"));
    const setupNode = job.steps.find((step) => step.uses?.startsWith("actions/setup-node@"));
    expect(checkout?.with).toEqual({ "persist-credentials": false });
    expect(setupNode?.with).toEqual({ "node-version": 24, cache: "npm" });
    expect(job.steps.filter((step) => step.run).map((step) => step.run)).toEqual([
      "npm ci",
      "npm run verify"
    ]);

    const upload = job.steps.at(-1);
    expect(upload?.with).toMatchObject({
      name: "copy-table-firefox-unsigned",
      path: "web-ext-artifacts/copy_table-*.zip",
      "if-no-files-found": "error",
      "retention-days": 30
    });

    const serializedWorkflow = JSON.stringify(workflow);
    expect(serializedWorkflow).not.toMatch(/AMO_|WEB_EXT_API_|secrets\./);
  });
});

describe("Firefox publishing workflow contract", () => {
  it("gates a serialized listed-channel submission behind the production environment", () => {
    const workflow = loadWorkflow("publish-firefox.yml");
    const publish = workflow.jobs.publish;

    expect(publish).toBeDefined();
    if (!publish) {
      throw new Error("The Firefox publishing workflow must define a publish job.");
    }

    expect(workflow.on).toEqual({ push: { tags: ["v*.*.*"] } });
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.concurrency).toEqual({
      group: "firefox-publish",
      "cancel-in-progress": false
    });
    expect(publish).toMatchObject({
      environment: "firefox-production",
      if: "github.event.created == true && github.event.deleted == false && github.event.forced == false",
      "runs-on": "ubuntu-latest"
    });
    expect(publish.steps.map((step) => step.uses).filter(Boolean)).toEqual([
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
      "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"
    ]);

    const checkout = publish.steps.find((step) => step.uses?.startsWith("actions/checkout@"));
    expect(checkout?.with).toEqual({ "persist-credentials": false });
    const commands = publish.steps.filter((step) => step.run).map((step) => step.run);
    expect(commands).toContain("npm ci");
    expect(commands).toContain('npm run release:dry-run -- "$RELEASE_TAG"');

    const dryRun = publish.steps.find(
      (step) => step.name === "Build and inspect release candidate"
    );
    expect(dryRun?.env).toEqual({ RELEASE_TAG: "${{ github.ref_name }}" });
    expect(dryRun?.run).not.toContain("${{");

    const credentialGate = publish.steps.find((step) => step.name === "Require AMO credentials");
    expect(credentialGate?.env).toEqual({
      WEB_EXT_API_KEY: "${{ secrets.AMO_JWT_ISSUER }}",
      WEB_EXT_API_SECRET: "${{ secrets.AMO_JWT_SECRET }}"
    });
    expect(credentialGate?.run).toMatch(/IsNullOrWhiteSpace/);

    const submission = publish.steps.find((step) => step.id === "submit");
    expect(submission?.run).toBe("node scripts/submit-firefox.mjs");
    expect(submission?.env).toEqual({
      REVIEWER_SOURCE_ARCHIVE: "${{ steps.release.outputs.source_archive }}",
      WEB_EXT_API_KEY: "${{ secrets.AMO_JWT_ISSUER }}",
      WEB_EXT_API_SECRET: "${{ secrets.AMO_JWT_SECRET }}"
    });
    expect(submission?.run).not.toMatch(/AMO_JWT_|WEB_EXT_API_(?:KEY|SECRET)/);
  });

  it("reports submission honestly and gives ambiguous-failure recovery guidance", () => {
    const workflow = loadWorkflow("publish-firefox.yml");
    const publish = workflow.jobs.publish;

    expect(publish).toBeDefined();
    if (!publish) {
      throw new Error("The Firefox publishing workflow must define a publish job.");
    }

    const submission = publish.steps.find((step) => step.id === "submit");
    expect(submission?.["continue-on-error"]).toBe(true);

    const submittedSummary = publish.steps.find((step) => step.name === "Record submitted outcome");
    expect(submittedSummary?.if).toBe("steps.submit.outcome == 'success'");
    expect(submittedSummary?.run).toMatch(/submitted.*pending/i);
    expect(submittedSummary?.run).not.toMatch(/\bpublished\b/i);

    const knownFailureSummary = publish.steps.find(
      (step) => step.name === "Record known rejection"
    );
    expect(knownFailureSummary?.if).toBe(
      "steps.submit.outcome == 'failure' && steps.submit.outputs.failure_kind == 'known'"
    );
    expect(knownFailureSummary?.run).toMatch(/validation or API rejection/i);
    expect(knownFailureSummary?.run).toMatch(/failed gate/i);

    const failureSummary = publish.steps.find((step) => step.name === "Record ambiguous outcome");
    expect(failureSummary?.if).toBe(
      "steps.submit.outcome == 'failure' && steps.submit.outputs.failure_kind != 'known'"
    );
    expect(failureSummary?.run).toMatch(/ambiguous/i);
    expect(failureSummary?.run).toMatch(/AMO Developer Hub/i);
    expect(failureSummary?.run).toMatch(/before rerunning/i);

    const summaries = `${submittedSummary?.run ?? ""}\n${failureSummary?.run ?? ""}`;
    expect(summaries).not.toMatch(/AMO_JWT_|WEB_EXT_API_|secrets\./);
  });

  it("records and retains release evidence linked to the tag revision", () => {
    const workflow = loadWorkflow("publish-firefox.yml");
    const publish = workflow.jobs.publish;

    expect(publish).toBeDefined();
    if (!publish) {
      throw new Error("The Firefox publishing workflow must define a publish job.");
    }

    const evidence = publish.steps.find((step) => step.name === "Record release evidence");
    expect(evidence?.run).toMatch(/Get-FileHash/);
    expect(evidence?.run).toMatch(/github\.sha/);
    expect(evidence?.run).toMatch(/GITHUB_STEP_SUMMARY/);

    const retention = publish.steps.find((step) => step.name === "Retain release evidence");
    expect(retention?.uses).toBe(
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"
    );
    expect(retention?.if).toBe("always()");
    expect(retention?.with).toEqual({
      name: "firefox-release-${{ github.ref_name }}",
      path: "web-ext-artifacts/copy_table-*.zip\nweb-ext-artifacts/copy-table-source-*.zip\n",
      "if-no-files-found": "error",
      "retention-days": 30
    });
  });
});
