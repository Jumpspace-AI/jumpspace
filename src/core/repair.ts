import { auditJumpspace } from "../commands/audit.js";
import { getChangedFiles, type ChangeSource } from "./changed.js";
import { loadConfig, readIndex } from "./config.js";
import { commandError, type JsonCommandError } from "./errors.js";
import { updateTaskMetadata } from "./metadata.js";
import { recordMutation, type MutationWarning } from "./mutations.js";
import { refreshIndex } from "./refreshIndex.js";
import type { JumpIssue, JumpTask, JumpTaskMetadata } from "./types.js";

export type RepairMode = "dry-run" | "apply";
export type RepairPathField = "code" | "tests" | "sources";

export type RepairFix = {
  type: "replace_linked_path";
  task_id: string;
  field: RepairPathField;
  old_path: string;
  new_path: string;
  sources: ChangeSource[];
};

export type RepairGap = {
  type: "record_gap";
  task_id: string;
  field: Exclude<RepairPathField, "sources">;
  path: string;
  reason: "deleted" | "missing";
  message: string;
  removes_link: boolean;
};

export type RepairWarning = {
  code: string;
  message: string;
  taskId?: string;
  path?: string;
};

export type DriftRepairReport = {
  ok: true;
  since: string;
  mode: RepairMode;
  applied: boolean;
  mechanical_fixes: RepairFix[];
  gaps: RepairGap[];
  warnings: RepairWarning[];
  touched_files: string[];
  task_ids: string[];
};

export type DriftRepairResult =
  | DriftRepairReport
  | {
      ok: false;
      errors: JsonCommandError[];
    };

type RepairActions = {
  fixes: RepairFix[];
  gaps: RepairGap[];
};

export async function planDriftRepair(root: string, since: string): Promise<DriftRepairResult> {
  const changed = await getChangedFiles(root, since);
  if (!changed.ok) {
    return changed;
  }

  let tasks: JumpTask[];
  try {
    tasks = (await readIndex(root)).tasks;
  } catch (error) {
    return {
      ok: false,
      errors: [
        commandError("INDEX_UNAVAILABLE", `Could not read Jumpspace index: ${error instanceof Error ? error.message : String(error)}`),
      ],
    };
  }

  const actions = collectRepairActions(tasks, changed.files);
  const missingGapActions = await missingLinkedFileGapActions(root, tasks, actions.fixes, actions.gaps);
  actions.gaps.push(...missingGapActions);

  const warnings = docRenameWarnings(tasks, changed.files);
  const uniqueRepairFixes = dedupeFixes(actions.fixes);
  const uniqueGaps = uniqueGapsByKey(actions.gaps);

  return {
    ok: true,
    since,
    mode: "dry-run",
    applied: false,
    mechanical_fixes: uniqueRepairFixes,
    gaps: uniqueGaps,
    warnings,
    touched_files: [],
    task_ids: unique([...uniqueRepairFixes.map((fix) => fix.task_id), ...uniqueGaps.map((gap) => gap.task_id)]),
  };
}

export async function applyDriftRepair(root: string, since: string): Promise<DriftRepairResult> {
  const planned = await planDriftRepair(root, since);
  if (!planned.ok) {
    return planned;
  }

  const index = await readIndex(root);
  const tasksById = new Map(index.tasks.map((task) => [task.id, task]));
  const grouped = groupActions(planned.mechanical_fixes, planned.gaps);
  const touchedFiles: string[] = [];

  for (const [taskId, actions] of grouped) {
    const task = tasksById.get(taskId);
    if (!task) {
      continue;
    }

    await updateTaskMetadata(root, task, (metadata) => applyActions(metadata, actions));
    touchedFiles.push(task.doc.path);
  }

  if (touchedFiles.length > 0) {
    await refreshIndex(root);
    const config = await loadConfig(root);
    await recordMutation(root, {
      command: "task repair",
      touched_files: [...touchedFiles, config.indexPath],
      task_ids: [...grouped.keys()],
      index_changed: true,
      warnings: planned.warnings.map(warningToMutationWarning),
    });
    touchedFiles.push(config.indexPath);
  }

  return {
    ...planned,
    mode: "apply",
    applied: true,
    touched_files: unique(touchedFiles),
    task_ids: unique([...grouped.keys()]),
  };
}

function collectRepairActions(tasks: JumpTask[], files: Array<{ path: string; old_path?: string; statuses: string[]; sources: ChangeSource[] }>): RepairActions {
  const actions: RepairActions = {
    fixes: [],
    gaps: [],
  };

  for (const file of files) {
    if (file.statuses.includes("renamed") && file.old_path) {
      for (const task of tasks) {
        if (task.code.includes(file.old_path)) {
          actions.fixes.push({
            type: "replace_linked_path",
            task_id: task.id,
            field: "code",
            old_path: file.old_path,
            new_path: file.path,
            sources: file.sources,
          });
        }
        if (task.tests.includes(file.old_path)) {
          actions.fixes.push({
            type: "replace_linked_path",
            task_id: task.id,
            field: "tests",
            old_path: file.old_path,
            new_path: file.path,
            sources: file.sources,
          });
        }
        if ((task.sources ?? []).some((source) => source.id === file.old_path || source.url === file.old_path)) {
          actions.fixes.push({
            type: "replace_linked_path",
            task_id: task.id,
            field: "sources",
            old_path: file.old_path,
            new_path: file.path,
            sources: file.sources,
          });
        }
      }
      continue;
    }

    if (file.statuses.includes("deleted")) {
      for (const task of tasks) {
        if (task.code.includes(file.path)) {
          actions.gaps.push(gapForPath(task.id, "code", file.path, "deleted"));
        }
        if (task.tests.includes(file.path)) {
          actions.gaps.push(gapForPath(task.id, "tests", file.path, "deleted"));
        }
      }
    }
  }

  return actions;
}

async function missingLinkedFileGapActions(root: string, tasks: JumpTask[], fixes: RepairFix[], existingGaps: RepairGap[]): Promise<RepairGap[]> {
  const audit = await auditJumpspace(root);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const gaps: RepairGap[] = [];

  for (const issue of audit.issues) {
    if (!isMissingLinkedFileIssue(issue) || !issue.taskId || !issue.path) {
      continue;
    }
    if (fixes.some((fix) => fix.task_id === issue.taskId && fix.old_path === issue.path)) {
      continue;
    }
    if (existingGaps.some((gap) => gap.task_id === issue.taskId && gap.path === issue.path)) {
      continue;
    }
    const task = tasksById.get(issue.taskId);
    if (!task) {
      continue;
    }
    const field = issue.code === "MISSING_CODE_FILE" ? "code" : "tests";
    if (!task[field].includes(issue.path)) {
      continue;
    }
    gaps.push(gapForPath(issue.taskId, field, issue.path, "missing"));
  }

  return gaps;
}

function docRenameWarnings(
  tasks: JumpTask[],
  files: Array<{ path: string; old_path?: string; statuses: string[] }>,
): RepairWarning[] {
  const warnings: RepairWarning[] = [];
  for (const file of files) {
    for (const task of tasks) {
      if (file.statuses.includes("renamed") && file.old_path && task.doc.path === file.old_path) {
        warnings.push({
          code: "TASK_SOURCE_DOC_RENAMED",
          taskId: task.id,
          path: file.old_path,
          message: `Task ${task.id} source document moved from "${file.old_path}" to "${file.path}". Run jumpspace task scan after the move and review config docs globs if needed.`,
        });
      }
      if (file.statuses.includes("deleted") && task.doc.path === file.path) {
        warnings.push({
          code: "TASK_SOURCE_DOC_DELETED",
          taskId: task.id,
          path: file.path,
          message: `Task ${task.id} source document "${file.path}" was deleted. Restore the document, supersede or retire the task, or recreate it from surviving evidence before refreshing the graph.`,
        });
      }
    }
  }
  return uniqueWarnings(warnings);
}

function applyActions(metadata: JumpTaskMetadata, actions: RepairActions): JumpTaskMetadata {
  const next: JumpTaskMetadata = {
    ...metadata,
    code: [...metadata.code],
    tests: [...metadata.tests],
    gaps: [...(metadata.gaps ?? [])],
    sources: metadata.sources ? metadata.sources.map((source) => ({ ...source })) : metadata.sources,
  };

  for (const fix of actions.fixes) {
    if (fix.field === "code") {
      next.code = unique(next.code.map((repoPath) => (repoPath === fix.old_path ? fix.new_path : repoPath)));
    } else if (fix.field === "tests") {
      next.tests = unique(next.tests.map((repoPath) => (repoPath === fix.old_path ? fix.new_path : repoPath)));
    } else if (next.sources) {
      next.sources = next.sources.map((source) => ({
        ...source,
        id: source.id === fix.old_path ? fix.new_path : source.id,
        url: source.url === fix.old_path ? fix.new_path : source.url,
      }));
    }
  }

  for (const gap of actions.gaps) {
    next[gap.field] = next[gap.field].filter((repoPath) => repoPath !== gap.path);
    next.gaps = unique([...next.gaps, gap.message]);
  }

  return next;
}

function gapForPath(taskId: string, field: "code" | "tests", repoPath: string, reason: "deleted" | "missing"): RepairGap {
  const label = field === "code" ? "code" : "test";
  const reasonText = reason === "deleted" ? "was deleted" : "is missing";
  return {
    type: "record_gap",
    task_id: taskId,
    field,
    path: repoPath,
    reason,
    message: `Linked ${label} file "${repoPath}" ${reasonText}; repair removed it from active links and preserved this gap for human review.`,
    removes_link: true,
  };
}

function groupActions(fixes: RepairFix[], gaps: RepairGap[]): Map<string, RepairActions> {
  const grouped = new Map<string, RepairActions>();
  for (const fix of fixes) {
    const group = grouped.get(fix.task_id) ?? { fixes: [], gaps: [] };
    group.fixes.push(fix);
    grouped.set(fix.task_id, group);
  }
  for (const gap of gaps) {
    const group = grouped.get(gap.task_id) ?? { fixes: [], gaps: [] };
    group.gaps.push(gap);
    grouped.set(gap.task_id, group);
  }
  return grouped;
}

function isMissingLinkedFileIssue(issue: JumpIssue): boolean {
  return issue.code === "MISSING_CODE_FILE" || issue.code === "MISSING_TEST_FILE";
}

function dedupeFixes(fixes: RepairFix[]): RepairFix[] {
  const seen = new Set<string>();
  return fixes.filter((fix) => {
    const key = [fix.task_id, fix.field, fix.old_path, fix.new_path].join("\0");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueGapsByKey(gaps: RepairGap[]): RepairGap[] {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    const key = [gap.task_id, gap.field, gap.path, gap.reason].join("\0");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueWarnings(warnings: RepairWarning[]): RepairWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = [warning.code, warning.taskId, warning.path, warning.message].join("\0");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function warningToMutationWarning(warning: RepairWarning): MutationWarning {
  return {
    code: warning.code,
    message: warning.message,
    taskId: warning.taskId,
    path: warning.path,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
