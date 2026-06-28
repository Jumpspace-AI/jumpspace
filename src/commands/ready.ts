import { readIndex } from "../core/config.js";
import { validateTaskFilters, type TaskFilterOptions } from "../core/filterTasks.js";
import { getReadyTasks, renderReadyTasks } from "../core/execution.js";

export type ReadyOptions = TaskFilterOptions & {
  root?: string;
  includeBlocked?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runReady(options: ReadyOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;

  validateTaskFilters(options);

  const index = await readIndex(root);
  const tasks = getReadyTasks(index, options);
  writeLine(options.json ? JSON.stringify({ tasks }, null, 2) : renderReadyTasks(tasks));
  return 0;
}
