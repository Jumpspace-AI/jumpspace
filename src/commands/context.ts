import { readIndex } from "../core/config.js";
import { getExecutionState } from "../core/execution.js";
import { renderTaskContext } from "../core/renderContext.js";

export type ContextOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runContext(id: string, options: ContextOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    throw new Error(`Unknown Jumpspace task ID "${id}". Run \`jumpspace list\` to see known tasks.`);
  }

  const execution = getExecutionState(index, id);

  writeLine(options.json ? JSON.stringify({ task, plan: task.plan ?? null, execution }, null, 2) : renderTaskContext(task));
  return 0;
}
