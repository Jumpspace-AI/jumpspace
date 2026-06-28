import { execFile } from "node:child_process";
import fsSync from "node:fs";
import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { schemaCatalog } from "./schemas.js";

const execFileAsync = promisify(execFile);

export type InstallDoctorWarning = {
  code: string;
  message: string;
  path?: string;
  expected?: string;
  actual?: string;
  command?: string;
};

export type InstallDoctorBinary = {
  label: "invoked" | "path";
  path: string | null;
  realpath: string | null;
  exists: boolean;
  mode: string | null;
  executable: boolean | null;
  package_root: string | null;
  package_name: string | null;
  package_version: string | null;
  cli_version: string | null;
  schema_count: number | null;
  schema_contract_version: number | null;
  probe_errors: string[];
};

export type InstallDoctorReport = {
  ok: boolean;
  checked_at: string;
  status: "current" | "attention" | "blocked";
  summary: {
    blockers: number;
    warnings: number;
    repair_commands: number;
  };
  invocation: {
    argv1: string | null;
    exec_path: string;
    cwd: string;
  };
  binaries: {
    invoked: InstallDoctorBinary;
    path: InstallDoctorBinary;
  };
  workspace: {
    root: string;
    is_jumpspace_checkout: boolean;
    package_name: string | null;
    package_version: string | null;
    dist_cli_path: string;
    dist_cli_realpath: string | null;
    dist_cli_exists: boolean;
    dist_cli_executable: boolean | null;
    schema_count: number;
  };
  comparisons: {
    invoked_matches_workspace_dist: boolean | null;
    path_matches_workspace_dist: boolean | null;
    invoked_matches_path_binary: boolean | null;
    invoked_cli_version_matches_workspace: boolean | null;
    path_cli_version_matches_workspace: boolean | null;
    invoked_schema_count_matches_workspace: boolean | null;
    path_schema_count_matches_workspace: boolean | null;
  };
  warnings: InstallDoctorWarning[];
  blockers: InstallDoctorWarning[];
  repair_commands: string[];
};

export type InstallDoctorOptions = {
  checkedAt?: string;
  argv1?: string;
  execPath?: string;
  env?: NodeJS.ProcessEnv;
  execFile?: ExecFileLike;
};

export type ExecFileLike = (
  file: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number; maxBuffer?: number },
) => Promise<{ stdout: string; stderr: string }>;

type PackageInfo = {
  root: string;
  name: string | null;
  version: string | null;
};

const BINARY_NOT_FOUND: InstallDoctorBinary = {
  label: "path",
  path: null,
  realpath: null,
  exists: false,
  mode: null,
  executable: null,
  package_root: null,
  package_name: null,
  package_version: null,
  cli_version: null,
  schema_count: null,
  schema_contract_version: null,
  probe_errors: [],
};

export async function createInstallDoctorReport(root: string, options: InstallDoctorOptions = {}): Promise<InstallDoctorReport> {
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const exec = options.execFile ?? defaultExecFile;
  const env = options.env ?? process.env;
  const execPath = options.execPath ?? process.execPath;
  const argv1 = options.argv1 ?? process.argv[1] ?? null;
  const workspace = await inspectWorkspace(root);
  const invokedPath = argv1 ? path.resolve(root, argv1) : null;
  const pathBinary = findOnPath("jumpspace", env);
  const invoked = await inspectBinary("invoked", invokedPath, root, exec, env, execPath);
  const pathResolved = pathBinary ? path.resolve(pathBinary) : null;
  const pathInspection = pathResolved ? await inspectBinary("path", pathResolved, root, exec, env, execPath) : BINARY_NOT_FOUND;
  const comparisons = compareInstall(workspace, invoked, pathInspection);
  const warnings = installWarnings(workspace, invoked, pathInspection, comparisons);
  const blockers = installBlockers(invoked);
  const repairCommands = unique(
    [...warnings, ...blockers]
      .map((warning) => warning.command)
      .filter((command): command is string => Boolean(command)),
  );

  return {
    ok: blockers.length === 0,
    checked_at: checkedAt,
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "attention" : "current",
    summary: {
      blockers: blockers.length,
      warnings: warnings.length,
      repair_commands: repairCommands.length,
    },
    invocation: {
      argv1,
      exec_path: execPath,
      cwd: root,
    },
    binaries: {
      invoked,
      path: pathInspection,
    },
    workspace,
    comparisons,
    warnings,
    blockers,
    repair_commands: repairCommands,
  };
}

export function renderInstallDoctorReport(report: InstallDoctorReport): string {
  return [
    "# Jumpspace Install Doctor",
    "",
    `Install freshness: ${report.status}`,
    `Invoked binary: ${renderBinarySummary(report.binaries.invoked)}`,
    `PATH binary: ${renderBinarySummary(report.binaries.path)}`,
    `Workspace: ${report.workspace.is_jumpspace_checkout ? `${report.workspace.package_name}@${report.workspace.package_version}` : "not a Jumpspace checkout"}`,
    "",
    "## Warnings",
    renderWarnings(report.warnings),
    "",
    "## Blockers",
    renderWarnings(report.blockers),
    "",
    "## Repair Commands",
    report.repair_commands.length > 0 ? report.repair_commands.map((command) => `- ${command}`).join("\n") : "None",
    "",
    "## Evidence",
    `Invoked version: ${report.binaries.invoked.cli_version ?? "unknown"}`,
    `Invoked schema count: ${report.binaries.invoked.schema_count ?? "unknown"}`,
    `PATH version: ${report.binaries.path.cli_version ?? "unknown"}`,
    `PATH schema count: ${report.binaries.path.schema_count ?? "unknown"}`,
    `Workspace schema count: ${report.workspace.schema_count}`,
  ].join("\n");
}

async function inspectWorkspace(root: string): Promise<InstallDoctorReport["workspace"]> {
  const packageJson = await readPackageJsonAt(path.join(root, "package.json"));
  const distCliPath = path.join(root, "dist", "cli.js");
  const distStat = await statFile(distCliPath);
  const distRealpath = distStat ? await realpathOrNull(distCliPath) : null;
  return {
    root,
    is_jumpspace_checkout: packageJson?.name === "jumpspace",
    package_name: packageJson?.name ?? null,
    package_version: packageJson?.version ?? null,
    dist_cli_path: distCliPath,
    dist_cli_realpath: distRealpath,
    dist_cli_exists: Boolean(distStat),
    dist_cli_executable: distStat ? isExecutable(distStat.mode) : null,
    schema_count: schemaCatalog.length,
  };
}

async function inspectBinary(
  label: "invoked" | "path",
  binaryPath: string | null,
  root: string,
  exec: ExecFileLike,
  env: NodeJS.ProcessEnv,
  execPath: string,
): Promise<InstallDoctorBinary> {
  if (!binaryPath) {
    return { ...BINARY_NOT_FOUND, label };
  }

  const stat = await statFile(binaryPath);
  const realpath = stat ? await realpathOrNull(binaryPath) : null;
  const packageInfo = realpath ? await findPackageInfo(path.dirname(realpath)) : null;
  const probeErrors: string[] = [];
  const cliVersion = stat ? await probeVersion(binaryPath, stat.mode, root, exec, env, execPath, probeErrors) : null;
  const schemaProbe = stat ? await probeSchemas(binaryPath, stat.mode, root, exec, env, execPath, probeErrors) : null;

  return {
    label,
    path: binaryPath,
    realpath,
    exists: Boolean(stat),
    mode: stat ? modeString(stat.mode) : null,
    executable: stat ? isExecutable(stat.mode) : null,
    package_root: packageInfo?.root ?? null,
    package_name: packageInfo?.name ?? null,
    package_version: packageInfo?.version ?? null,
    cli_version: cliVersion,
    schema_count: schemaProbe?.count ?? null,
    schema_contract_version: schemaProbe?.contractVersion ?? null,
    probe_errors: probeErrors,
  };
}

function compareInstall(
  workspace: InstallDoctorReport["workspace"],
  invoked: InstallDoctorBinary,
  pathBinary: InstallDoctorBinary,
): InstallDoctorReport["comparisons"] {
  const hasWorkspace = workspace.is_jumpspace_checkout;
  return {
    invoked_matches_workspace_dist: hasWorkspace ? samePath(invoked.realpath, workspace.dist_cli_realpath) : null,
    path_matches_workspace_dist: hasWorkspace ? samePath(pathBinary.realpath, workspace.dist_cli_realpath) : null,
    invoked_matches_path_binary: invoked.realpath && pathBinary.realpath ? samePath(invoked.realpath, pathBinary.realpath) : null,
    invoked_cli_version_matches_workspace: hasWorkspace ? compareNullable(invoked.cli_version, workspace.package_version) : null,
    path_cli_version_matches_workspace: hasWorkspace ? compareNullable(pathBinary.cli_version, workspace.package_version) : null,
    invoked_schema_count_matches_workspace: hasWorkspace ? compareNullable(invoked.schema_count, workspace.schema_count) : null,
    path_schema_count_matches_workspace: hasWorkspace ? compareNullable(pathBinary.schema_count, workspace.schema_count) : null,
  };
}

function installWarnings(
  workspace: InstallDoctorReport["workspace"],
  invoked: InstallDoctorBinary,
  pathBinary: InstallDoctorBinary,
  comparisons: InstallDoctorReport["comparisons"],
): InstallDoctorWarning[] {
  const warnings: InstallDoctorWarning[] = [];

  if (!pathBinary.exists) {
    warnings.push({
      code: "PATH_BINARY_NOT_FOUND",
      message: "No `jumpspace` executable was found on PATH. A shell may not run the repo-local build by default.",
      command: "npm link",
    });
  }

  if (comparisons.invoked_matches_path_binary === false) {
    warnings.push({
      code: "PATH_BINARY_DIFFERS_FROM_INVOKED",
      path: pathBinary.path ?? undefined,
      actual: pathBinary.realpath ?? undefined,
      expected: invoked.realpath ?? undefined,
      message: "The `jumpspace` found on PATH differs from the binary used for this command.",
      command: "hash -r",
    });
  }

  if (workspace.is_jumpspace_checkout) {
    if (!workspace.dist_cli_exists) {
      warnings.push({
        code: "WORKSPACE_DIST_CLI_MISSING",
        path: workspace.dist_cli_path,
        message: "The current Jumpspace checkout does not have dist/cli.js built.",
        command: "npm run build",
      });
    } else if (!workspace.dist_cli_executable) {
      warnings.push({
        code: "WORKSPACE_DIST_CLI_NOT_EXECUTABLE",
        path: workspace.dist_cli_path,
        message: "The current Jumpspace checkout has a non-executable dist/cli.js.",
        command: "npm run build",
      });
    }

    if (comparisons.invoked_matches_workspace_dist === false) {
      warnings.push({
        code: "INVOKED_BINARY_NOT_WORKSPACE_DIST",
        path: invoked.path ?? undefined,
        actual: invoked.realpath ?? undefined,
        expected: workspace.dist_cli_realpath ?? workspace.dist_cli_path,
        message: "This command was not run through the current checkout's dist/cli.js.",
        command: "npm link",
      });
    }

    if (comparisons.path_matches_workspace_dist === false) {
      warnings.push({
        code: "PATH_BINARY_NOT_WORKSPACE_DIST",
        path: pathBinary.path ?? undefined,
        actual: pathBinary.realpath ?? undefined,
        expected: workspace.dist_cli_realpath ?? workspace.dist_cli_path,
        message: "The `jumpspace` on PATH does not resolve to the current checkout's dist/cli.js.",
        command: "npm link",
      });
    }

    if (comparisons.invoked_cli_version_matches_workspace === false) {
      warnings.push({
        code: "INVOKED_CLI_VERSION_MISMATCH",
        path: invoked.path ?? undefined,
        actual: invoked.cli_version ?? "unknown",
        expected: workspace.package_version ?? undefined,
        message: "The invoked CLI version does not match the current workspace package version.",
        command: "npm run build",
      });
    }

    if (comparisons.path_cli_version_matches_workspace === false) {
      warnings.push({
        code: "PATH_CLI_VERSION_MISMATCH",
        path: pathBinary.path ?? undefined,
        actual: pathBinary.cli_version ?? "unknown",
        expected: workspace.package_version ?? undefined,
        message: "The `jumpspace` on PATH reports a different version than the current workspace.",
        command: "npm link",
      });
    }

    if (comparisons.invoked_schema_count_matches_workspace === false || comparisons.path_schema_count_matches_workspace === false) {
      warnings.push({
        code: "SCHEMA_COUNT_MISMATCH",
        actual: String(pathBinary.schema_count ?? invoked.schema_count ?? "unknown"),
        expected: String(workspace.schema_count),
        message: "A probed Jumpspace binary exposes a schema count that differs from the current workspace catalog.",
        command: "npm run generate:schemas",
      });
    }
  }

  for (const binary of [invoked, pathBinary]) {
    if (binary.exists && binary.executable === false) {
      warnings.push({
        code: `${binary.label.toUpperCase()}_BINARY_NOT_EXECUTABLE`,
        path: binary.path ?? undefined,
        actual: binary.mode ?? undefined,
        expected: "executable mode",
        message: `${binary.label} Jumpspace binary is not executable.`,
        command: "npm run build",
      });
    }
    if (binary.exists && !binary.package_root) {
      warnings.push({
        code: `${binary.label.toUpperCase()}_PACKAGE_ROOT_NOT_FOUND`,
        path: binary.realpath ?? binary.path ?? undefined,
        message: `${binary.label} Jumpspace binary is not inside a package root with package.json.`,
      });
    }
    for (const error of binary.probe_errors) {
      warnings.push({
        code: `${binary.label.toUpperCase()}_PROBE_FAILED`,
        path: binary.path ?? undefined,
        message: error,
      });
    }
  }

  return dedupeWarnings(warnings);
}

function installBlockers(invoked: InstallDoctorBinary): InstallDoctorWarning[] {
  if (!invoked.exists) {
    return [
      {
        code: "INVOKED_BINARY_MISSING",
        path: invoked.path ?? undefined,
        message: "The invoked Jumpspace binary path does not exist.",
      },
    ];
  }
  return [];
}

async function probeVersion(
  binaryPath: string,
  mode: number,
  root: string,
  exec: ExecFileLike,
  env: NodeJS.ProcessEnv,
  execPath: string,
  probeErrors: string[],
): Promise<string | null> {
  const result = await runCliProbe(binaryPath, mode, ["--version"], root, exec, env, execPath);
  if (!result.ok) {
    probeErrors.push(`Version probe failed: ${result.error}`);
    return null;
  }
  return result.stdout.trim() || null;
}

async function probeSchemas(
  binaryPath: string,
  mode: number,
  root: string,
  exec: ExecFileLike,
  env: NodeJS.ProcessEnv,
  execPath: string,
  probeErrors: string[],
): Promise<{ count: number; contractVersion: number | null } | null> {
  const result = await runCliProbe(binaryPath, mode, ["schema", "list", "--json"], root, exec, env, execPath);
  if (!result.ok) {
    probeErrors.push(`Schema probe failed: ${result.error}`);
    return null;
  }
  try {
    const parsed = JSON.parse(result.stdout) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.schemas)) {
      probeErrors.push("Schema probe returned JSON without a schemas array.");
      return null;
    }
    return {
      count: parsed.schemas.length,
      contractVersion: typeof parsed.contract_version === "number" ? parsed.contract_version : null,
    };
  } catch (error) {
    probeErrors.push(`Schema probe returned invalid JSON: ${String(error)}`);
    return null;
  }
}

async function runCliProbe(
  binaryPath: string,
  mode: number,
  args: string[],
  root: string,
  exec: ExecFileLike,
  env: NodeJS.ProcessEnv,
  execPath: string,
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  const executable = isExecutable(mode);
  const file = executable ? binaryPath : execPath;
  const finalArgs = executable ? args : [binaryPath, ...args];
  try {
    const result = await exec(file, finalArgs, {
      cwd: root,
      env,
      timeout: 10_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout };
  } catch (error) {
    const candidate = error as { message?: unknown; stderr?: unknown };
    const stderr = typeof candidate.stderr === "string" && candidate.stderr.trim().length > 0 ? ` ${candidate.stderr.trim()}` : "";
    return {
      ok: false,
      error: `${typeof candidate.message === "string" ? candidate.message : String(error)}${stderr}`,
    };
  }
}

function findOnPath(command: string, env: NodeJS.ProcessEnv): string | null {
  const pathValue = env.PATH ?? "";
  const extensions = process.platform === "win32" ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  for (const entry of pathValue.split(path.delimiter)) {
    if (!entry) {
      continue;
    }
    for (const extension of extensions) {
      const candidate = path.join(entry, `${command}${extension}`);
      try {
        fsSync.accessSync(candidate, fsSync.constants.F_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function findPackageInfo(startDir: string): Promise<PackageInfo | null> {
  let current = startDir;
  while (true) {
    const packageJson = await readPackageJsonAt(path.join(current, "package.json"));
    if (packageJson) {
      return {
        root: current,
        name: packageJson.name,
        version: packageJson.version,
      };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function readPackageJsonAt(filePath: string): Promise<{ name: string | null; version: string | null } | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    return {
      name: typeof parsed.name === "string" ? parsed.name : null,
      version: typeof parsed.version === "string" ? parsed.version : null,
    };
  } catch {
    return null;
  }
}

async function statFile(filePath: string): Promise<Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

async function realpathOrNull(filePath: string): Promise<string | null> {
  try {
    return await fs.realpath(filePath);
  } catch {
    return null;
  }
}

async function defaultExecFile(
  file: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number; maxBuffer?: number },
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(file, args, {
    cwd: options.cwd,
    env: options.env,
    timeout: options.timeout,
    maxBuffer: options.maxBuffer,
    encoding: "utf8",
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function renderBinarySummary(binary: InstallDoctorBinary): string {
  if (!binary.path) {
    return "not found";
  }
  const version = binary.cli_version ? ` version ${binary.cli_version}` : "";
  const realpath = binary.realpath && binary.realpath !== binary.path ? ` -> ${binary.realpath}` : "";
  return `${binary.path}${realpath}${version}`;
}

function renderWarnings(warnings: InstallDoctorWarning[]): string {
  if (warnings.length === 0) {
    return "None";
  }
  return warnings.map((warning) => `- ${warning.code}: ${warning.message}`).join("\n");
}

function dedupeWarnings(warnings: InstallDoctorWarning[]): InstallDoctorWarning[] {
  const seen = new Set<string>();
  const result: InstallDoctorWarning[] = [];
  for (const warning of warnings) {
    const key = `${warning.code}\0${warning.path ?? ""}\0${warning.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(warning);
  }
  return result;
}

function compareNullable<T>(actual: T | null, expected: T | null): boolean | null {
  if (actual === null || expected === null) {
    return null;
  }
  return actual === expected;
}

function samePath(a: string | null, b: string | null): boolean | null {
  if (!a || !b) {
    return null;
  }
  return path.normalize(a) === path.normalize(b);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function modeString(mode: number): string {
  return `0${(mode & 0o777).toString(8)}`;
}

function isExecutable(mode: number): boolean {
  return (mode & 0o111) !== 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
