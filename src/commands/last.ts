import { commandError, errorEnvelope } from "../core/errors.js";
import { readLastMutation, renderLastMutation } from "../core/mutations.js";

export type LastOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runLast(options: LastOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const summary = await readLastMutation(root);

  if (!summary) {
    const error = commandError("NO_LAST_MUTATION", "No Jumpspace mutation summary has been recorded yet.");
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  writeLine(options.json ? JSON.stringify({ ok: true, summary }, null, 2) : renderLastMutation(summary));
  return 0;
}
