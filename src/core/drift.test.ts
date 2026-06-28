import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { runScan } from "../commands/scan.js";
import { detectDrift } from "./drift.js";

const execFileAsync = promisify(execFile);

describe("detectDrift", () => {
  it("separates factual linked-file drift from heuristic warnings", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-drift-"));
    await fs.mkdir(path.join(root, "docs", "specs"), { recursive: true });
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "feature.ts"), "base\n");
    await fs.writeFile(path.join(root, "src", "feature.test.ts"), "base\n");
    await fs.writeFile(
      path.join(root, "docs", "specs", "feature.md"),
      `# Feature

## Drift target

<!-- jumpspace
id: JS-300
type: spec
status: implemented
code:
  - src/feature.ts
tests:
  - src/feature.test.ts
depends_on: []
-->

Feature spec.
`,
    );
    await runScan({ root, writeLine: () => {}, errorLine: () => {} });
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
    await execFileAsync("git", ["add", "."], { cwd: root });
    await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();

    await fs.writeFile(path.join(root, "src", "feature.ts"), "changed\n");
    await fs.writeFile(path.join(root, "unmapped.txt"), "new\n");

    const result = await detectDrift(root, base);

    expect(result.ok).toBe(true);
    expect(result.ok ? result.facts : []).toContainEqual(
      expect.objectContaining({ code: "LINKED_CODE_CHANGED", taskId: "JS-300", path: "src/feature.ts" }),
    );
    expect(result.ok ? result.facts : []).toContainEqual(expect.objectContaining({ code: "UNMAPPED_CHANGED_FILE", path: "unmapped.txt" }));
    expect(result.ok ? result.warnings : []).toContainEqual(expect.objectContaining({ code: "DOCS_MAY_NEED_UPDATING", taskId: "JS-300" }));
  });
});
