import { detectDrift, type DriftFact, type DriftWarning } from "../core/drift.js";
import { errorEnvelope } from "../core/errors.js";

export type DriftOptions = {
  root?: string;
  since: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runDrift(options: DriftOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const result = await detectDrift(root, options.since);

  if (!result.ok) {
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(result.errors), null, 2));
    } else {
      for (const error of result.errors) {
        errorLine(error.message);
      }
    }
    return 1;
  }

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderDrift(result.facts, result.warnings));
  return 0;
}

function renderDrift(facts: DriftFact[], warnings: DriftWarning[]): string {
  return [
    "# Jumpspace Drift",
    "",
    "## Facts",
    "",
    facts.length ? facts.map((fact) => `- ${fact.code}${fact.taskId ? ` ${fact.taskId}` : ""}: ${fact.message}`).join("\n") : "- None",
    "",
    "## Warnings",
    "",
    warnings.length
      ? warnings.map((warning) => `- ${warning.code}${warning.taskId ? ` ${warning.taskId}` : ""}: ${warning.message}`).join("\n")
      : "- None",
  ].join("\n");
}
