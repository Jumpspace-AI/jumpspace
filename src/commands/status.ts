import { loadConfig, readIndex } from "../core/config.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { refreshIndex } from "../core/refreshIndex.js";
import { updateTaskMetadata } from "../core/metadata.js";
import { recordMutation } from "../core/mutations.js";
import { JUMP_TASK_STATUSES, type JumpTaskStatus } from "../core/types.js";

export type StatusOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runStatus(id: string, status: string, options: StatusOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    return writeError(
      options,
      commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`, {
        taskId: id,
      }),
    );
  }

  if (!JUMP_TASK_STATUSES.includes(status as JumpTaskStatus)) {
    return writeError(
      options,
      commandError("INVALID_STATUS", `Invalid task status "${status}". Expected one of: ${JUMP_TASK_STATUSES.join(", ")}.`, {
        taskId: id,
      }),
    );
  }

  if (status === "verified") {
    return writeError(
      options,
      commandError("PROTECTED_VERIFIED_STATUS", "Use `jumpspace verify` to earn verified status.", { taskId: id }),
    );
  }

  await updateTaskMetadata(root, task, (metadata) => ({
    ...metadata,
    status: status as JumpTaskStatus,
  }));
  await refreshIndex(root);
  const config = await loadConfig(root);
  await recordMutation(root, {
    command: "status",
    touched_files: [task.doc.path, config.indexPath],
    task_ids: [id],
    index_changed: true,
  });

  writeLine(options.json ? JSON.stringify({ ok: true, task_id: id, status }, null, 2) : `Updated ${id} status to ${status}.`);
  return 0;
}

function writeError(options: StatusOptions, error: ReturnType<typeof commandError>): number {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  if (options.json) {
    writeLine(JSON.stringify(errorEnvelope(error), null, 2));
  } else {
    errorLine(error.message);
  }
  return 1;
}
