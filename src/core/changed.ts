import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { commandError, type JsonCommandError } from "./errors.js";

const execFileAsync = promisify(execFile);

export type ChangeSource = "committed" | "staged" | "unstaged" | "untracked";

export type ChangedFile = {
  path: string;
  old_path?: string;
  statuses: string[];
  sources: ChangeSource[];
};

export type ChangedFilesResult =
  | {
      ok: true;
      since: string;
      files: ChangedFile[];
    }
  | {
      ok: false;
      errors: JsonCommandError[];
    };

type ParsedChange = {
  path: string;
  old_path?: string;
  status: string;
};

export async function getChangedFiles(root: string, since: string): Promise<ChangedFilesResult> {
  if (!(await isGitRepo(root))) {
    return {
      ok: false,
      errors: [commandError("NOT_GIT_REPOSITORY", "`changed --since` requires a Git repository.", { path: root })],
    };
  }

  const commands: Array<{ source: ChangeSource; args: string[]; parser: (stdout: string) => ParsedChange[] }> = [
    {
      source: "committed",
      args: ["diff", "--name-status", "--find-renames", `${since}...HEAD`],
      parser: parseNameStatus,
    },
    {
      source: "staged",
      args: ["diff", "--cached", "--name-status", "--find-renames"],
      parser: parseNameStatus,
    },
    {
      source: "unstaged",
      args: ["diff", "--name-status", "--find-renames"],
      parser: parseNameStatus,
    },
    {
      source: "untracked",
      args: ["ls-files", "--others", "--exclude-standard"],
      parser: parseUntracked,
    },
  ];

  const merged = new Map<string, ChangedFile>();
  for (const command of commands) {
    const result = await runGit(root, command.args);
    if (!result.ok) {
      return result;
    }
    for (const change of command.parser(result.stdout)) {
      mergeChange(merged, change, command.source);
    }
  }

  return {
    ok: true,
    since,
    files: [...merged.values()].sort((left, right) => left.path.localeCompare(right.path)),
  };
}

export function parseNameStatus(stdout: string): ParsedChange[] {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [rawStatus, firstPath, secondPath] = line.split("\t");
      const code = rawStatus[0];
      if (code === "R") {
        return {
          path: secondPath,
          old_path: firstPath,
          status: "renamed",
        };
      }
      if (code === "D") {
        return {
          path: firstPath,
          status: "deleted",
        };
      }
      if (code === "A") {
        return {
          path: firstPath,
          status: "added",
        };
      }
      if (code === "C") {
        return {
          path: secondPath,
          old_path: firstPath,
          status: "copied",
        };
      }
      return {
        path: firstPath,
        status: "modified",
      };
    });
}

function parseUntracked(stdout: string): ParsedChange[] {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((path) => ({
      path,
      status: "untracked",
    }));
}

function mergeChange(merged: Map<string, ChangedFile>, change: ParsedChange, source: ChangeSource): void {
  const existing = merged.get(change.path);
  if (!existing) {
    merged.set(change.path, {
      path: change.path,
      old_path: change.old_path,
      statuses: [change.status],
      sources: [source],
    });
    return;
  }

  if (change.old_path) {
    existing.old_path = change.old_path;
  }
  existing.statuses = unique([...existing.statuses, change.status]);
  existing.sources = unique([...existing.sources, source]);
}

async function isGitRepo(root: string): Promise<boolean> {
  const result = await runGit(root, ["rev-parse", "--is-inside-work-tree"]);
  return result.ok && result.stdout.trim() === "true";
}

async function runGit(
  root: string,
  args: string[],
): Promise<{ ok: true; stdout: string } | { ok: false; errors: JsonCommandError[] }> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root });
    return {
      ok: true,
      stdout,
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        commandError("GIT_COMMAND_FAILED", `git ${args.join(" ")} failed${error instanceof Error ? `: ${error.message}` : "."}`, {
          path: root,
        }),
      ],
    };
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
