import { errorEnvelope, commandError, type JsonCommandError } from "../core/errors.js";
import { getChangedFiles, type ChangedFile } from "../core/changed.js";
import {
  checkIntentsForPaths,
  loadIntents,
  pathsFromDiffFile,
  summarizeIntent,
  verifyIntentsForPaths,
  verifyIntentsSince,
  type IntentCheckResult,
  type IntentLoadResult,
  type IntentRecord,
  type IntentValidationIssue,
  type IntentVerificationResult,
  type IntentVerifyResult,
} from "../core/intents.js";

export type IntentListOptions = {
  root?: string;
  status?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type IntentCheckOptions = {
  root?: string;
  paths: string[];
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type IntentValidateOptions = {
  root?: string;
  since?: string;
  maxNew?: number;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type IntentVerifyOptions = {
  root?: string;
  paths?: string[];
  since?: string;
  diff?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type IntentListResult = {
  ok: true;
  roots: string[];
  count: number;
  intents: ReturnType<typeof summarizeIntent>[];
  issues: IntentValidationIssue[];
};

export type IntentValidateResult = {
  ok: boolean;
  roots: string[];
  count: number;
  since?: string;
  max_new_active_intents?: number;
  new_active_intent_count?: number;
  new_active_intents?: ReturnType<typeof summarizeIntent>[];
  issues: IntentValidationIssue[];
  errors: IntentValidationIssue[];
  warnings: IntentValidationIssue[];
};

export async function runIntentList(options: IntentListOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const loaded = await loadIntents(root);
  const intents = filterIntents(loaded.intents, options.status).map(summarizeIntent);
  const result: IntentListResult = {
    ok: true,
    roots: loaded.roots,
    count: intents.length,
    intents,
    issues: loaded.issues,
  };
  writeLine(options.json ? JSON.stringify(result, null, 2) : renderIntentList(result));
  return 0;
}

export async function runIntentCheck(options: IntentCheckOptions): Promise<number> {
  if (options.paths.length === 0) {
    return writeError(options, commandError("INTENT_CHECK_PATH_REQUIRED", "Provide at least one path with --for."));
  }
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const result = await checkIntentsForPaths(options.paths, root);
  writeLine(options.json ? JSON.stringify(result, null, 2) : renderIntentCheck(result));
  return 0;
}

export async function runIntentValidate(options: IntentValidateOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const loaded = await loadIntents(root);
  const issues = [...loaded.issues];
  const newActiveIntents = options.since ? await collectNewActiveIntents(root, options.since, loaded) : undefined;
  if (newActiveIntents && !newActiveIntents.ok) {
    return writeError(options, newActiveIntents.errors);
  }
  const maxNew = options.since ? options.maxNew ?? 3 : undefined;
  if (newActiveIntents?.ok && maxNew !== undefined && newActiveIntents.intents.length > maxNew) {
    issues.push({
      ...commandError(
        "INTENT_NEW_ACTIVE_LIMIT_EXCEEDED",
        `Branch adds ${newActiveIntents.intents.length} active intents since ${newActiveIntents.since}; target is ${maxNew}. Re-check whether the feature is over-capturing before adding more durable memory.`,
        { path: newActiveIntents.intents.map((intent) => intent.path).join(", ") },
      ),
      severity: "warning",
    });
  }
  const result: IntentValidateResult = {
    ok: issues.every((issue) => issue.severity !== "error"),
    roots: loaded.roots,
    count: loaded.intents.length,
    since: newActiveIntents?.ok ? newActiveIntents.since : undefined,
    max_new_active_intents: maxNew,
    new_active_intent_count: newActiveIntents?.ok ? newActiveIntents.intents.length : undefined,
    new_active_intents: newActiveIntents?.ok ? newActiveIntents.intents.map(summarizeIntent) : undefined,
    issues,
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
  writeLine(options.json ? JSON.stringify(result, null, 2) : renderIntentValidate(result));
  return result.ok ? 0 : 1;
}

export async function runIntentVerify(options: IntentVerifyOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const explicitPaths = options.paths ?? [];
  const pathSources = [explicitPaths.length > 0, Boolean(options.since), Boolean(options.diff)].filter(Boolean).length;
  if (pathSources !== 1) {
    return writeError(options, commandError("INTENT_VERIFY_SOURCE_REQUIRED", "Provide exactly one of --for, --since, or --diff."));
  }

  let result: IntentVerifyResult | { ok: false; errors: JsonCommandError[] };
  if (options.since) {
    result = await verifyIntentsSince(root, options.since);
  } else if (options.diff) {
    result = await verifyIntentsForPaths(await pathsFromDiffFile(root, options.diff), { root, since: null });
  } else {
    result = await verifyIntentsForPaths(explicitPaths, { root, since: null });
  }

  if (!result.ok) {
    return writeError(options, result.errors);
  }

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderIntentVerify(result));
  return 0;
}

function filterIntents(intents: IntentRecord[], status?: string): IntentRecord[] {
  return status ? intents.filter((intent) => intent.status === status) : intents;
}

async function collectNewActiveIntents(
  root: string,
  since: string,
  loaded: IntentLoadResult,
): Promise<{ ok: true; since: string; intents: IntentRecord[] } | { ok: false; errors: JsonCommandError[] }> {
  const changed = await getChangedFiles(root, since);
  if (!changed.ok) {
    return changed;
  }
  const newIntentPaths = new Set(
    changed.files
      .filter(isNewFile)
      .map((file) => file.path),
  );
  return {
    ok: true,
    since: changed.since,
    intents: loaded.intents.filter((intent) => intent.status === "active" && newIntentPaths.has(intent.path)),
  };
}

function isNewFile(file: ChangedFile): boolean {
  return file.statuses.some((status) => ["added", "copied", "untracked"].includes(status));
}

function renderIntentList(result: IntentListResult): string {
  return [
    "# Jumpspace Intents",
    "",
    `Roots: ${result.roots.join(", ") || "none"}`,
    `Intents: ${result.count}`,
    "",
    result.intents.length === 0
      ? "No intents found."
      : result.intents.map((intent) => `- ${intent.id} (${intent.status}) ${intent.path}: ${intent.title}`).join("\n"),
    "",
    renderIssues(result.issues),
  ].filter(Boolean).join("\n");
}

function renderIntentCheck(result: IntentCheckResult): string {
  return [
    "# Jumpspace Intent Check",
    "",
    `Paths: ${result.paths.join(", ") || "none"}`,
    `Active intents: ${result.active_intent_count}`,
    `Matched intents: ${result.matched_intent_count}`,
    "",
    "## Matches",
    result.matches.length === 0
      ? "- None"
      : result.matches
          .map((match) => `- ${match.intent.id}: ${match.intent.title}\n  Paths: ${match.matched_paths.join(", ")}`)
          .join("\n"),
    "",
    "## Unmatched Paths",
    result.unmatched_paths.length === 0 ? "- None" : result.unmatched_paths.map((repoPath) => `- ${repoPath}`).join("\n"),
  ].join("\n");
}

function renderIntentValidate(result: IntentValidateResult): string {
  return [
    "# Jumpspace Intent Validation",
    "",
    `Roots: ${result.roots.join(", ") || "none"}`,
    `Intents: ${result.count}`,
    result.since ? `New active intents since ${result.since}: ${result.new_active_intent_count ?? 0}/${result.max_new_active_intents ?? 3}` : undefined,
    `Errors: ${result.errors.length}`,
    `Warnings: ${result.warnings.length}`,
    "",
    renderIssues(result.issues),
  ].filter((line) => line !== undefined).join("\n");
}

function renderIntentVerify(result: IntentVerifyResult): string {
  return [
    "# Jumpspace Intent Verification",
    "",
    `Since: ${result.since ?? "n/a"}`,
    `Paths: ${result.paths.join(", ") || "none"}`,
    `Consistent: ${result.summary.consistent}`,
    `Possible violations: ${result.summary.possible_violation}`,
    `Unknown: ${result.summary.unknown}`,
    `Not applicable: ${result.summary.not_applicable}`,
    "",
    "## Results",
    result.results.length === 0 ? "- None" : result.results.map(renderVerificationResult).join("\n"),
  ].join("\n");
}

function renderVerificationResult(result: IntentVerificationResult): string {
  const title = result.intent ? `${result.intent.id}: ${result.intent.title}` : "No matching intent";
  return [
    `- ${result.status}: ${title}`,
    `  Paths: ${result.paths.join(", ") || "none"}`,
    `  Evidence: ${result.evidence.join(" ")}`,
  ].join("\n");
}

function renderIssues(issues: IntentValidationIssue[]): string {
  if (issues.length === 0) {
    return "No validation issues.";
  }
  return [
    "## Issues",
    ...issues.map((issue) => `- ${issue.severity} ${issue.code}${issue.path ? ` ${issue.path}` : ""}: ${issue.message}`),
  ].join("\n");
}

function writeError(options: { json?: boolean; writeLine?: (line: string) => void; errorLine?: (line: string) => void }, errors: JsonCommandError | JsonCommandError[]): number {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const normalized = Array.isArray(errors) ? errors : [errors];
  if (options.json) {
    writeLine(JSON.stringify(errorEnvelope(normalized), null, 2));
  } else {
    for (const error of normalized) {
      errorLine(error.message);
    }
  }
  return 1;
}
