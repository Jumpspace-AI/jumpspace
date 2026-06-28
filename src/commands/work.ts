import { auditJumpspace } from "./audit.js";
import { detectDrift } from "../core/drift.js";
import { errorEnvelope, issuesToCommandErrors, type JsonCommandError } from "../core/errors.js";
import { readIndex } from "../core/config.js";
import { readMutationHistory } from "../core/mutations.js";
import { buildWorkPacket, renderWorkPacket, WORK_PACKET_HISTORY_LIMIT, type WorkPacketDrift } from "../core/workPacket.js";

export type WorkOptions = {
  root?: string;
  since?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runWork(id: string, options: WorkOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;

  const audit = await auditJumpspace(root);
  const auditErrors = audit.issues.filter((issue) => issue.severity === "error");
  if (auditErrors.length > 0) {
    return writeErrors(issuesToCommandErrors(auditErrors), { json: options.json, writeLine, errorLine });
  }

  let drift: WorkPacketDrift | undefined;
  if (options.since) {
    const driftResult = await detectDrift(root, options.since);
    if (!driftResult.ok) {
      return writeErrors(driftResult.errors, { json: options.json, writeLine, errorLine });
    }
    drift = {
      requested: true,
      since: driftResult.since,
      facts: driftResult.facts,
      warnings: driftResult.warnings,
    };
  }

  const index = await readIndex(root);
  const mutationHistory = await readMutationHistory(root, { taskId: id, limit: WORK_PACKET_HISTORY_LIMIT });
  const packet = buildWorkPacket(index, id, { drift, mutationHistory });
  if (!packet.ok) {
    return writeErrors(packet.errors, { json: options.json, writeLine, errorLine });
  }

  writeLine(options.json ? JSON.stringify(packet, null, 2) : renderWorkPacket(packet));
  return 0;
}

function writeErrors(
  errors: JsonCommandError[],
  options: {
    json?: boolean;
    writeLine: (line: string) => void;
    errorLine: (line: string) => void;
  },
): number {
  if (options.json) {
    options.writeLine(JSON.stringify(errorEnvelope(errors), null, 2));
  } else {
    for (const error of errors) {
      options.errorLine(error.message);
    }
  }
  return 1;
}
