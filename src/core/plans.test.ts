import { describe, expect, it } from "vitest";
import {
  completePlanStep,
  getNextPlanSteps,
  renderNextSteps,
  renderPlan,
  renderPlanValidation,
  validateTaskPlan,
} from "./plans.js";
import type { JumpTask } from "./types.js";

const baseTask: JumpTask = {
  id: "JS-100",
  title: "Durable plans",
  type: "spec",
  status: "approved",
  space: "repo",
  doc: {
    path: "docs/specs/example.md",
    heading: "Durable plans",
  },
  spec: "Execute a planned task.",
  code: ["src/core/plans.ts"],
  tests: ["src/core/plans.test.ts"],
  depends_on: [],
};

function taskWithPlan(overrides: Partial<JumpTask["plan"]> = {}): JumpTask {
  return {
    ...baseTask,
    plan: {
      task_id: "JS-100",
      goal: "Ship durable planning.",
      status: "pending",
      steps: [
        {
          id: "design",
          outcome: "Plan format exists.",
          status: "complete",
          depends_on: [],
          source_files: ["docs/specs/example.md"],
          tests: [],
          checks: ["jumpspace task plan validate JS-100"],
          evidence: ["Reviewed with a human."],
        },
        {
          id: "implement",
          outcome: "CLI commands exist.",
          status: "pending",
          depends_on: ["design"],
          source_files: ["src/commands/plan.ts"],
          tests: ["src/core/plans.test.ts"],
          checks: ["npm test"],
          evidence: [],
        },
      ],
      ...overrides,
    },
  };
}

describe("validateTaskPlan", () => {
  it("accepts a valid plan", () => {
    expect(validateTaskPlan(taskWithPlan())).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("rejects unknown tasks when a plan is required", () => {
    const validation = validateTaskPlan(baseTask, { requirePlan: true });

    expect(validation.ok).toBe(false);
    expect(validation.issues[0]).toMatchObject({
      code: "MISSING_PLAN",
      taskId: "JS-100",
    });
  });

  it("rejects duplicate step IDs", () => {
    const validation = validateTaskPlan(
      taskWithPlan({
        steps: [
          taskWithPlan().plan!.steps[0],
          {
            ...taskWithPlan().plan!.steps[1],
            id: "design",
          },
        ],
      }),
    );

    expect(validation.issues.some((issue) => issue.code === "DUPLICATE_PLAN_STEP_ID")).toBe(true);
  });

  it("rejects unknown step dependencies", () => {
    const validation = validateTaskPlan(
      taskWithPlan({
        steps: [
          taskWithPlan().plan!.steps[0],
          {
            ...taskWithPlan().plan!.steps[1],
            depends_on: ["missing"],
          },
        ],
      }),
    );

    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        code: "UNKNOWN_PLAN_STEP_DEPENDENCY",
        stepId: "implement",
      }),
    );
  });

  it("rejects dependency cycles", () => {
    const validation = validateTaskPlan(
      taskWithPlan({
        steps: [
          {
            ...taskWithPlan().plan!.steps[0],
            depends_on: ["implement"],
          },
          taskWithPlan().plan!.steps[1],
        ],
      }),
    );

    expect(validation.issues.some((issue) => issue.code === "PLAN_STEP_DEPENDENCY_CYCLE")).toBe(true);
  });

  it("rejects completed steps without evidence", () => {
    const validation = validateTaskPlan(
      taskWithPlan({
        steps: [
          {
            ...taskWithPlan().plan!.steps[0],
            evidence: [],
          },
          taskWithPlan().plan!.steps[1],
        ],
      }),
    );

    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        code: "COMPLETED_PLAN_STEP_WITHOUT_EVIDENCE",
        stepId: "design",
      }),
    );
  });

  it("rejects completed steps with incomplete dependencies", () => {
    const validation = validateTaskPlan(
      taskWithPlan({
        steps: [
          {
            ...taskWithPlan().plan!.steps[0],
            status: "pending",
            evidence: [],
          },
          {
            ...taskWithPlan().plan!.steps[1],
            status: "complete",
            evidence: ["Done."],
          },
        ],
      }),
    );

    expect(validation.issues).toContainEqual(
      expect.objectContaining({
        code: "COMPLETED_PLAN_STEP_WITH_INCOMPLETE_DEPENDENCY",
        stepId: "implement",
      }),
    );
  });
});

describe("plan execution helpers", () => {
  it("returns only pending unblocked steps", () => {
    expect(getNextPlanSteps(taskWithPlan()).map((step) => step.id)).toEqual(["implement"]);
  });

  it("blocks step completion until dependencies are complete", () => {
    const task = taskWithPlan({
      steps: [
        {
          ...taskWithPlan().plan!.steps[0],
          status: "pending",
          evidence: [],
        },
        taskWithPlan().plan!.steps[1],
      ],
    });

    const result = completePlanStep(task, "implement", "Tried to finish.");

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toContainEqual(
      expect.objectContaining({
        code: "BLOCKED_PLAN_STEP",
        stepId: "implement",
      }),
    );
  });

  it("requires evidence to complete a step", () => {
    const result = completePlanStep(taskWithPlan(), "implement", " ");

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.issues).toContainEqual(
      expect.objectContaining({
        code: "MISSING_STEP_EVIDENCE",
      }),
    );
  });

  it("completes a step and records evidence", () => {
    const result = completePlanStep(taskWithPlan(), "implement", "npm test passed.");

    expect(result.ok).toBe(true);
    expect(result.ok ? result.step : undefined).toMatchObject({
      id: "implement",
      status: "complete",
      evidence: ["npm test passed."],
    });
    expect(result.ok ? result.plan.status : undefined).toBe("complete");
  });
});

describe("plan renderers", () => {
  it("renders human-readable plan, validation, and next-step output", () => {
    const task = taskWithPlan();

    expect(renderPlan(task)).toContain("# Jumpspace Plan for JS-100");
    expect(renderPlanValidation(task, validateTaskPlan(task))).toContain("Plan for JS-100 is valid.");
    expect(renderNextSteps(task, getNextPlanSteps(task))).toContain("implement: CLI commands exist.");
  });
});
