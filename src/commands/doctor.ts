import { auditJumpspace } from "./audit.js";
import { loadConfig } from "../core/config.js";
import { createDoctorReport, renderDoctorReport } from "../core/doctor.js";
import { readLastMutation } from "../core/mutations.js";

export type DoctorOptions = {
  root?: string;
  since?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runDoctor(options: DoctorOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const [audit, config, lastMutation] = await Promise.all([
    auditJumpspace(root),
    loadConfig(root),
    readLastMutation(root),
  ]);
  const report = await createDoctorReport(root, audit.issues, config, lastMutation, { since: options.since });

  writeLine(options.json ? JSON.stringify(report, null, 2) : renderDoctorReport(report));
  return report.ok ? 0 : 1;
}
