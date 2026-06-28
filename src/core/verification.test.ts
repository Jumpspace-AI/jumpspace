import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { verifyTask } from "./verification.js";
import type { JumpTask } from "./types.js";

const execFileAsync = promisify(execFile);

describe("verifyTask", () => {
  it("captures commit, timestamp, checks, criteria, and evidence for passing verification", async () => {
    const root = await createGitRepo();
    const commit = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();

    const result = await verifyTask(task(), {
      root,
      checks: [`${process.execPath} -e "process.exit(0)"`],
      criteria: ["AC-1"],
      evidence: "Smoke check passed.",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.record : undefined).toMatchObject({
      verified_at: "2026-01-01T00:00:00.000Z",
      commit,
      checks: [
        {
          command: `${process.execPath} -e "process.exit(0)"`,
          exit_code: 0,
        },
      ],
      acceptance_criteria_covered: ["AC-1"],
      evidence: ["Smoke check passed."],
    });
  });

  it("rejects failed checks and missing criteria without producing a record", async () => {
    const root = await createGitRepo();

    const failed = await verifyTask(task(), {
      root,
      checks: [`${process.execPath} -e "process.exit(2)"`],
      criteria: ["AC-1"],
    });
    expect(failed.ok).toBe(false);
    expect(failed.ok ? [] : failed.errors).toContainEqual(expect.objectContaining({ code: "CHECK_FAILED" }));
    expect(failed.ok ? [] : failed.checks).toContainEqual(expect.objectContaining({ exit_code: 2 }));

    const missing = await verifyTask(task(), {
      root,
      checks: [`${process.execPath} -e "process.exit(0)"`],
      criteria: ["AC-404"],
    });
    expect(missing.ok).toBe(false);
    expect(missing.ok ? [] : missing.errors).toContainEqual(expect.objectContaining({ code: "UNKNOWN_ACCEPTANCE_CRITERION" }));
  });
});

function task(): JumpTask {
  return {
    id: "JS-100",
    title: "Verification",
    type: "spec",
    status: "implemented",
    space: "repo",
    doc: {
      path: "docs/specs/feature.md",
      heading: "Verification",
    },
    spec: "Verify the feature.",
    code: ["src/feature.ts"],
    tests: ["src/feature.test.ts"],
    depends_on: [],
    acceptance_criteria: [
      {
        id: "AC-1",
        description: "Checks pass.",
      },
    ],
  };
}

async function createGitRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-verify-"));
  await execFileAsync("git", ["init"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
  await fs.writeFile(path.join(root, "README.md"), "base\n");
  await execFileAsync("git", ["add", "README.md"], { cwd: root });
  await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
  return root;
}
