import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { buildCiReport } from "./ci.js";

const execFileAsync = promisify(execFile);

describe("buildCiReport", () => {
  it("aggregates drift, repair opportunities, graph queries, and task-block suggestions", async () => {
    const root = await createCiRepo();
    const base = await initGitRepo(root);

    await execFileAsync("git", ["mv", "src/feature.ts", "src/renamed-feature.ts"], { cwd: root });
    await write(
      root,
      "docs/specs/new-feature.md",
      `# New feature

## Import flow

The implementation changed near src/import.ts.

## Quarterly metrics

The quarterly metrics implementation changed near src/quarterly-metrics.ts.
`,
    );
    await write(root, "src/import.ts", "export const imported = true;\n");
    await write(root, "src/import.test.ts", "export const test = true;\n");
    await write(root, "src/quarterly-metrics.ts", "export const quarterlyMetrics = true;\n");
    await write(root, "src/quarterly-metrics.test.ts", "export const quarterlyMetricsTest = true;\n");
    await write(root, "src/unrelated-worker.ts", "export const unrelated = true;\n");

    const result = await buildCiReport({ root, since: base });

    expect(result.ok).toBe(true);
    const report = result.ok ? result.report : undefined;
    expect(report).toMatchObject({
      ok: true,
      since: base,
      scan: {
        index_path: ".jumpspace/index.json",
      },
      suggestions: {
        repair: {
          mechanical_fixes: [
            expect.objectContaining({
              task_id: "JS-100",
              field: "code",
              old_path: "src/feature.ts",
              new_path: "src/renamed-feature.ts",
            }),
          ],
        },
      },
    });
    const taskBlocks = report?.suggestions.task_blocks ?? [];
    const importFlow = taskBlocks.find((suggestion) => suggestion.heading === "Import flow");
    const quarterlyMetrics = taskBlocks.find((suggestion) => suggestion.heading === "Quarterly metrics");
    expect(importFlow).toMatchObject({
      type: "task_block",
      path: "docs/specs/new-feature.md",
      linked_code_candidates: ["src/import.ts"],
      linked_test_candidates: ["src/import.test.ts"],
      linked_code_candidate_matches: [
        expect.objectContaining({
          path: "src/import.ts",
          matched_terms: expect.arrayContaining(["import"]),
          match_reasons: expect.arrayContaining(["path:import"]),
          evidence: expect.objectContaining({
            path_terms: expect.arrayContaining(["import"]),
            basename_terms: expect.arrayContaining(["import"]),
          }),
        }),
      ],
    });
    expect(importFlow?.linked_code_candidates).not.toContain("src/quarterly-metrics.ts");
    expect(importFlow?.linked_code_candidates).not.toContain("src/unrelated-worker.ts");
    expect(importFlow?.rejected_candidate_matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "src/quarterly-metrics.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
      expect.objectContaining({
        path: "src/unrelated-worker.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
    ]));
    expect(quarterlyMetrics).toMatchObject({
      type: "task_block",
      path: "docs/specs/new-feature.md",
      linked_code_candidates: ["src/quarterly-metrics.ts"],
      linked_test_candidates: ["src/quarterly-metrics.test.ts"],
      linked_code_candidate_matches: [
        expect.objectContaining({
          path: "src/quarterly-metrics.ts",
          matched_terms: expect.arrayContaining(["metric", "quarterly"]),
          evidence: expect.objectContaining({
            phrase_matches: expect.arrayContaining(["path:quarterly metrics", "basename:quarterly metrics"]),
            coverage: expect.objectContaining({ matched_terms: expect.any(Number), total_terms: expect.any(Number) }),
          }),
        }),
      ],
    });
    expect(quarterlyMetrics?.linked_code_candidates).not.toContain("src/import.ts");
    expect(quarterlyMetrics?.linked_code_candidates).not.toContain("src/unrelated-worker.ts");
    expect(quarterlyMetrics?.rejected_candidate_matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "src/import.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
      expect.objectContaining({
        path: "src/unrelated-worker.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
    ]));
    expect(taskBlocks.every((suggestion) => !suggestion.linked_code_candidates.includes("src/unrelated-worker.ts"))).toBe(true);
    expect(report?.drift.facts).toContainEqual(expect.objectContaining({ code: "LINKED_CODE_CHANGED", taskId: "JS-100" }));
    expect(report?.graph_queries).toContainEqual(expect.objectContaining({ name: "approved_or_partial_without_tests" }));
    expect(report?.pr_comment).toContain("# Jumpspace CI Report");
    expect(report?.pr_comment).toContain("Suggested Task Blocks");
    expect(report?.pr_comment).toContain("Rejected candidates:");
    expect(report?.pr_comment).toContain("src/unrelated-worker.ts (NO_SOURCE_EVIDENCE)");
  });
});

async function createCiRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-ci-"));
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
