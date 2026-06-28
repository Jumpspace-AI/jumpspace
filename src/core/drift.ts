import { auditJumpspace } from "../commands/audit.js";
import { readIndex } from "./config.js";
import { getChangedFiles, type ChangedFile } from "./changed.js";
import { commandError, type JsonCommandError } from "./errors.js";
import type { JumpTask } from "./types.js";

export type DriftFact = {
  code: string;
  message: string;
  taskId?: string;
  path?: string;
  sources?: string[];
};

export type DriftWarning = {
  code: string;
  message: string;
  taskId?: string;
  path?: string;
};

export type DriftResult =
  | {
      ok: true;
      since: string;
      changed: ChangedFile[];
      facts: DriftFact[];
      warnings: DriftWarning[];
    }
  | {
      ok: false;
      errors: JsonCommandError[];
    };

export async function detectDrift(root: string, since: string): Promise<DriftResult> {
  const changed = await getChangedFiles(root, since);
  if (!changed.ok) {
    return changed;
  }

  let index;
  try {
    index = await readIndex(root);
  } catch (error) {
    return {
      ok: false,
      errors: [
        commandError("INDEX_UNAVAILABLE", `Could not read Jumpspace index: ${error instanceof Error ? error.message : String(error)}`),
      ],
    };
  }

  const audit = await auditJumpspace(root);
  const facts: DriftFact[] = audit.issues
    .filter((issue) => issue.code === "STALE_INDEX" || issue.code === "MISSING_CODE_FILE" || issue.code === "MISSING_TEST_FILE")
    .map((issue) => ({
      code: issue.code,
      message: issue.message,
      taskId: issue.taskId,
      path: issue.path,
    }));
  const warnings: DriftWarning[] = [];

  for (const file of changed.files) {
    const mappings = mappingsForFile(index.tasks, file);
    if (mappings.length === 0) {
      facts.push({
        code: "UNMAPPED_CHANGED_FILE",
        message: `Changed file "${file.path}" is not linked to any Jumpspace task.`,
        path: file.path,
        sources: file.sources,
      });
      warnings.push({
        code: "MAPPING_MAY_NEED_UPDATING",
        message: `Consider linking "${file.path}" to a task if it is implementation-relevant.`,
        path: file.path,
      });
      continue;
    }

    for (const mapping of mappings) {
      facts.push({
        code: mapping.factCode,
        message: `${mapping.label} changed for ${mapping.task.id}: ${file.path}.`,
        taskId: mapping.task.id,
        path: file.path,
        sources: file.sources,
      });
      warnings.push(...recommendationsForMapping(mapping, file.path));
    }
  }

  return {
    ok: true,
    since,
    changed: changed.files,
    facts,
    warnings,
  };
}

type FileMapping = {
  task: JumpTask;
  factCode: "LINKED_CODE_CHANGED" | "LINKED_TEST_CHANGED" | "LINKED_DOC_CHANGED";
  label: string;
};

function mappingsForFile(tasks: JumpTask[], file: ChangedFile): FileMapping[] {
  const paths = new Set([file.path, file.old_path].filter((value): value is string => Boolean(value)));
  const mappings: FileMapping[] = [];

  for (const task of tasks) {
    if ([...paths].some((candidate) => task.code.includes(candidate))) {
      mappings.push({
        task,
        factCode: "LINKED_CODE_CHANGED",
        label: "Linked code",
      });
    }
    if ([...paths].some((candidate) => task.tests.includes(candidate))) {
      mappings.push({
        task,
        factCode: "LINKED_TEST_CHANGED",
        label: "Linked test",
      });
    }
    if (paths.has(task.doc.path)) {
      mappings.push({
        task,
        factCode: "LINKED_DOC_CHANGED",
        label: "Linked doc",
      });
    }
  }

  return mappings;
}

function recommendationsForMapping(mapping: FileMapping, path: string): DriftWarning[] {
  if (mapping.factCode === "LINKED_CODE_CHANGED") {
    return [
      {
        code: "DOCS_MAY_NEED_UPDATING",
        message: `Review ${mapping.task.id} docs because linked code changed.`,
        taskId: mapping.task.id,
        path,
      },
      {
        code: "TESTS_MAY_NEED_UPDATING",
        message: `Review ${mapping.task.id} tests because linked code changed.`,
        taskId: mapping.task.id,
        path,
      },
    ];
  }

  if (mapping.factCode === "LINKED_DOC_CHANGED") {
    return [
      {
        code: "IMPLEMENTATION_MAY_NEED_UPDATING",
        message: `Review ${mapping.task.id} implementation because linked docs changed.`,
        taskId: mapping.task.id,
        path,
      },
    ];
  }

  return [];
}
