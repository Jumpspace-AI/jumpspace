import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runScan } from "../commands/scan.js";
import { createDoctorReport, renderDoctorReport } from "./doctor.js";
import type { JumpIssue } from "./types.js";

const execFileAsync = promisify(execFile);

describe("doctor diagnostics", () => {
  it("separates errors, warnings, and suggested repairs", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-doctor-"));
    await write(root, "docs/spec.md", "# Spec\n");
    const issues: JumpIssue[] = [
      {
        severity: "error",
        code: "STALE_INDEX",
        message: "Index is stale.",
      },
      {
        severity: "warning",
        code: "MISSING_CODE_FILE",
        taskId: "JS-100",
        path: "src/missing.ts",
        message: "Linked code is missing.",
      },
    ];

    const report = await createDoctorReport(
      root,
      issues,
      { docs: ["docs/**/*.md"], indexPath: ".jumpspace/index.json" },
      undefined,
    );

    expect(report.ok).toBe(false);
    expect(report.errors).toContainEqual(expect.objectContaining({ code: "STALE_INDEX" }));
    expect(report.warnings).toContainEqual(expect.objectContaining({ code: "MISSING_CODE_FILE" }));
    expect(report.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RUN_SCAN", command: "jumpspace scan" }),
        expect.objectContaining({ code: "RESTORE_OR_RELINK_FILE", taskId: "JS-100", path: "src/missing.ts" }),
      ]),
    );
  });

  it("warns on duplicate headings and unusable config doc patterns", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-doctor-"));
    await write(
      root,
      "docs/spec.md",
      `# Spec

## Local development

Run the app.

## Local development

Run it again.
`,
    );

    const report = await createDoctorReport(
      root,
      [],
      { docs: ["docs/**/*.md", "missing/**/*.md", "dist/**/*.md"], indexPath: ".jumpspace/index.json" },
      undefined,
    );

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_HEADING_TITLE", path: "docs/spec.md" }),
        expect.objectContaining({ code: "CONFIG_GLOB_MATCHES_NO_FILES", path: "missing/**/*.md" }),
        expect.objectContaining({ code: "CONFIG_INCLUDES_IGNORED_PATH", path: "dist/**/*.md" }),
      ]),
    );
    expect(report.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "USE_HEADING_SOURCE_IDENTITY", path: "docs/spec.md" }),
        expect.objectContaining({ code: "UPDATE_CONFIG_DOCS", command: "jumpspace init --auto" }),
      ]),
    );
    expect(renderDoctorReport(report)).toContain("# Jumpspace Doctor");
  });

  it("suggests rebuilding stale semantic indexes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-doctor-"));
    await write(root, "docs/spec.md", "# Spec\n");
    const report = await createDoctorReport(
      root,
      [
        {
          severity: "warning",
          code: "STALE_SEMANTIC_INDEX",
          path: ".jumpspace/semantic-index.json",
          message: "Semantic index is stale.",
        },
      ],
      {
        docs: ["docs/**/*.md"],
        indexPath: ".jumpspace/index.json",
        semanticIndex: {
          enabled: true,
        },
      },
      undefined,
    );

    expect(report.ok).toBe(true);
    expect(report.suggestions).toContainEqual(
      expect.objectContaining({
        code: "REBUILD_SEMANTIC_INDEX",
        command: "jumpspace semantic build",
      }),
    );
    expect(renderDoctorReport(report)).toContain("Semantic index: enabled at .jumpspace/semantic-index.json");
  });

  it("compacts multiple task gap warnings by task", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-doctor-"));
    await write(root, "docs/spec.md", "# Spec\n");
    const report = await createDoctorReport(
      root,
      [
        {
          severity: "warning",
          code: "TASK_HAS_GAP",
          taskId: "JS-100",
          message: "Task JS-100 has an explicit unresolved gap: First gap.",
        },
        {
          severity: "warning",
          code: "TASK_HAS_GAP",
          taskId: "JS-100",
          message: "Task JS-100 has an explicit unresolved gap: Second gap.",
        },
        {
          severity: "warning",
          code: "TASK_HAS_GAP",
          taskId: "JS-200",
          message: "Task JS-200 has an explicit unresolved gap: Other gap.",
        },
      ],
      { docs: ["docs/**/*.md"], indexPath: ".jumpspace/index.json" },
      undefined,
    );

    expect(report.warnings.filter((warning) => warning.code === "TASK_HAS_GAP")).toEqual([
      expect.objectContaining({
        taskId: "JS-100",
        message: expect.stringContaining("2 explicit unresolved gaps"),
      }),
      expect.objectContaining({
        taskId: "JS-200",
        message: expect.stringContaining("Other gap"),
      }),
    ]);
  });

  it("surfaces repair opportunities when given a Git baseline", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-doctor-"));
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
tests: []
depends_on: []
-->

Repair stale links.
`,
    );
    await write(root, "src/feature.ts", "export const feature = true;\n");
    await runScan({ root, writeLine: () => {}, errorLine: () => {} });
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
    await execFileAsync("git", ["add", "."], { cwd: root });
    await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await execFileAsync("git", ["mv", "src/feature.ts", "src/renamed-feature.ts"], { cwd: root });

    const report = await createDoctorReport(
      root,
      [],
      { docs: ["docs/**/*.md"], indexPath: ".jumpspace/index.json" },
      undefined,
      { since: base },
    );

    expect(report.repair).toMatchObject({
      since: base,
      mechanical_fixes: [
        expect.objectContaining({
          task_id: "JS-100",
          old_path: "src/feature.ts",
          new_path: "src/renamed-feature.ts",
        }),
      ],
    });
    expect(report.suggestions).toContainEqual(
      expect.objectContaining({
        code: "RUN_REPAIR",
        command: `jumpspace repair --since ${base} --apply`,
      }),
    );
  });

  it("surfaces source document deletion as an orphan lifecycle warning", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-doctor-"));
    await write(
      root,
      "docs/specs/feature.md",
      `# Feature

## Orphan target

<!-- jumpspace
id: JS-200
type: spec
status: approved
code: []
tests: []
depends_on: []
-->

Lifecycle source.
`,
    );
    await runScan({ root, writeLine: () => {}, errorLine: () => {} });
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
    await execFileAsync("git", ["add", "."], { cwd: root });
    await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await execFileAsync("git", ["rm", "docs/specs/feature.md"], { cwd: root });

    const report = await createDoctorReport(
      root,
      [],
      { docs: ["docs/**/*.md"], indexPath: ".jumpspace/index.json" },
      undefined,
      { since: base },
    );

    expect(report.warnings).toContainEqual(
      expect.objectContaining({
        code: "TASK_SOURCE_DOC_DELETED",
        taskId: "JS-200",
        path: "docs/specs/feature.md",
      }),
    );
    expect(report.suggestions).toContainEqual(
      expect.objectContaining({
        code: "RESOLVE_ORPHANED_TASK",
        taskId: "JS-200",
      }),
    );
  });
});

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
