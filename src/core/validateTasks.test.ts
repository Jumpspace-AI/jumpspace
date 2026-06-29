import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTasks } from "./validateTasks.js";
import type { JumpTask } from "./types.js";

const baseTask: JumpTask = {
  id: "JS-001",
  title: "Parser",
  type: "spec",
  status: "approved",
  doc: {
    path: "docs/specs/jumpspace-v0.md",
    heading: "Parser",
  },
  spec: "Parse blocks.",
  code: [],
  tests: [],
  depends_on: [],
};

describe("validateTasks", () => {
  it("flags duplicate IDs and unknown dependencies as errors", async () => {
    const issues = await validateTasks([
      baseTask,
      {
        ...baseTask,
        depends_on: ["JS-404"],
      },
    ]);

    expect(issues.some((issue) => issue.code === "DUPLICATE_ID" && issue.severity === "error")).toBe(true);
    expect(issues.some((issue) => issue.code === "UNKNOWN_DEPENDENCY" && issue.severity === "error")).toBe(true);
  });

  it("warns on unknown structured refs but errors for depends_on refs", async () => {
    const issues = await validateTasks([
      baseTask,
      {
        ...baseTask,
        id: "JS-002",
        refs: [
          {
            type: "related_to",
            id: "JS-404",
          },
          {
            type: "depends_on",
            id: "JS-405",
          },
          {
            type: "informs",
            id: "EXTERNAL-001",
          },
        ],
      },
    ]);

    expect(issues.find((issue) => issue.code === "UNKNOWN_REF" && issue.taskId === "JS-002")?.severity).toBe(
      "warning",
    );
    expect(issues.find((issue) => issue.code === "UNKNOWN_REF_DEPENDENCY" && issue.taskId === "JS-002")?.severity).toBe(
      "error",
    );
    expect(issues.some((issue) => issue.message.includes("EXTERNAL-001"))).toBe(false);
  });

  it("treats missing files as warnings before implementation and errors after implementation", async () => {
    const issues = await validateTasks([
      {
        ...baseTask,
        id: "JS-002",
        status: "approved",
        code: ["missing.ts"],
      },
      {
        ...baseTask,
        id: "JS-003",
        status: "implemented",
        code: ["missing.ts"],
        tests: ["missing.test.ts"],
      },
    ]);

    expect(issues.find((issue) => issue.taskId === "JS-002" && issue.code === "MISSING_CODE_FILE")?.severity).toBe(
      "warning",
    );
    expect(issues.find((issue) => issue.taskId === "JS-003" && issue.code === "MISSING_CODE_FILE")?.severity).toBe(
      "error",
    );
  });

  it("allows implemented documentation-only tasks without tests", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-validate-"));
    await fs.writeFile(path.join(root, "README.md"), "# README\n");

    const issues = await validateTasks(
      [
        {
          ...baseTask,
          id: "JS-007",
          type: "engineering",
          status: "implemented",
          code: ["README.md"],
          tests: [],
        },
      ],
      root,
    );

    expect(issues).toEqual([]);
  });

  it("includes invalid task-plan state in audit issues", async () => {
    const issues = await validateTasks([
      {
        ...baseTask,
        id: "JS-010",
        plan: {
          task_id: "JS-010",
          goal: "Ship durable plans.",
          status: "pending",
          steps: [
            {
              id: "one",
              outcome: "First step.",
              status: "pending",
              depends_on: ["two"],
              source_files: [],
              tests: [],
              checks: [],
              evidence: [],
            },
            {
              id: "two",
              outcome: "Second step.",
              status: "pending",
              depends_on: ["one"],
              source_files: [],
              tests: [],
              checks: [],
              evidence: [],
            },
          ],
        },
      },
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "PLAN_STEP_DEPENDENCY_CYCLE",
        taskId: "JS-010",
      }),
    );
  });

  it("requires verified tasks to have records that cite known criteria", async () => {
    const issues = await validateTasks([
      {
        ...baseTask,
        id: "JS-011",
        status: "verified",
        code: ["src/feature.ts"],
        tests: ["src/feature.test.ts"],
        acceptance_criteria: [
          {
            id: "AC-1",
            description: "The feature works.",
          },
        ],
      },
      {
        ...baseTask,
        id: "JS-012",
        status: "implemented",
        acceptance_criteria: [
          {
            id: "AC-1",
            description: "First.",
          },
          {
            id: "AC-1",
            description: "Duplicate.",
          },
        ],
        verification_records: [
          {
            id: "verify-1",
            verified_at: "2026-01-01T00:00:00.000Z",
            commit: "abc123",
            checks: [
              {
                command: "npm test",
                exit_code: 0,
              },
            ],
            acceptance_criteria_covered: ["AC-404"],
            evidence: [],
          },
        ],
      },
    ]);

    expect(issues).toContainEqual(expect.objectContaining({ code: "VERIFIED_TASK_WITHOUT_RECORD", taskId: "JS-011" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "DUPLICATE_ACCEPTANCE_CRITERION", taskId: "JS-012" }));
    expect(issues).toContainEqual(expect.objectContaining({ code: "UNKNOWN_VERIFICATION_CRITERION", taskId: "JS-012" }));
  });

  it("surfaces explicit task gaps as audit warnings", async () => {
    const issues = await validateTasks([
      {
        ...baseTask,
        id: "JS-013",
        gaps: ["Linked code moved and needs human review."],
      },
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "TASK_HAS_GAP",
        taskId: "JS-013",
      }),
    );
  });

  it("warns when task source headings are title-ambiguous", async () => {
    const issues = await validateTasks([
      {
        ...baseTask,
        id: "JS-020",
        doc: {
          path: "docs/runbook.md",
          heading: "Local development",
          line: 5,
          level: 2,
          parent_headings: ["App"],
        },
      },
      {
        ...baseTask,
        id: "JS-021",
        doc: {
          path: "docs/runbook.md",
          heading: "Local development",
          line: 42,
          level: 3,
          parent_headings: ["Workers"],
        },
      },
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "AMBIGUOUS_TASK_HEADING",
        path: "docs/runbook.md",
      }),
    );
    expect(issues.find((issue) => issue.code === "AMBIGUOUS_TASK_HEADING")?.message).toContain("JS-020, JS-021");
  });
});
