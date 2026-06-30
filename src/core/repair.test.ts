import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runScan } from "../commands/scan.js";
import { readIndex } from "./config.js";
import { readLastMutation } from "./mutations.js";
import { applyDriftRepair, planDriftRepair } from "./repair.js";

const execFileAsync = promisify(execFile);

describe("drift repair", () => {
  it("plans and applies mechanical rename fixes for code, tests, and source references", async () => {
    const root = await createRepairRepo();
    const base = await initGitRepo(root);

    await execFileAsync("git", ["mv", "src/feature.ts", "src/renamed-feature.ts"], { cwd: root });
    await execFileAsync("git", ["mv", "src/feature.test.ts", "src/renamed-feature.test.ts"], { cwd: root });
    await execFileAsync("git", ["mv", "evidence-old.md", "evidence-new.md"], { cwd: root });

    const planned = await planDriftRepair(root, base);

    expect(planned.ok).toBe(true);
    expect(planned.ok ? planned.mechanical_fixes : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          task_id: "JS-100",
          field: "code",
          old_path: "src/feature.ts",
          new_path: "src/renamed-feature.ts",
        }),
        expect.objectContaining({
          task_id: "JS-100",
          field: "tests",
          old_path: "src/feature.test.ts",
          new_path: "src/renamed-feature.test.ts",
        }),
        expect.objectContaining({
          task_id: "JS-100",
          field: "sources",
          old_path: "evidence-old.md",
          new_path: "evidence-new.md",
        }),
      ]),
    );

    const applied = await applyDriftRepair(root, base);

    expect(applied.ok).toBe(true);
    expect(applied.ok ? applied.touched_files : []).toEqual(
      expect.arrayContaining(["docs/specs/feature.md", ".jumpspace/index.json"]),
    );
    const task = (await readIndex(root)).tasks.find((candidate) => candidate.id === "JS-100");
    expect(task).toMatchObject({
      code: ["src/renamed-feature.ts"],
      tests: ["src/renamed-feature.test.ts"],
      sources: [
        {
          id: "evidence-new.md",
        },
      ],
    });
    const markdown = await fs.readFile(path.join(root, "docs/specs/feature.md"), "utf8");
    expect(markdown).toContain("src/renamed-feature.ts");
    expect(markdown).toContain("src/renamed-feature.test.ts");
    expect(markdown).toContain("evidence-new.md");
  });

  it("records deleted linked files as explicit gaps and removes dead active links", async () => {
    const root = await createRepairRepo();
    const base = await initGitRepo(root);

    await execFileAsync("git", ["rm", "src/feature.ts"], { cwd: root });

    const applied = await applyDriftRepair(root, base);

    expect(applied.ok).toBe(true);
    expect(applied.ok ? applied.gaps : []).toContainEqual(
      expect.objectContaining({
        task_id: "JS-100",
        field: "code",
        path: "src/feature.ts",
        reason: "deleted",
        removes_link: true,
      }),
    );
    const task = (await readIndex(root)).tasks.find((candidate) => candidate.id === "JS-100");
    expect(task?.code).toEqual([]);
    expect(task?.gaps).toEqual([
      'Linked code file "src/feature.ts" was deleted; repair removed it from active links and preserved this gap for human review.',
    ]);
    await expect(readLastMutation(root)).resolves.toMatchObject({
      command: "task repair",
      task_ids: ["JS-100"],
      index_changed: true,
    });
  });

  it("records missing linked files from audit even when Git has no matching rename", async () => {
    const root = await createRepairRepo({ createFeatureFile: false });
    const base = await initGitRepo(root);

    const planned = await planDriftRepair(root, base);

    expect(planned.ok).toBe(true);
    expect(planned.ok ? planned.gaps : []).toContainEqual(
      expect.objectContaining({
        task_id: "JS-100",
        field: "code",
        path: "src/feature.ts",
        reason: "missing",
      }),
    );
  });

  it("warns when a task source document is deleted", async () => {
    const root = await createRepairRepo();
    const base = await initGitRepo(root);

    await execFileAsync("git", ["rm", "docs/specs/feature.md"], { cwd: root });

    const planned = await planDriftRepair(root, base);

    expect(planned.ok).toBe(true);
    expect(planned.ok ? planned.warnings : []).toContainEqual(
      expect.objectContaining({
        code: "TASK_SOURCE_DOC_DELETED",
        taskId: "JS-100",
        path: "docs/specs/feature.md",
      }),
    );
  });
});

async function createRepairRepo(options: { createFeatureFile?: boolean } = {}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-repair-"));
  await write(
    root,
    "docs/specs/feature.md",
    `# Feature

## Repair target

<!-- jumpspace
id: JS-100
type: spec
status: approved
code:
  - src/feature.ts
tests:
  - src/feature.test.ts
sources:
  - type: file
    id: evidence-old.md
depends_on: []
-->

Repair stale links.
`,
  );
  if (options.createFeatureFile !== false) {
    await write(root, "src/feature.ts", "export const feature = true;\n");
  }
  await write(root, "src/feature.test.ts", "export const test = true;\n");
  await write(root, "evidence-old.md", "# Evidence\n");
  await runScan({ root, writeLine: () => {}, errorLine: () => {} });
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
