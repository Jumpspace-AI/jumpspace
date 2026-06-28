import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { commandError, type JsonCommandError } from "./errors.js";
import type { JumpTask, JumpVerificationCheck, JumpVerificationRecord } from "./types.js";

const execFileAsync = promisify(execFile);

export type VerifyTaskOptions = {
  root: string;
  checks: string[];
  criteria: string[];
  evidence?: string;
  now?: Date;
};

export type VerifyTaskResult =
  | {
      ok: true;
      record: JumpVerificationRecord;
    }
  | {
      ok: false;
      errors: JsonCommandError[];
      checks?: JumpVerificationCheck[];
    };

export async function verifyTask(task: JumpTask, options: VerifyTaskOptions): Promise<VerifyTaskResult> {
  const checks = options.checks.map((check) => check.trim()).filter(Boolean);
  const criteria = unique(options.criteria.flatMap((criterion) => criterion.split(",")).map((criterion) => criterion.trim()).filter(Boolean));

  if (checks.length === 0) {
    return {
      ok: false,
      errors: [commandError("MISSING_CHECK", "Verification requires at least one --check command.", { taskId: task.id })],
    };
  }

  if (criteria.length === 0) {
    return {
      ok: false,
      errors: [commandError("MISSING_CRITERIA", "Verification requires at least one --criteria ID.", { taskId: task.id })],
    };
  }

  const knownCriteria = new Set((task.acceptance_criteria ?? []).map((criterion) => criterion.id));
  const unknownCriteria = criteria.filter((criterion) => !knownCriteria.has(criterion));
  if (unknownCriteria.length > 0) {
    return {
      ok: false,
      errors: unknownCriteria.map((criterion) =>
        commandError("UNKNOWN_ACCEPTANCE_CRITERION", `Task ${task.id} has no acceptance criterion "${criterion}".`, {
          taskId: task.id,
        }),
      ),
    };
  }

  const commit = await getCurrentCommit(options.root);
  if (!commit.ok) {
    return commit;
  }

  const checkResults: JumpVerificationCheck[] = [];
  for (const command of checks) {
    checkResults.push({
      command,
      exit_code: await runCheck(command, options.root),
    });
  }

  const failed = checkResults.filter((check) => check.exit_code !== 0);
  if (failed.length > 0) {
    return {
      ok: false,
      checks: checkResults,
      errors: failed.map((check) =>
        commandError("CHECK_FAILED", `Verification check failed with exit code ${check.exit_code}: ${check.command}`, {
          taskId: task.id,
        }),
      ),
    };
  }

  const verifiedAt = (options.now ?? new Date()).toISOString();
  const evidence = options.evidence?.trim();
  return {
    ok: true,
    record: {
      id: `verify-${verifiedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`,
      verified_at: verifiedAt,
      commit: commit.commit,
      checks: checkResults,
      acceptance_criteria_covered: criteria,
      evidence: evidence ? [evidence] : [],
    },
  };
}

async function getCurrentCommit(root: string): Promise<{ ok: true; commit: string } | { ok: false; errors: JsonCommandError[] }> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root });
    return {
      ok: true,
      commit: stdout.trim(),
    };
  } catch {
    return {
      ok: false,
      errors: [
        commandError("GIT_COMMIT_UNAVAILABLE", "Could not read current Git commit with `git rev-parse HEAD`.", {
          path: root,
        }),
      ],
    };
  }
}

function runCheck(command: string, cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: "ignore",
    });
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
