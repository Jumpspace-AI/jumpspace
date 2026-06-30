import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import micromatch from "micromatch";
import { parse as parseYaml } from "yaml";
import { getChangedFiles } from "./changed.js";
import { loadConfig, resolveRepoPath } from "./config.js";
import { commandError, type JsonCommandError } from "./errors.js";
import { DISCOVERY_IGNORE_PATTERNS } from "./discovery.js";

export const INTENT_STATUSES = ["active", "superseded", "rejected"] as const;
export const DEFAULT_INTENT_GLOBS = ["documentation/intents/*.md"] as const;

export type IntentStatus = (typeof INTENT_STATUSES)[number];

export type IntentFrontmatter = {
  id: string;
  status: IntentStatus;
  scope: string | string[];
  superseded_by?: string;
};

export type IntentRecord = {
  id: string;
  status: IntentStatus;
  scope: string[];
  superseded_by?: string;
  title: string;
  path: string;
  frontmatter: IntentFrontmatter;
  body: string;
  decision?: string;
  why?: string;
  alternatives_rejected?: string;
};

export type IntentSummary = {
  id: string;
  status: IntentStatus;
  scope: string[];
  title: string;
  path: string;
  superseded_by?: string;
};

export type IntentCheckIntent = IntentSummary & {
  decision?: string;
  why?: string;
  alternatives_rejected?: string;
};

export type IntentValidationIssue = JsonCommandError & {
  severity: "error" | "warning";
  intent_id?: string;
};

export type IntentLoadResult = {
  roots: string[];
  intents: IntentRecord[];
  issues: IntentValidationIssue[];
};

export type IntentCheckMatch = {
  intent: IntentCheckIntent;
  matched_paths: string[];
};

export type IntentCheckResult = {
  ok: true;
  roots: string[];
  paths: string[];
  active_intent_count: number;
  matched_intent_count: number;
  matches: IntentCheckMatch[];
  unmatched_paths: string[];
};

export type IntentVerificationStatus = "consistent" | "possible_violation" | "unknown" | "not_applicable";

export type IntentVerificationResult = {
  status: IntentVerificationStatus;
  intent?: IntentSummary;
  paths: string[];
  evidence: string[];
};

export type IntentVerifyResult = {
  ok: true;
  since: string | null;
  roots: string[];
  paths: string[];
  summary: Record<IntentVerificationStatus, number>;
  results: IntentVerificationResult[];
};

type RawIntent = {
  path: string;
  markdown: string;
};

type ParseResult = {
  intent?: IntentRecord;
  issues: IntentValidationIssue[];
};

export async function loadIntents(root = process.cwd()): Promise<IntentLoadResult> {
  const config = await loadConfig(root);
  const roots = config.intents ?? [...DEFAULT_INTENT_GLOBS];
  const paths = await fg(roots, {
    cwd: root,
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: DISCOVERY_IGNORE_PATTERNS,
  });
  const rawIntents = await Promise.all(
    paths.sort().map(async (repoPath): Promise<RawIntent> => ({
      path: normalizeRepoPath(repoPath),
      markdown: await fs.readFile(resolveRepoPath(root, repoPath), "utf8"),
    })),
  );

  const intents: IntentRecord[] = [];
  const issues: IntentValidationIssue[] = [];
  for (const raw of rawIntents) {
    const parsed = parseIntent(raw);
    issues.push(...parsed.issues);
    if (parsed.intent) {
      intents.push(parsed.intent);
    }
  }

  issues.push(...validateIntentSet(intents));

  return {
    roots,
    intents,
    issues,
  };
}

export async function checkIntentsForPaths(paths: string[], root = process.cwd()): Promise<IntentCheckResult> {
  const loaded = await loadIntents(root);
  const normalizedPaths = unique(paths.map(normalizeRepoPath).filter(Boolean));
  const activeIntents = loaded.intents.filter((intent) => intent.status === "active");
  const matches: IntentCheckMatch[] = [];
  const matchedPaths = new Set<string>();

  for (const intent of activeIntents) {
    const intentMatchedPaths = normalizedPaths.filter((repoPath) => intentMatchesPath(intent, repoPath));
    if (intentMatchedPaths.length > 0) {
      matches.push({
        intent: intentForCheck(intent),
        matched_paths: intentMatchedPaths,
      });
      for (const repoPath of intentMatchedPaths) {
        matchedPaths.add(repoPath);
      }
    }
  }

  return {
    ok: true,
    roots: loaded.roots,
    paths: normalizedPaths,
    active_intent_count: activeIntents.length,
    matched_intent_count: matches.length,
    matches,
    unmatched_paths: normalizedPaths.filter((repoPath) => !matchedPaths.has(repoPath)),
  };
}

export async function verifyIntentsForPaths(paths: string[], options: { root?: string; since?: string | null } = {}): Promise<IntentVerifyResult> {
  const root = options.root ?? process.cwd();
  const check = await checkIntentsForPaths(paths, root);
  const results: IntentVerificationResult[] = check.matches.map((match) => ({
    status: "unknown",
    intent: summarizeCheckedIntent(match.intent),
    paths: match.matched_paths,
    evidence: [
      "Intent scope matches changed path(s).",
      "Deterministic v1 verifier does not claim semantic consistency without human, agent, or rule-backed review.",
    ],
  }));

  for (const repoPath of check.unmatched_paths) {
    results.push({
      status: "not_applicable",
      paths: [repoPath],
      evidence: ["No active intent scope matched this path."],
    });
  }

  return {
    ok: true,
    since: options.since ?? null,
    roots: check.roots,
    paths: check.paths,
    summary: summarizeVerification(results),
    results,
  };
}

export async function verifyIntentsSince(root: string, since: string): Promise<IntentVerifyResult | { ok: false; errors: JsonCommandError[] }> {
  const changed = await getChangedFiles(root, since);
  if (!changed.ok) {
    return changed;
  }
  return verifyIntentsForPaths(changed.files.map((file) => file.path), { root, since: changed.since });
}

export async function pathsFromDiffFile(root: string, repoPath: string): Promise<string[]> {
  const diffPath = resolveRepoPath(root, repoPath);
  const raw = await fs.readFile(diffPath, "utf8");
  const paths = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const match = /^(?:---|\+\+\+) [ab]\/(.+)$/.exec(line);
    if (match && match[1] !== "/dev/null") {
      paths.add(normalizeRepoPath(match[1]));
    }
  }
  return [...paths].sort();
}

export function summarizeIntent(intent: IntentRecord): IntentSummary {
  return {
    id: intent.id,
    status: intent.status,
    scope: intent.scope,
    title: intent.title,
    path: intent.path,
    superseded_by: intent.superseded_by,
  };
}

function intentForCheck(intent: IntentRecord): IntentCheckIntent {
  return {
    ...summarizeIntent(intent),
    decision: intent.decision,
    why: intent.why,
    alternatives_rejected: intent.alternatives_rejected,
  };
}

function summarizeCheckedIntent(intent: IntentCheckIntent): IntentSummary {
  return {
    id: intent.id,
    status: intent.status,
    scope: intent.scope,
    title: intent.title,
    path: intent.path,
    superseded_by: intent.superseded_by,
  };
}

export function intentMatchesPath(intent: Pick<IntentRecord, "scope">, repoPath: string): boolean {
  const normalizedPath = normalizeRepoPath(repoPath);
  return micromatch([normalizedPath], intent.scope, { dot: true }).length > 0;
}

function parseIntent(raw: RawIntent): ParseResult {
  const issues: IntentValidationIssue[] = [];
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw.markdown);
  if (!frontmatterMatch) {
    return {
      issues: [
        {
          ...commandError("INTENT_MISSING_FRONTMATTER", `Intent file ${raw.path} is missing YAML frontmatter.`, { path: raw.path }),
          severity: "error",
        },
      ],
    };
  }

  let frontmatter: Record<string, unknown>;
  try {
    const parsed = parseYaml(frontmatterMatch[1]);
    frontmatter = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch (error) {
    return {
      issues: [
        {
          ...commandError("INTENT_INVALID_FRONTMATTER", `Intent file ${raw.path} has invalid YAML: ${formatError(error)}`, { path: raw.path }),
          severity: "error",
        },
      ],
    };
  }

  const id = stringField(frontmatter, "id");
  const statusValue = stringField(frontmatter, "status");
  const scopeValue = scopeField(frontmatter, "scope");
  const supersededBy = stringField(frontmatter, "superseded_by");

  if (!id) {
    issues.push({
      ...commandError("INTENT_MISSING_ID", `Intent file ${raw.path} is missing frontmatter id.`, { path: raw.path }),
      severity: "error",
    });
  }
  if (!statusValue) {
    issues.push({
      ...commandError("INTENT_MISSING_STATUS", `Intent file ${raw.path} is missing frontmatter status.`, { path: raw.path }),
      severity: "error",
    });
  } else if (!isIntentStatus(statusValue)) {
    issues.push({
      ...commandError("INTENT_INVALID_STATUS", `Intent ${id ?? raw.path} has invalid status "${statusValue}".`, { path: raw.path }),
      severity: "error",
      intent_id: id,
    });
  }
  if (!scopeValue || scopeValue.length === 0) {
    issues.push({
      ...commandError("INTENT_MISSING_SCOPE", `Intent ${id ?? raw.path} is missing frontmatter scope.`, { path: raw.path }),
      severity: "error",
      intent_id: id,
    });
  }

  if (!id || !statusValue || !isIntentStatus(statusValue) || !scopeValue || scopeValue.length === 0) {
    return { issues };
  }

  const body = raw.markdown.slice(frontmatterMatch[0].length);
  const intent: IntentRecord = {
    id,
    status: statusValue,
    scope: scopeValue,
    superseded_by: supersededBy,
    title: firstHeading(body) ?? id,
    path: raw.path,
    frontmatter: {
      id,
      status: statusValue,
      scope: scopeValue,
      superseded_by: supersededBy,
    },
    body,
    decision: sectionText(body, "Decision"),
    why: sectionText(body, "Why"),
    alternatives_rejected: sectionText(body, "Alternatives rejected"),
  };

  if (intent.status === "active" && !intent.alternatives_rejected?.trim()) {
    issues.push({
      ...commandError("INTENT_MISSING_REJECTED_ALTERNATIVES", `Active intent ${intent.id} has no Alternatives rejected section.`, {
        path: raw.path,
      }),
      severity: "warning",
      intent_id: intent.id,
    });
  }

  return {
    intent,
    issues,
  };
}

function validateIntentSet(intents: IntentRecord[]): IntentValidationIssue[] {
  const issues: IntentValidationIssue[] = [];
  const byId = new Map<string, IntentRecord[]>();
  for (const intent of intents) {
    byId.set(intent.id, [...(byId.get(intent.id) ?? []), intent]);
  }

  for (const [id, matches] of byId) {
    if (matches.length > 1) {
      issues.push({
        ...commandError("INTENT_DUPLICATE_ID", `Intent id "${id}" appears in multiple files.`, { path: matches.map((intent) => intent.path).join(", ") }),
        severity: "error",
        intent_id: id,
      });
    }
  }

  for (const intent of intents) {
    if (intent.status === "superseded" && intent.superseded_by && !byId.has(intent.superseded_by)) {
      issues.push({
        ...commandError("INTENT_SUPERSEDED_BY_MISSING", `Intent ${intent.id} supersedes to missing intent ${intent.superseded_by}.`, {
          path: intent.path,
        }),
        severity: "error",
        intent_id: intent.id,
      });
    }
  }

  return issues;
}

function sectionText(markdown: string, heading: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  const target = heading.toLowerCase();
  const start = lines.findIndex((line) => {
    const match = /^##[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    return match?.[1]?.trim().toLowerCase() === target;
  });
  if (start === -1) {
    return undefined;
  }
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##[ \t]+/.test(line)) {
      break;
    }
    body.push(line);
  }
  return body.join("\n").trim();
}

function firstHeading(markdown: string): string | undefined {
  return /^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(markdown)?.[1]?.trim();
}

function splitScope(scope: string): string[] {
  return unique(scope.split(",").map((value) => normalizeRepoPath(value.trim())).filter(Boolean));
}

function scopeField(frontmatter: Record<string, unknown>, key: string): string[] | undefined {
  const value = frontmatter[key];
  if (typeof value === "string" && value.trim()) {
    return splitScope(value);
  }
  if (Array.isArray(value)) {
    const scopes = value
      .map((item) => typeof item === "string" ? normalizeRepoPath(item.trim()) : "")
      .filter(Boolean);
    return scopes.length > 0 ? unique(scopes) : undefined;
  }
  return undefined;
}

function stringField(frontmatter: Record<string, unknown>, key: string): string | undefined {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isIntentStatus(value: string): value is IntentStatus {
  return (INTENT_STATUSES as readonly string[]).includes(value);
}

function normalizeRepoPath(repoPath: string): string {
  return repoPath.replaceAll(path.sep, "/").replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function summarizeVerification(results: IntentVerificationResult[]): Record<IntentVerificationStatus, number> {
  return {
    consistent: results.filter((result) => result.status === "consistent").length,
    possible_violation: results.filter((result) => result.status === "possible_violation").length,
    unknown: results.filter((result) => result.status === "unknown").length,
    not_applicable: results.filter((result) => result.status === "not_applicable").length,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
