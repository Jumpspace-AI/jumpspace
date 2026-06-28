import { readIndex } from "../core/config.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { getNextPlanSteps, renderNextSteps } from "../core/plans.js";

export type NextOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runNext(id: string, options: NextOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    const message = `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`;
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(commandError("UNKNOWN_TASK", message, { taskId: id })), null, 2));
    } else {
      errorLine(message);
    }
    return 1;
  }

  if (!task.plan) {
    const message = `Task ${id} does not have a plan.`;
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(commandError("MISSING_PLAN", message, { taskId: id })), null, 2));
    } else {
      errorLine(message);
    }
    return 1;
  }

  const steps = getNextPlanSteps(task);
  writeLine(options.json ? JSON.stringify({ task_id: id, steps }, null, 2) : renderNextSteps(task, steps));
  return 0;
}
