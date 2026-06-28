import { commandError, errorEnvelope } from "../core/errors.js";
import { readMutationHistory, renderMutationHistory } from "../core/mutations.js";

export type HistoryOptions = {
  root?: string;
  json?: boolean;
  limit?: string | number;
  task?: string;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runHistory(options: HistoryOptions = {}): Promise<number> {
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

  const report = await readMutationHistory(root, {
    taskId: options.task,
    limit: limit ?? 20,
  });

  writeLine(options.json ? JSON.stringify({ ok: true, ...report }, null, 2) : renderMutationHistory(report));
  return 0;
}

function parseLimit(value: string | number | undefined): number | undefined | Error {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : new Error("History limit must be a positive integer.");
  }
  if (!/^\d+$/.test(value)) {
    return new Error("History limit must be a positive integer.");
  }
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : new Error("History limit must be a positive integer.");
}
