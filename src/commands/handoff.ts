import { auditJumpspace } from "./audit.js";
import { loadConfig, readIndex } from "../core/config.js";
import { createDoctorReport } from "../core/doctor.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { buildHandoffPacket, HANDOFF_HISTORY_LIMIT, renderHandoffPacket } from "../core/handoff.js";
import { readLastMutation, readMutationHistory } from "../core/mutations.js";

export type HandoffOptions = {
  root?: string;
  task?: string;
  limit?: string | number;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runHandoff(options: HandoffOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const limit = parseLimit(options.limit);

  if (limit instanceof Error) {
    const error = commandError("INVALID_LIMIT", limit.message);
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const [audit, config, lastMutation, index] = await Promise.all([auditJumpspace(root), loadConfig(root), readLastMutation(root), readIndex(root)]);

  if (options.task && !index.tasks.some((task) => task.id === options.task)) {
    const error = commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${options.task}". Run \`jumpspace task find <query>\` to locate it.`, {
      taskId: options.task,
    });
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const [history, doctor] = await Promise.all([
    readMutationHistory(root, { taskId: options.task, limit }),
    createDoctorReport(root, audit.issues, config, lastMutation),
  ]);

  const packet = buildHandoffPacket({
    index,
    auditIssues: audit.issues,
    doctor,
    mutationHistory: history,
    lastMutation,
    taskId: options.task,
    limit,
  });

  writeLine(options.json ? JSON.stringify(packet, null, 2) : renderHandoffPacket(packet));
  return packet.ok ? 0 : 1;
}

function parseLimit(value: string | number | undefined): number | Error {
  if (value === undefined) {
    return HANDOFF_HISTORY_LIMIT;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : new Error("Handoff limit must be a positive integer.");
  }
  if (!/^\d+$/.test(value)) {
    return new Error("Handoff limit must be a positive integer.");
  }
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : new Error("Handoff limit must be a positive integer.");
}
