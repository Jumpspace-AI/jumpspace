import chalk from "chalk";
import { readIndex } from "../core/config.js";
import { filterTasks, validateTaskFilters, type TaskFilterOptions } from "../core/filterTasks.js";
import type { JumpTask } from "../core/types.js";

export type ListOptions = {
  root?: string;
  status?: string;
  type?: string;
  module?: string;
  space?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runList(options: ListOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;

  validateTaskFilters(options);

  const index = await readIndex(root);
  const tasks = filterTasks(index, options);
  writeLine(options.json ? JSON.stringify({ tasks }, null, 2) : formatTaskTable(tasks));
  return 0;
}

export function formatTaskTable(tasks: JumpTask[]): string {
  if (tasks.length === 0) {
    return chalk.dim("No tasks found.");
  }

  const showModule = tasks.some((task) => Boolean(task.module));
  const showSpace = tasks.some((task) => Boolean(task.space));
  const headers = ["ID", "STATUS", "TYPE", ...(showModule ? ["MODULE"] : []), ...(showSpace ? ["SPACE"] : []), "TITLE"];
  const rows = tasks.map((task) => [
    task.id,
    task.status,
    task.type,
    ...(showModule ? [task.module ?? ""] : []),
    ...(showSpace ? [task.space ?? ""] : []),
    task.title,
  ]);
  const widths = headers.map((header, index) => {
    const maxValue = Math.max(header.length, ...rows.map((row) => row[index].length));
    return index === headers.length - 1 ? maxValue : maxValue + 2;
  });

  const formatRow = (row: string[]) =>
    row.map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index]))).join("");

  return [formatRow(headers), ...rows.map(formatRow)].join("\n");
}
