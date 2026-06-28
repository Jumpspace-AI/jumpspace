import { loadConfig, readIndex } from "../core/config.js";
import { commandError, errorEnvelope, issuesToCommandErrors } from "../core/errors.js";
import { getExecutionState, renderPlanPacket } from "../core/execution.js";
import { refreshIndex } from "../core/refreshIndex.js";
import { recordMutation } from "../core/mutations.js";
import {
  formatPlanParseError,
  readPlanFile,
  renderPlan,
  renderPlanValidation,
  validateTaskPlan,
  writeTaskPlan,
} from "../core/plans.js";
import type { JumpIssue } from "../core/types.js";

export type PlanOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type PlanSaveOptions = PlanOptions & {
  file: string;
};

export async function runPlanReview(id: string, options: PlanOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const state = getExecutionState(index, id);

  if (!state) {
    return writeCommandError(options, "UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`);
  }

  writeLine(options.json ? JSON.stringify(state, null, 2) : renderPlanPacket(state));
  return 0;
}

export async function runPlanSave(id: string, options: PlanSaveOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    return writeCommandError(options, "UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`);
  }

  let plan;
  try {
    plan = await readPlanFile(options.file);
  } catch (error) {
    return writeCommandError(options, "INVALID_PLAN_FILE", `Invalid plan file: ${formatPlanParseError(error)}`);
  }

  const taskWithPlan = {
    ...task,
    plan,
  };
  const validation = validateTaskPlan(taskWithPlan, { requirePlan: true });
  if (!validation.ok) {
    return writeIssues(options, validation.issues);
  }

  await writeTaskPlan(root, task, plan);
  await refreshIndex(root);
  const config = await loadConfig(root);
  await recordMutation(root, {
    command: "plan save",
    touched_files: [task.doc.path, config.indexPath],
    task_ids: [id],
    index_changed: true,
  });

  writeLine(options.json ? JSON.stringify({ ok: true, task_id: id, plan }, null, 2) : `Saved plan for ${id}.`);
  return 0;
}

export async function runPlanShow(id: string, options: PlanOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    return writeCommandError(options, "UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`);
  }

  if (!task.plan) {
    return writeCommandError(options, "MISSING_PLAN", `Task ${id} does not have a plan.`);
  }

  writeLine(options.json ? JSON.stringify({ task_id: id, plan: task.plan }, null, 2) : renderPlan(task));
  return 0;
}

export async function runPlanValidate(id: string, options: PlanOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    return writeCommandError(options, "UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`);
  }

  const validation = validateTaskPlan(task, { requirePlan: true });
  writeLine(
    options.json
      ? JSON.stringify(
          {
            task_id: id,
            ok: validation.ok,
            issues: validation.issues,
            errors: validation.ok ? [] : issuesToCommandErrors(validation.issues),
          },
          null,
          2,
        )
      : renderPlanValidation(task, validation),
  );
  return validation.ok ? 0 : 1;
}

function writeCommandError(options: PlanOptions, code: string, message: string): number {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  if (options.json) {
    writeLine(JSON.stringify(errorEnvelope(commandError(code, message)), null, 2));
  } else {
    errorLine(message);
  }
  return 1;
}

function writeIssues(options: PlanOptions, issues: JumpIssue[]): number {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  if (options.json) {
    writeLine(JSON.stringify({ ...errorEnvelope(issuesToCommandErrors(issues)), issues }, null, 2));
  } else {
    for (const issue of issues) {
      errorLine(`${issue.code}${issue.stepId ? ` ${issue.stepId}` : ""}: ${issue.message}`);
    }
  }
  return 1;
}
