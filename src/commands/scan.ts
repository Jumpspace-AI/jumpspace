import chalk from "chalk";
import { loadConfig, writeIndex } from "../core/config.js";
import { indexTasks } from "../core/indexTasks.js";
import { hasBlockingIssues } from "../core/validateTasks.js";
import type { JumpIssue } from "../core/types.js";

export type ScanOptions = {
  root?: string;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runScan(options: ScanOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const config = await loadConfig(root);
  const result = await indexTasks(root, config);

  await writeIndex(root, result.index, config.indexPath);

  for (const issue of result.issues) {
    errorLine(formatIssue(issue));
  }

  writeLine(chalk.green(`Indexed ${result.index.tasks.length} task(s) at ${config.indexPath}.`));
  return hasBlockingIssues(result.issues) ? 1 : 0;
}

function formatIssue(issue: JumpIssue): string {
  const location = [issue.path, issue.line ? `:${issue.line}` : ""].filter(Boolean).join("");
  const prefix = issue.severity === "error" ? chalk.red("error") : chalk.yellow("warning");
  return `${prefix} ${issue.code}${location ? ` ${location}` : ""}: ${issue.message}`;
}

