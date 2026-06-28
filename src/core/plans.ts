import fs from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { jumpPlanSchema, type JumpIssue, type JumpPlan, type JumpPlanStep, type JumpTask } from "./types.js";
import { updateTaskMetadata } from "./metadata.js";

export type PlanValidationResult = {
  ok: boolean;
  issues: JumpIssue[];
};

export type CompleteStepResult =
  | {
      ok: true;
      plan: JumpPlan;
      step: JumpPlanStep;
    }
  | {
      ok: false;
      issues: JumpIssue[];
    };

export async function readPlanFile(filePath: string): Promise<JumpPlan> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parseYaml(raw);
  return jumpPlanSchema.parse(parsed);
}

export function validateTaskPlan(task: JumpTask, options: { requirePlan?: boolean } = {}): PlanValidationResult {
  const issues: JumpIssue[] = [];
  const plan = task.plan;

  if (!plan) {
    if (options.requirePlan) {
      issues.push({
        severity: "error",
        code: "MISSING_PLAN",
        taskId: task.id,
        message: `Task ${task.id} does not have a plan.`,
      });
    }
    return result(issues);
  }

  if (plan.task_id !== task.id) {
    issues.push({
      severity: "error",
      code: "PLAN_TASK_ID_MISMATCH",
      taskId: task.id,
      message: `Task ${task.id} has a plan for "${plan.task_id}".`,
    });
  }

  const stepsById = new Map<string, JumpPlanStep[]>();
  for (const step of plan.steps) {
    stepsById.set(step.id, [...(stepsById.get(step.id) ?? []), step]);
  }

  for (const [stepId, matchingSteps] of stepsById) {
    if (matchingSteps.length > 1) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_PLAN_STEP_ID",
        taskId: task.id,
        stepId,
        message: `Plan for ${task.id} has duplicate step ID "${stepId}".`,
      });
    }
  }

  const knownStepIds = new Set(stepsById.keys());
  for (const step of plan.steps) {
    for (const dependency of step.depends_on) {
      if (!knownStepIds.has(dependency)) {
        issues.push({
          severity: "error",
          code: "UNKNOWN_PLAN_STEP_DEPENDENCY",
          taskId: task.id,
          stepId: step.id,
          message: `Step ${step.id} depends on unknown step "${dependency}".`,
        });
      }
    }

    if (step.status === "complete" && step.evidence.length === 0) {
      issues.push({
        severity: "error",
        code: "COMPLETED_PLAN_STEP_WITHOUT_EVIDENCE",
        taskId: task.id,
        stepId: step.id,
        message: `Step ${step.id} is complete but has no evidence.`,
      });
    }

    if (step.status === "complete") {
      const incompleteDependencies = step.depends_on.filter((dependency) => {
        const dependencyStep = stepsById.get(dependency)?.[0];
        return dependencyStep && dependencyStep.status !== "complete";
      });

      for (const dependency of incompleteDependencies) {
        issues.push({
          severity: "error",
          code: "COMPLETED_PLAN_STEP_WITH_INCOMPLETE_DEPENDENCY",
          taskId: task.id,
          stepId: step.id,
          message: `Step ${step.id} is complete but dependency "${dependency}" is not complete.`,
        });
      }
    }
  }

  for (const cycle of findStepCycles(plan.steps)) {
    issues.push({
      severity: "error",
      code: "PLAN_STEP_DEPENDENCY_CYCLE",
      taskId: task.id,
      message: `Plan for ${task.id} has a dependency cycle: ${cycle.join(" -> ")}.`,
    });
  }

  if (plan.status === "complete" && plan.steps.some((step) => step.status !== "complete")) {
    issues.push({
      severity: "error",
      code: "COMPLETE_PLAN_WITH_INCOMPLETE_STEPS",
      taskId: task.id,
      message: `Plan for ${task.id} is complete but one or more steps are not complete.`,
    });
  }

  return result(issues);
}

export function getNextPlanSteps(task: JumpTask): JumpPlanStep[] {
  if (!task.plan) {
    return [];
  }

  const stepsById = new Map(task.plan.steps.map((step) => [step.id, step]));
  return task.plan.steps.filter((step) => {
    if (step.status !== "pending") {
      return false;
    }

    return step.depends_on.every((dependency) => stepsById.get(dependency)?.status === "complete");
  });
}

export function completePlanStep(task: JumpTask, stepId: string, evidence: string): CompleteStepResult {
  const trimmedEvidence = evidence.trim();
  if (!task.plan) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "MISSING_PLAN",
          taskId: task.id,
          message: `Task ${task.id} does not have a plan.`,
        },
      ],
    };
  }

  if (!trimmedEvidence) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "MISSING_STEP_EVIDENCE",
          taskId: task.id,
          stepId,
          message: "Completing a step requires non-empty evidence.",
        },
      ],
    };
  }

  const step = task.plan.steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    return {
      ok: false,
      issues: [
        {
          severity: "error",
          code: "UNKNOWN_PLAN_STEP",
          taskId: task.id,
          stepId,
          message: `Task ${task.id} has no plan step "${stepId}".`,
        },
      ],
    };
  }

  const stepsById = new Map(task.plan.steps.map((candidate) => [candidate.id, candidate]));
  const blockers = step.depends_on
    .map((dependency) => stepsById.get(dependency))
    .filter((dependency): dependency is JumpPlanStep => dependency !== undefined && dependency.status !== "complete");

  if (blockers.length > 0) {
    return {
      ok: false,
      issues: blockers.map((blocker) => ({
        severity: "error",
        code: "BLOCKED_PLAN_STEP",
        taskId: task.id,
        stepId,
        message: `Step ${stepId} cannot be completed until dependency "${blocker.id}" is complete.`,
      })),
    };
  }

  const steps = task.plan.steps.map((candidate) =>
    candidate.id === stepId
      ? {
          ...candidate,
          status: "complete" as const,
          evidence: [...candidate.evidence, trimmedEvidence],
        }
      : candidate,
  );
  const completedStep = steps.find((candidate) => candidate.id === stepId)!;
  const plan: JumpPlan = {
    ...task.plan,
    status: steps.every((candidate) => candidate.status === "complete") ? "complete" : "in_progress",
    steps,
  };

  return {
    ok: true,
    plan,
    step: completedStep,
  };
}

export async function writeTaskPlan(root: string, task: JumpTask, plan: JumpPlan): Promise<void> {
  await updateTaskMetadata(root, task, (metadata) => ({
    ...metadata,
    plan,
  }));
}

export function renderPlan(task: JumpTask): string {
  const plan = task.plan;
  if (!plan) {
    return `Task ${task.id} does not have a plan.`;
  }

  return [
    `# Jumpspace Plan for ${task.id}`,
    "",
    `Goal: ${plan.goal}`,
    `Status: ${plan.status}`,
    "",
    "## Steps",
    "",
    ...plan.steps.flatMap((step, index) => [
      `${index + 1}. ${step.id} (${step.status})`,
      `   Outcome: ${step.outcome}`,
      `   Depends on: ${step.depends_on.length ? step.depends_on.join(", ") : "None"}`,
      `   Source files: ${step.source_files.length ? step.source_files.join(", ") : "None"}`,
      `   Tests: ${step.tests.length ? step.tests.join(", ") : "None"}`,
      `   Checks: ${step.checks.length ? step.checks.join(", ") : "None"}`,
      `   Evidence: ${step.evidence.length ? step.evidence.join(" | ") : "None"}`,
      "",
    ]),
  ].join("\n");
}

export function renderPlanValidation(task: JumpTask, validation: PlanValidationResult): string {
  if (validation.ok) {
    return `Plan for ${task.id} is valid.`;
  }

  return [`Plan for ${task.id} is invalid:`, "", ...validation.issues.map((issue) => `- ${formatIssue(issue)}`)].join("\n");
}

export function renderNextSteps(task: JumpTask, steps: JumpPlanStep[]): string {
  if (!task.plan) {
    return `Task ${task.id} does not have a plan.`;
  }

  if (steps.length === 0) {
    return `No pending unblocked steps for ${task.id}.`;
  }

  return [
    `# Next steps for ${task.id}`,
    "",
    ...steps.flatMap((step) => [
      `- ${step.id}: ${step.outcome}`,
      `  Source files: ${step.source_files.length ? step.source_files.join(", ") : "None"}`,
      `  Tests: ${step.tests.length ? step.tests.join(", ") : "None"}`,
      `  Checks: ${step.checks.length ? step.checks.join(", ") : "None"}`,
    ]),
  ].join("\n");
}

export function formatPlanParseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "plan"}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function result(issues: JumpIssue[]): PlanValidationResult {
  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

function findStepCycles(steps: JumpPlanStep[]): string[][] {
  const stepsById = new Map(steps.map((step) => [step.id, step]));
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(stepId: string, path: string[]): void {
    if (visiting.has(stepId)) {
      const cycleStart = path.indexOf(stepId);
      cycles.push([...path.slice(cycleStart), stepId]);
      return;
    }
    if (visited.has(stepId)) {
      return;
    }

    const step = stepsById.get(stepId);
    if (!step) {
      return;
    }

    visiting.add(stepId);
    for (const dependency of step.depends_on) {
      visit(dependency, [...path, stepId]);
    }
    visiting.delete(stepId);
    visited.add(stepId);
  }

  for (const step of steps) {
    visit(step.id, []);
  }

  return cycles;
}

function formatIssue(issue: JumpIssue): string {
  return `${issue.code}${issue.stepId ? ` ${issue.stepId}` : ""}: ${issue.message}`;
}
