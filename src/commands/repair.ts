import { errorEnvelope } from "../core/errors.js";
import { applyDriftRepair, planDriftRepair, type DriftRepairReport, type RepairFix, type RepairGap, type RepairWarning } from "../core/repair.js";

export type RepairOptions = {
  root?: string;
  since: string;
  apply?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runRepair(options: RepairOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const result = options.apply ? await applyDriftRepair(root, options.since) : await planDriftRepair(root, options.since);

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

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderRepairReport(result));
  return 0;
}

export function renderRepairReport(report: DriftRepairReport): string {
  return [
    "# Jumpspace Repair",
    "",
    `Since: ${report.since}`,
    `Mode: ${report.mode}`,
    `Applied: ${report.applied ? "yes" : "no"}`,
    "",
    "## Mechanical Fixes",
    renderFixes(report.mechanical_fixes),
    "",
    "## Gaps",
    renderGaps(report.gaps),
    "",
    "## Warnings",
    renderWarnings(report.warnings),
    "",
    "## Touched Files",
    renderList(report.touched_files),
  ].join("\n");
}

function renderFixes(fixes: RepairFix[]): string {
  if (fixes.length === 0) {
    return "- None";
  }
  return fixes.map((fix) => `- ${fix.task_id} ${fix.field}: ${fix.old_path} -> ${fix.new_path} [${fix.sources.join(",")}]`).join("\n");
}

function renderGaps(gaps: RepairGap[]): string {
  if (gaps.length === 0) {
    return "- None";
  }
  return gaps.map((gap) => `- ${gap.task_id} ${gap.field}: ${gap.message}`).join("\n");
}

function renderWarnings(warnings: RepairWarning[]): string {
  if (warnings.length === 0) {
    return "- None";
  }
  return warnings.map((warning) => `- ${warning.code}${warning.taskId ? ` ${warning.taskId}` : ""}: ${warning.message}`).join("\n");
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}
