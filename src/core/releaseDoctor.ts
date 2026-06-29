import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { schemaCatalog } from "./schemas.js";

const execFileAsync = promisify(execFile);

export type ReleaseDoctorIssue = {
  code: string;
  message: string;
  category: "local" | "external";
  path?: string;
  field?: string;
  expected?: string;
  actual?: string;
};

export type ReleaseDoctorCheck = {
  name: string;
  status: "pass" | "fail" | "warning";
  message: string;
  path?: string;
  expected?: string;
  actual?: string;
};

export type ReleaseDoctorReport = {
  ok: boolean;
  checked_at: string;
  status: "ready" | "blocked";
  summary: {
    local_blockers: number;
    local_warnings: number;
    external_warnings: number;
  };
  package: {
    name: string;
    version: string;
    license: string | null;
    repository: unknown;
    homepage: string | null;
    bugs: unknown;
    keywords: string[];
    metadata_checks: ReleaseDoctorCheck[];
    license_file: {
      path: string;
      exists: boolean;
    };
    bin: {
      name: string;
      target: string;
      path: string;
      exists: boolean;
      mode: string | null;
      executable: boolean;
    } | null;
  };
  package_dry_run: {
    ok: boolean;
    command: string;
    exit_code: number;
    stderr: string;
    error: string | null;
    filename: string | null;
    entry_count: number;
    files: Array<{ path: string; size?: number; mode?: number }>;
    required_files: ReleaseDoctorCheck[];
  };
  schemas: {
    expected: number;
    included: number;
    missing: string[];
  };
  registry: {
    package_name: string;
    status: "available" | "unavailable" | "unknown";
    check: "checked" | "not_requested" | "failed";
    checked: boolean;
    command: string | null;
    exit_code: number | null;
    version: string | null;
    reason: string | null;
  };
  local_blockers: ReleaseDoctorIssue[];
  local_warnings: ReleaseDoctorIssue[];
  external_warnings: ReleaseDoctorIssue[];
};

export type ReleaseDoctorOptions = {
  checkRegistry?: boolean;
  checkedAt?: string;
  execFile?: ExecFileLike;
};

export type ExecFileLike = (
  file: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeout?: number; maxBuffer?: number },
) => Promise<{ stdout: string; stderr: string }>;

const REQUIRED_PACKAGE_FILES = [
  "package.json",
  "README.md",
  "LICENSE",
  "NOTICE",
  "TRADEMARKS.md",
  "dist/cli.js",
  "dist/templates/AGENTS.md",
  "dist/templates/SKILL.md",
  "dist/sdk/contracts.js",
  "dist/sdk/contracts.d.ts",
  "sdk/python/jumpspace_sdk/contracts.py",
  "sdk/python/pyproject.toml",
] as const;

export async function createReleaseDoctorReport(root: string, options: ReleaseDoctorOptions = {}): Promise<ReleaseDoctorReport> {
  const exec = options.execFile ?? defaultExecFile;
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const packageJson = await readPackageJson(root);
  const localBlockers: ReleaseDoctorIssue[] = [];
  const localWarnings: ReleaseDoctorIssue[] = [];
  const externalWarnings: ReleaseDoctorIssue[] = [];

  const metadataChecks = packageMetadataChecks(packageJson);
  for (const check of metadataChecks) {
    if (check.status === "fail") {
      localBlockers.push(issueFromCheck("PACKAGE_METADATA_INVALID", check, "local"));
    }
  }

  const licenseFile = await fileExists(root, "LICENSE");
  if (!licenseFile) {
    localBlockers.push({
      code: "LICENSE_FILE_MISSING",
      category: "local",
      path: "LICENSE",
      message: "LICENSE file is missing.",
    });
  }

  const bin = await inspectBin(root, packageJson);
  if (!bin) {
    localBlockers.push({
      code: "PACKAGE_BIN_MISSING",
      category: "local",
      field: "bin",
      message: "package.json must define a bin entry for the CLI.",
    });
  } else {
    if (!bin.exists) {
      localBlockers.push({
        code: "BIN_TARGET_MISSING",
        category: "local",
        path: bin.target,
        message: `CLI bin target ${bin.target} is missing.`,
      });
    } else if (!bin.executable) {
      localBlockers.push({
        code: "BIN_NOT_EXECUTABLE",
        category: "local",
        path: bin.target,
        actual: bin.mode ?? undefined,
        expected: "executable mode",
        message: `CLI bin target ${bin.target} is not executable.`,
      });
    }
  }

  const dryRun = await inspectPackageDryRun(root, exec);
  for (const check of dryRun.required_files) {
    if (check.status === "fail") {
      localBlockers.push(issueFromCheck("PACKAGE_FILE_MISSING", check, "local"));
    }
  }
  if (!dryRun.ok) {
    localBlockers.push({
      code: "PACKAGE_DRY_RUN_FAILED",
      category: "local",
      message: `Package dry-run failed with exit code ${dryRun.exit_code}.`,
    });
  }

  const schemas = schemaInclusion(dryRun.files);
  for (const missing of schemas.missing) {
    localBlockers.push({
      code: "SCHEMA_ARTIFACT_MISSING_FROM_PACKAGE",
      category: "local",
      path: missing,
      message: `Generated schema artifact ${missing} is missing from the package dry-run.`,
    });
  }

  const registry = await inspectRegistry(root, packageJson.name, exec, Boolean(options.checkRegistry));
  if (registry.status === "unknown") {
    externalWarnings.push({
      code: registry.check === "not_requested" ? "REGISTRY_CHECK_NOT_REQUESTED" : "REGISTRY_CHECK_UNKNOWN",
      category: "external",
      message: registry.reason ?? "npm registry availability is unknown.",
    });
  } else if (registry.status === "unavailable") {
    externalWarnings.push({
      code: "REGISTRY_NAME_UNAVAILABLE",
      category: "external",
      message: `npm package name ${packageJson.name} already exists at version ${registry.version ?? "unknown"}.`,
    });
  }

  return {
    ok: localBlockers.length === 0,
    checked_at: checkedAt,
    status: localBlockers.length === 0 ? "ready" : "blocked",
    summary: {
      local_blockers: localBlockers.length,
      local_warnings: localWarnings.length,
      external_warnings: externalWarnings.length,
    },
    package: {
      name: packageJson.name,
      version: packageJson.version,
      license: stringValue(packageJson.license) ?? null,
      repository: packageJson.repository ?? null,
      homepage: stringValue(packageJson.homepage) ?? null,
      bugs: packageJson.bugs ?? null,
      keywords: stringArray(packageJson.keywords),
      metadata_checks: metadataChecks,
      license_file: {
        path: "LICENSE",
        exists: licenseFile,
      },
      bin,
    },
    package_dry_run: dryRun,
    schemas,
    registry,
    local_blockers: localBlockers,
    local_warnings: localWarnings,
    external_warnings: externalWarnings,
  };
}

export function renderReleaseDoctorReport(report: ReleaseDoctorReport): string {
  return [
    "# Jumpspace Release Doctor",
    "",
    `Local readiness: ${report.status}`,
    `Package: ${report.package.name}@${report.package.version}`,
    `Registry: ${renderRegistryStatus(report.registry)}`,
    "",
    "## Local Blockers",
    renderIssues(report.local_blockers),
    "",
    "## Package Metadata",
    renderChecks(report.package.metadata_checks),
    `LICENSE file: ${report.package.license_file.exists ? "present" : "missing"}`,
    `Bin: ${report.package.bin ? `${report.package.bin.name} -> ${report.package.bin.target} (${report.package.bin.executable ? "executable" : "not executable"})` : "missing"}`,
    "",
    "## Package Dry Run",
    `Command: ${report.package_dry_run.command}`,
    `Exit code: ${report.package_dry_run.exit_code}`,
    `Entries: ${report.package_dry_run.entry_count}`,
    `Filename: ${report.package_dry_run.filename ?? "unknown"}`,
    renderChecks(report.package_dry_run.required_files),
    "",
    "## Schema Artifacts",
    `Included: ${report.schemas.included}/${report.schemas.expected}`,
    report.schemas.missing.length > 0 ? `Missing: ${report.schemas.missing.join(", ")}` : "Missing: none",
    "",
    "## External Publication",
    renderIssues(report.external_warnings),
  ].join("\n");
}

async function readPackageJson(root: string): Promise<Record<string, unknown> & { name: string; version: string }> {
  const raw = await fs.readFile(path.join(root, "package.json"), "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    ...parsed,
    name: stringValue(parsed.name) ?? "",
    version: stringValue(parsed.version) ?? "",
  };
}

function packageMetadataChecks(packageJson: Record<string, unknown> & { name: string; version: string }): ReleaseDoctorCheck[] {
  return [
    check("name", packageJson.name.length > 0, "package name is present", "package name is missing", "package.json", packageJson.name),
    check("version", packageJson.version.length > 0 && packageJson.version !== "0.0.0", "package version is launch-ready", "package version is missing or still 0.0.0", "package.json", packageJson.version),
    check("license", Boolean(stringValue(packageJson.license)), "license metadata is present", "license metadata is missing", "package.json", stringValue(packageJson.license)),
    check("repository", Boolean(packageJson.repository), "repository metadata is present", "repository metadata is missing", "package.json"),
    check("homepage", Boolean(stringValue(packageJson.homepage)), "homepage metadata is present", "homepage metadata is missing", "package.json", stringValue(packageJson.homepage)),
    check("bugs", Boolean(packageJson.bugs), "bugs metadata is present", "bugs metadata is missing", "package.json"),
    check("keywords", stringArray(packageJson.keywords).length > 0, "keywords metadata is present", "keywords metadata is missing", "package.json", stringArray(packageJson.keywords).join(",")),
  ];
}

function check(name: string, passed: boolean, passMessage: string, failMessage: string, filePath: string, actual?: string): ReleaseDoctorCheck {
  return {
    name,
    status: passed ? "pass" : "fail",
    message: passed ? passMessage : failMessage,
    path: filePath,
    actual,
  };
}

async function inspectBin(root: string, packageJson: Record<string, unknown>): Promise<ReleaseDoctorReport["package"]["bin"]> {
  const binValue = packageJson.bin;
  let binName: string | null = null;
  let target: string | null = null;

  if (typeof binValue === "string") {
    binName = stringValue(packageJson.name) ?? "jumpspace";
    target = binValue;
  } else if (isRecord(binValue)) {
    const first = Object.entries(binValue).find(([, value]) => typeof value === "string");
    if (first) {
      binName = first[0];
      target = first[1] as string;
    }
  }

  if (!binName || !target) {
    return null;
  }

  const relativeTarget = stripDotSlash(target);
  const absoluteTarget = path.join(root, relativeTarget);
  let stat: Awaited<ReturnType<typeof fs.stat>> | null = null;
  try {
    stat = await fs.stat(absoluteTarget);
  } catch {
    stat = null;
  }

  return {
    name: binName,
    target: relativeTarget,
    path: relativeTarget,
    exists: Boolean(stat),
    mode: stat ? modeString(stat.mode) : null,
    executable: stat ? (stat.mode & 0o111) !== 0 : false,
  };
}

async function inspectPackageDryRun(root: string, exec: ExecFileLike): Promise<ReleaseDoctorReport["package_dry_run"]> {
  const command = "npm pack --dry-run --json";
  const result = await runProcess(exec, "npm", ["pack", "--dry-run", "--json"], { cwd: root });
  const files = result.exitCode === 0 ? parsePackFiles(result.stdout) : [];
  const filePaths = new Set(files.map((file) => file.path));
  const requiredFiles = REQUIRED_PACKAGE_FILES.map((filePath) => ({
    name: filePath,
    path: filePath,
    status: filePaths.has(filePath) ? "pass" : "fail",
    message: filePaths.has(filePath) ? `${filePath} is included in the package dry-run.` : `${filePath} is missing from the package dry-run.`,
  }) satisfies ReleaseDoctorCheck);
  const packageEntry = parsePackEntry(result.stdout);

  return {
    ok: result.exitCode === 0,
    command,
    exit_code: result.exitCode,
    stderr: result.stderr,
    error: result.errorMessage ?? null,
    filename: packageEntry?.filename ?? null,
    entry_count: packageEntry?.entryCount ?? files.length,
    files,
    required_files: requiredFiles,
  };
}

function parsePackEntry(stdout: string): { filename?: string; entryCount?: number; files?: Array<{ path: string; size?: number; mode?: number }> } | null {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (Array.isArray(parsed) && isRecord(parsed[0])) {
      return parsed[0] as { filename?: string; entryCount?: number; files?: Array<{ path: string; size?: number; mode?: number }> };
    }
  } catch {
    return null;
  }
  return null;
}

function parsePackFiles(stdout: string): Array<{ path: string; size?: number; mode?: number }> {
  const entry = parsePackEntry(stdout);
  return Array.isArray(entry?.files)
    ? entry.files
        .filter((file) => isRecord(file) && typeof file.path === "string")
        .map((file) => ({
          path: file.path,
          size: typeof file.size === "number" ? file.size : undefined,
          mode: typeof file.mode === "number" ? file.mode : undefined,
        }))
    : [];
}

function schemaInclusion(files: Array<{ path: string }>): ReleaseDoctorReport["schemas"] {
  const paths = new Set(files.map((file) => file.path));
  const expected = ["schemas/catalog.json", ...schemaCatalog.map((schema) => `schemas/${schema.name}.schema.json`)];
  const missing = expected.filter((filePath) => !paths.has(filePath));
  return {
    expected: expected.length,
    included: expected.length - missing.length,
    missing,
  };
}

async function inspectRegistry(
  root: string,
  packageName: string,
  exec: ExecFileLike,
  checkRegistry: boolean,
): Promise<ReleaseDoctorReport["registry"]> {
  if (!checkRegistry) {
    return {
      package_name: packageName,
      status: "unknown",
      check: "not_requested",
      checked: false,
      command: null,
      exit_code: null,
      version: null,
      reason: "Registry check was not requested; run with --check-registry when network access is available.",
    };
  }

  const command = `npm view ${packageName} version --json`;
  const result = await runProcess(exec, "npm", ["view", packageName, "version", "--json"], {
    cwd: root,
    timeout: 10_000,
  });

  if (result.exitCode === 0) {
    return {
      package_name: packageName,
      status: "unavailable",
      check: "checked",
      checked: true,
      command,
      exit_code: result.exitCode,
      version: parseNpmViewVersion(result.stdout),
      reason: "Registry returned an existing package version.",
    };
  }

  const combined = `${result.stdout}\n${result.stderr}\n${result.errorMessage ?? ""}`;
  if (/E404|404 Not Found|Not found/i.test(combined)) {
    return {
      package_name: packageName,
      status: "available",
      check: "checked",
      checked: true,
      command,
      exit_code: result.exitCode,
      version: null,
      reason: "Registry returned a not-found response for this package name.",
    };
  }

  return {
    package_name: packageName,
    status: "unknown",
    check: "failed",
    checked: false,
    command,
    exit_code: result.exitCode,
    version: null,
    reason: result.errorMessage ?? (result.stderr.trim() || "Registry check failed for an unknown reason."),
  };
}

async function runProcess(
  exec: ExecFileLike,
  file: string,
  args: string[],
  options: { cwd: string; timeout?: number },
): Promise<{ exitCode: number; stdout: string; stderr: string; errorMessage?: string }> {
  try {
    const result = await exec(file, args, {
      cwd: options.cwd,
      timeout: options.timeout,
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        npm_config_cache: process.env.JUMPSPACE_NPM_CACHE ?? path.join(os.tmpdir(), "jumpspace-npm-cache"),
      },
    });
    return {
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    const candidate = error as { code?: unknown; stdout?: unknown; stderr?: unknown; message?: unknown };
    return {
      exitCode: typeof candidate.code === "number" ? candidate.code : 1,
      stdout: typeof candidate.stdout === "string" ? candidate.stdout : String(candidate.stdout ?? ""),
      stderr: typeof candidate.stderr === "string" ? candidate.stderr : String(candidate.stderr ?? ""),
      errorMessage: typeof candidate.message === "string" ? candidate.message : String(error),
    };
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

async function fileExists(root: string, repoPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(root, repoPath));
    return true;
  } catch {
    return false;
  }
}

function issueFromCheck(code: string, check: ReleaseDoctorCheck, category: "local" | "external"): ReleaseDoctorIssue {
  return {
    code,
    category,
    path: check.path,
    field: check.name,
    expected: check.expected,
    actual: check.actual,
    message: check.message,
  };
}

function renderChecks(checks: ReleaseDoctorCheck[]): string {
  if (checks.length === 0) {
    return "None";
  }
  return checks.map((check) => `- ${check.status}: ${check.name} - ${check.message}`).join("\n");
}

function renderIssues(issues: ReleaseDoctorIssue[]): string {
  if (issues.length === 0) {
    return "None";
  }
  return issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n");
}

function renderRegistryStatus(registry: ReleaseDoctorReport["registry"]): string {
  if (registry.status === "unavailable") {
    return `unavailable (${registry.version ?? "existing package"})`;
  }
  if (registry.status === "available") {
    return "available";
  }
  return `unknown (${registry.reason ?? "not checked"})`;
}

function modeString(mode: number): string {
  return `0${(mode & 0o777).toString(8)}`;
}

function stripDotSlash(value: string): string {
  return value.replace(/^\.\//, "");
}

function parseNpmViewVersion(stdout: string): string | null {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    return typeof parsed === "string" ? parsed : null;
  } catch {
    const trimmed = stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
