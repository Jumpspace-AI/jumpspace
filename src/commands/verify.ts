import { loadConfig, readIndex } from "../core/config.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { updateTaskMetadata } from "../core/metadata.js";
import { recordMutation } from "../core/mutations.js";
import { refreshIndex } from "../core/refreshIndex.js";
import { verifyTask } from "../core/verification.js";

export type VerifyOptions = {
  root?: string;
  check?: string[];
  criteria?: string[];
  evidence?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runVerify(id: string, options: VerifyOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);

  if (!task) {
    return writeErrors(options, [
      commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`, {
        taskId: id,
      }),
    ]);
  }

  const result = await verifyTask(task, {
    root,
    checks: options.check ?? [],
    criteria: options.criteria ?? [],
    evidence: options.evidence,
  });

  if (!result.ok) {
    if (options.json) {
      writeLine(JSON.stringify({ ...errorEnvelope(result.errors), checks: result.checks ?? [] }, null, 2));
    } else {
      for (const error of result.errors) {
        errorLine(error.message);
      }
      for (const check of result.checks ?? []) {
        errorLine(`${check.exit_code === 0 ? "passed" : "failed"} ${check.command} (${check.exit_code})`);
      }
    }
    return 1;
  }

  await updateTaskMetadata(root, task, (metadata) => ({
    ...metadata,
    status: "verified",
    verification_records: [...(metadata.verification_records ?? []), result.record],
  }));
  await refreshIndex(root);
  const config = await loadConfig(root);
  await recordMutation(root, {
    command: "verify",
    touched_files: [task.doc.path, config.indexPath],
    task_ids: [id],
    index_changed: true,
  });

  writeLine(
    options.json
      ? JSON.stringify({ ok: true, task_id: id, status: "verified", record: result.record }, null, 2)
      : `Verified ${id} with ${result.record.checks.length} check(s).`,
  );
  return 0;
}

function writeErrors(options: VerifyOptions, errors: ReturnType<typeof commandError>[]): number {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  if (options.json) {
    writeLine(JSON.stringify(errorEnvelope(errors), null, 2));
  } else {
    for (const error of errors) {
      errorLine(error.message);
    }
  }
  return 1;
}
