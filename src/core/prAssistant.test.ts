import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { buildPrAssistantComment, PR_ASSISTANT_MARKER } from "./prAssistant.js";

const execFileAsync = promisify(execFile);

describe("buildPrAssistantComment", () => {
  it("wraps the CI packet as an idempotent review-only PR comment", async () => {
    const root = await createPrRepo();
    const base = await initGitRepo(root);

    await execFileAsync("git", ["mv", "src/feature.ts", "src/renamed-feature.ts"], { cwd: root });
    await write(
      root,
      "docs/specs/new-feature.md",
      `# New feature

## Import flow

The implementation changed near src/import.ts.
`,
    );
    await write(root, "src/import.ts", "export const imported = true;\n");
    await write(root, "src/import.test.ts", "export const test = true;\n");
    await write(root, "src/unrelated-worker.ts", "export const unrelated = true;\n");

    const first = await buildPrAssistantComment({ root, since: base });
    const second = await buildPrAssistantComment({ root, since: base });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      throw new Error("Expected PR assistant report.");
    }

    expect(first.report.idempotency.marker).toBe(PR_ASSISTANT_MARKER);
    expect(first.report.idempotency.fingerprint).toBe(second.report.idempotency.fingerprint);
    expect(first.report.mutation_policy).toMatchObject({
      mutates: false,
      requires_human_approval: true,
    });
    expect(first.report.schemas).toEqual({
      packet: "task.pr.comment",
      ci: "task.ci",
      errors: "error",
    });
    expect(first.report.review_items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "task_block",
          path: "docs/specs/new-feature.md",
          evidence: expect.arrayContaining([expect.stringContaining("linked_code_candidates: src/import.ts")]),
          useful_candidates: expect.arrayContaining([
            expect.objectContaining({
              field: "code",
              path: "src/import.ts",
              matched_terms: expect.arrayContaining(["import"]),
            }),
          ]),
          rejected_candidates: expect.arrayContaining([
            expect.objectContaining({
              field: "code",
              path: "src/unrelated-worker.ts",
              reason: "NO_SOURCE_EVIDENCE",
              matched_terms: [],
            }),
          ]),
        }),
        expect.objectContaining({
          type: "repair",
          task_id: "JS-100",
          old_path: "src/feature.ts",
          new_path: "src/renamed-feature.ts",
          command: `jumpspace task repair --since ${base} --apply`,
        }),
      ]),
    );
    expect(first.report.review_comment).toContain(PR_ASSISTANT_MARKER);
    expect(first.report.review_comment).toContain("Apply suggestions only after human review.");
    expect(first.report.review_comment).toContain("# Jumpspace CI Report");
    expect(first.report.review_comment).toContain("useful_candidate: code src/import.ts");
    expect(first.report.review_comment).toContain("rejected_candidate: code src/unrelated-worker.ts reason=NO_SOURCE_EVIDENCE");
  });

  it("returns structured errors with a useful failure comment when CI packet creation fails", async () => {
    const root = await createPrRepo();
    await initGitRepo(root);

    const result = await buildPrAssistantComment({ root, since: "missing-ref" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected PR assistant failure.");
    }

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.review_comment).toContain(PR_ASSISTANT_MARKER);
    expect(result.review_comment).toContain("Structured Errors");
    expect(result.review_comment).toContain("\"ok\": false");
  });
});

async function createPrRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-pr-"));
  await write(
    root,
    "docs/specs/feature.md",
    `# Feature

## Existing task

<!-- jumpspace
id: JS-100
type: spec
status: approved
code:
  - src/feature.ts
tests: []
depends_on: []
-->

Existing task.
`,
  );
  await write(root, "src/feature.ts", "export const feature = true;\n");
  return root;
}

async function initGitRepo(root: string): Promise<string> {
  await execFileAsync("git", ["init"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
  return (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
}

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
