import { createInstallDoctorReport, renderInstallDoctorReport } from "../core/installDoctor.js";
import { createReleaseDoctorReport, renderReleaseDoctorReport } from "../core/releaseDoctor.js";

export type ReleaseDoctorOptions = {
  root?: string;
  checkRegistry?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runReleaseDoctor(options: ReleaseDoctorOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const report = await createReleaseDoctorReport(root, {
    checkRegistry: options.checkRegistry,
  });

  writeLine(options.json ? JSON.stringify(report, null, 2) : renderReleaseDoctorReport(report));
  return report.ok ? 0 : 1;
}

export type ReleaseInstallDoctorOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runReleaseInstallDoctor(options: ReleaseInstallDoctorOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const report = await createInstallDoctorReport(root);

  writeLine(options.json ? JSON.stringify(report, null, 2) : renderInstallDoctorReport(report));
  return report.ok ? 0 : 1;
}
