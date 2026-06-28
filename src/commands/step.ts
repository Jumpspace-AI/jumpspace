import { loadConfig, readIndex } from "../core/config.js";
import { commandError, errorEnvelope, issuesToCommandErrors } from "../core/errors.js";
import { refreshIndex } from "../core/refreshIndex.js";
import { recordMutation } from "../core/mutations.js";
import { completePlanStep, writeTaskPlan } from "../core/plans.js";

export type StepCompleteOptions = {
  root?: string;
  evidence: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runStepComplete(taskId: string, stepId: string, options: StepCompleteOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === taskId);

  if (!task) {
    return writeError(options, "UNKNOWN_TASK", `Unknown Jumpspace task ID "${taskId}". Run \`jumpspace find <query>\` to locate it.`);
  }

  const result = completePlanStep(task, stepId, options.evidence);
  if (!result.ok) {
    if (options.json) {
      writeLine(JSON.stringify({ ...errorEnvelope(issuesToCommandErrors(result.issues)), issues: result.issues }, null, 2));
    } else {
      for (const issue of result.issues) {
        errorLine(`${issue.code}${issue.stepId ? ` ${issue.stepId}` : ""}: ${issue.message}`);
      }
    }
    return 1;
  }

  await writeTaskPlan(root, task, result.plan);
  await refreshIndex(root);
  const config = await loadConfig(root);
  await recordMutation(root, {
    command: "step complete",
    touched_files: [task.doc.path, config.indexPath],
    task_ids: [taskId],
    index_changed: true,
  });

  writeLine(
    options.json
      ? JSON.stringify({ ok: true, task_id: taskId, step: result.step, plan: result.plan }, null, 2)
      : `Completed ${taskId} step ${stepId}.`,
  );
  return 0;
}

function writeError(options: StepCompleteOptions, code: string, message: string): number {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  if (options.json) {
    writeLine(JSON.stringify(errorEnvelope(commandError(code, message)), null, 2));
  } else {
    errorLine(message);
  }
  return 1;
}
