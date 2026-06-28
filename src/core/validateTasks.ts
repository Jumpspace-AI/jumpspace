import path from "node:path";
import { pathExists, resolveRepoPath } from "./config.js";
import { validateTaskPlan } from "./plans.js";
import type { JumpIssue, JumpTask, JumpTaskRefType } from "./types.js";

const completeStatuses = new Set(["implemented", "verified"]);
const documentationExtensions = new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]);
const refsThatShouldResolve = new Set<JumpTaskRefType>([
  "depends_on",
  "related_to",
  "implements",
  "supersedes",
  "conflicts_with",
]);

export async function validateTasks(tasks: JumpTask[], root = process.cwd()): Promise<JumpIssue[]> {
  const issues: JumpIssue[] = [];
  const ids = new Map<string, JumpTask[]>();

  for (const task of tasks) {
    ids.set(task.id, [...(ids.get(task.id) ?? []), task]);
  }

  for (const [id, matchingTasks] of ids) {
    if (matchingTasks.length > 1) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_ID",
        taskId: id,
        message: `Duplicate Jumpspace task ID "${id}" appears ${matchingTasks.length} times.`,
      });
    }
  }

  const knownIds = new Set(ids.keys());
  issues.push(...ambiguousTaskHeadingIssues(tasks));

  for (const task of tasks) {
    const isComplete = completeStatuses.has(task.status);
    const acceptanceIds = new Map<string, number>();

    for (const criterion of task.acceptance_criteria ?? []) {
      acceptanceIds.set(criterion.id, (acceptanceIds.get(criterion.id) ?? 0) + 1);
    }

    for (const [criterionId, count] of acceptanceIds) {
      if (count > 1) {
        issues.push({
          severity: "error",
          code: "DUPLICATE_ACCEPTANCE_CRITERION",
          taskId: task.id,
          message: `Task ${task.id} has duplicate acceptance criterion "${criterionId}".`,
        });
      }
    }

    if (task.status === "verified" && (task.verification_records ?? []).length === 0) {
      issues.push({
        severity: "error",
        code: "VERIFIED_TASK_WITHOUT_RECORD",
        taskId: task.id,
        message: `Task ${task.id} is verified but has no verification records.`,
      });
    }

    for (const record of task.verification_records ?? []) {
      for (const criterionId of record.acceptance_criteria_covered) {
        if (!acceptanceIds.has(criterionId)) {
          issues.push({
            severity: "error",
            code: "UNKNOWN_VERIFICATION_CRITERION",
            taskId: task.id,
            message: `Verification record ${record.id} cites unknown acceptance criterion "${criterionId}".`,
          });
        }
      }
    }

    for (const gap of task.gaps ?? []) {
      issues.push({
        severity: "warning",
        code: "TASK_HAS_GAP",
        taskId: task.id,
        message: `Task ${task.id} has an explicit unresolved gap: ${gap}`,
      });
    }

    if (isComplete && task.code.length === 0) {
      issues.push({
        severity: "error",
        code: "COMPLETE_TASK_WITHOUT_CODE",
        taskId: task.id,
        message: `Task ${task.id} is ${task.status} but has no linked code files.`,
      });
    }

    if (isComplete && task.tests.length === 0 && !isDocumentationOnlyTask(task)) {
      issues.push({
        severity: "error",
        code: "COMPLETE_TASK_WITHOUT_TESTS",
        taskId: task.id,
        message: `Task ${task.id} is ${task.status} but has no linked test files.`,
      });
    }

    for (const dependency of task.depends_on) {
      if (!knownIds.has(dependency)) {
        issues.push({
          severity: "error",
          code: "UNKNOWN_DEPENDENCY",
          taskId: task.id,
          message: `Task ${task.id} depends on unknown task ID "${dependency}".`,
        });
      }
    }

    for (const ref of task.refs ?? []) {
      if (!refsThatShouldResolve.has(ref.type) || knownIds.has(ref.id)) {
        continue;
      }

      issues.push({
        severity: ref.type === "depends_on" ? "error" : "warning",
        code: ref.type === "depends_on" ? "UNKNOWN_REF_DEPENDENCY" : "UNKNOWN_REF",
        taskId: task.id,
        message: `Task ${task.id} has ${ref.type} ref to unknown task ID "${ref.id}".`,
      });
    }

    for (const codePath of task.code) {
      if (!(await pathExists(resolveRepoPath(root, codePath)))) {
        issues.push({
          severity: isComplete ? "error" : "warning",
          code: "MISSING_CODE_FILE",
          taskId: task.id,
          path: codePath,
          message: `Task ${task.id} links missing code file "${codePath}".`,
        });
      }
    }

    for (const testPath of task.tests) {
      if (!(await pathExists(resolveRepoPath(root, testPath)))) {
        issues.push({
          severity: isComplete ? "error" : "warning",
          code: "MISSING_TEST_FILE",
          taskId: task.id,
          path: testPath,
          message: `Task ${task.id} links missing test file "${testPath}".`,
        });
      }
    }

    issues.push(...validateTaskPlan(task).issues);
  }

  return issues;
}

export function hasBlockingIssues(issues: JumpIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

function isDocumentationOnlyTask(task: JumpTask): boolean {
  return (
    task.code.length > 0 &&
    task.code.every((repoPath) => {
      const normalized = repoPath.replaceAll("\\", "/").toLowerCase();
      if (normalized === "readme.md" || normalized.startsWith("docs/")) {
        return true;
      }
      return documentationExtensions.has(path.extname(normalized));
    })
  );
}

function ambiguousTaskHeadingIssues(tasks: JumpTask[]): JumpIssue[] {
  const byHeading = new Map<string, JumpTask[]>();
  for (const task of tasks) {
    const key = `${task.doc.path}\0${task.doc.heading}`;
    byHeading.set(key, [...(byHeading.get(key) ?? []), task]);
  }

  const issues: JumpIssue[] = [];
  for (const matchingTasks of byHeading.values()) {
    if (matchingTasks.length <= 1) {
      continue;
    }

    const first = matchingTasks[0];
    const taskIds = matchingTasks.map((task) => task.id).join(", ");
    const lines = matchingTasks
      .map((task) => task.doc.line)
      .filter((line): line is number => typeof line === "number")
      .join(", ");
    issues.push({
      severity: "warning",
      code: "AMBIGUOUS_TASK_HEADING",
      path: first.doc.path,
      line: first.doc.line,
      message: `Tasks ${taskIds} share heading "${first.doc.heading}" in ${first.doc.path}${lines ? ` at lines ${lines}` : ""}; use doc.line, doc.level, and doc.parent_headings when referencing or repairing these tasks.`,
    });
  }

  return issues;
}
