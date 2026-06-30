import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GITHUB_CI_WORKFLOW_PATH, githubWorkflowTemplate, installCiWorkflow } from "./ciWorkflow.js";

describe("installCiWorkflow", () => {
  it("creates a managed GitHub Actions workflow", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-ci-workflow-"));

    const result = await installCiWorkflow(root, { provider: "github" });

    expect(result).toMatchObject({
      ok: true,
      provider: "github",
      dry_run: false,
      warnings: [],
      files: [
        {
          path: GITHUB_CI_WORKFLOW_PATH,
          action: "created",
          changed: true,
          managed: true,
          reason: "missing",
        },
      ],
    });
    const workflow = await readWorkflow(root);
    expect(workflow).toContain("# BEGIN JUMPSPACE MANAGED: github-ci");
    expect(workflow).toContain("jumpspace-pr-assistant:v1");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).toContain("cache: npm");
    expect(workflow).toContain("npm ci --ignore-scripts");
    expect(workflow).toContain("npx @jumpspace/cli task scan");
    expect(workflow).toContain("npx @jumpspace/cli task semantic build --json > jumpspace-semantic-build.json");
    expect(workflow).toContain('"$SCAN_EXIT" "$SEMANTIC_EXIT" "$COMMENT_EXIT" "$AUDIT_EXIT" "$DOCTOR_EXIT"');
    expect(workflow).toContain("pr comment --since \"$BASE_SHA\"");
    expect(workflow).not.toContain("npm run build");
    expect(workflow).not.toContain("node dist/cli.js");
    expect(workflow).not.toContain("JUMPSPACE_BIN");
    expect(workflow).toContain("jumpspace-pr-comment-bounded.md");
    expect(workflow).toContain("jumpspace-pr-summary.md");
    expect(workflow).toContain("bounded(source, 60000)");
    expect(workflow).not.toContain("cat jumpspace-pr-comment.md >>");
    expect(workflow).toContain("audit --json");
    expect(workflow).toContain("doctor --json");
    expect(workflow).toContain("github.rest.issues.updateComment");
  });

  it("is idempotent when the managed workflow is current", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-ci-workflow-"));

    await installCiWorkflow(root, { provider: "github" });
    const second = await installCiWorkflow(root, { provider: "github" });

    expect(second.files).toEqual([
      expect.objectContaining({
        action: "unchanged",
        changed: false,
        reason: "already_current",
      }),
    ]);
  });

  it("keeps the packaged starter workflow in sync with the managed generator", async () => {
    const template = await fs.readFile(path.join(process.cwd(), "src/templates/jumpspace.yml"), "utf8");

    expect(template).toBe(githubWorkflowTemplate());
  });

  it("updates the legacy Jumpspace audit starter workflow", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-ci-workflow-"));
    await writeWorkflow(
      root,
      `name: Jumpspace Audit

on:
  pull_request:

jobs:
  jumpspace:
    runs-on: ubuntu-latest
    steps:
      - run: node dist/cli.js audit
`,
    );

    const result = await installCiWorkflow(root, { provider: "github" });

    expect(result.files).toEqual([
      expect.objectContaining({
        action: "updated",
        changed: true,
        managed: true,
        reason: "legacy_jumpspace_template",
      }),
    ]);
    expect(await readWorkflow(root)).toBe(githubWorkflowTemplate());
  });

  it("does not overwrite a user-owned workflow at the target path", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-ci-workflow-"));
    const customWorkflow = "name: Custom CI\non: [pull_request]\n";
    await writeWorkflow(root, customWorkflow);

    const result = await installCiWorkflow(root, { provider: "github" });

    expect(result.files).toEqual([
      expect.objectContaining({
        action: "unchanged",
        changed: false,
        managed: false,
        reason: "user_owned",
      }),
    ]);
    expect(result.warnings).toEqual([expect.objectContaining({ code: "USER_WORKFLOW_EXISTS" })]);
    expect(await readWorkflow(root)).toBe(customWorkflow);
  });

  it("supports dry-run without writing files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-ci-workflow-"));

    const result = await installCiWorkflow(root, { provider: "github", dryRun: true });

    expect(result).toMatchObject({
      dry_run: true,
      files: [expect.objectContaining({ action: "created", changed: true })],
    });
    await expect(fs.readFile(path.join(root, GITHUB_CI_WORKFLOW_PATH), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});

async function readWorkflow(root: string): Promise<string> {
  return fs.readFile(path.join(root, GITHUB_CI_WORKFLOW_PATH), "utf8");
}

async function writeWorkflow(root: string, content: string): Promise<void> {
  const workflowPath = path.join(root, GITHUB_CI_WORKFLOW_PATH);
  await fs.mkdir(path.dirname(workflowPath), { recursive: true });
  await fs.writeFile(workflowPath, content);
}
