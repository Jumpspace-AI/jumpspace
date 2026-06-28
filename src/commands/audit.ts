import chalk from "chalk";
import { z } from "zod";
import { loadConfig, pathExists, readIndex, resolveRepoPath } from "../core/config.js";
import { issuesToCommandErrors } from "../core/errors.js";
import { indexTasks } from "../core/indexTasks.js";
import { semanticIndexAuditIssues } from "../core/semanticIndex.js";
import { hasBlockingIssues, validateTasks } from "../core/validateTasks.js";
import type { JumpIndex, JumpIssue } from "../core/types.js";

export type AuditOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type AuditResult = {
  issues: JumpIssue[];
  ok: boolean;
};

export async function auditJumpspace(root = process.cwd()): Promise<AuditResult> {
  const config = await loadConfig(root);
  const issues: JumpIssue[] = [];
  const indexPath = resolveRepoPath(root, config.indexPath);
  let storedIndex: JumpIndex | undefined;

  if (!(await pathExists(indexPath))) {
    issues.push({
      severity: "error",
      code: "MISSING_INDEX",
      path: config.indexPath,
      message: `Missing ${config.indexPath}. Run \`jumpspace scan\` first.`,
    });
  } else {
    try {
      storedIndex = await readIndex(root, config.indexPath);
    } catch (error) {
      issues.push({
        severity: "error",
        code: "INVALID_INDEX",
        path: config.indexPath,
        message: `Invalid ${config.indexPath}: ${formatError(error)}`,
      });
    }
  }

  const indexed = await indexTasks(root, config);
  if (storedIndex && !sameIndexedTasks(storedIndex, indexed.index)) {
    issues.push({
      severity: "error",
      code: "STALE_INDEX",
      path: config.indexPath,
      message: `${config.indexPath} is stale. Run \`jumpspace scan\` to regenerate it.`,
    });
  }
  issues.push(...indexed.issues);
  issues.push(...(await validateTasks(indexed.index.tasks, root)));
  issues.push(...(await semanticIndexAuditIssues(root, indexed.index, config)));

  return {
    issues,
    ok: !hasBlockingIssues(issues),
  };
}

export async function runAudit(options: AuditOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const result = await auditJumpspace(root);

  if (options.json) {
    writeLine(
      JSON.stringify(
        {
          ...result,
          errors: issuesToCommandErrors(result.issues.filter((issue) => issue.severity === "error")),
          warnings: result.issues.filter((issue) => issue.severity === "warning"),
        },
        null,
        2,
      ),
    );
    return result.ok ? 0 : 1;
  }

  for (const issue of result.issues) {
    const line = formatIssue(issue);
    if (issue.severity === "error") {
      errorLine(line);
    } else {
      writeLine(line);
    }
  }

  if (result.ok) {
    writeLine(chalk.green(`Jumpspace audit passed with ${result.issues.length} issue(s).`));
    return 0;
  }

  errorLine(chalk.red("Jumpspace audit failed."));
  return 1;
}

function sameIndexedTasks(left: JumpIndex, right: JumpIndex): boolean {
  return JSON.stringify(left.tasks) === JSON.stringify(right.tasks);
}

function formatIssue(issue: JumpIssue): string {
  const severity = issue.severity === "error" ? chalk.red("error") : chalk.yellow("warning");
  const location = [issue.path, issue.line ? `:${issue.line}` : ""].filter(Boolean).join("");
  return `${severity} ${issue.code}${issue.taskId ? ` ${issue.taskId}` : ""}${location ? ` ${location}` : ""}: ${issue.message}`;
}

function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "index"}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
