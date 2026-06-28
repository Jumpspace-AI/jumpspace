import fs from "node:fs/promises";
import path from "node:path";
import { commandError, type JsonCommandError } from "./errors.js";
import { updateTaskMetadata } from "./metadata.js";
import { resolveRepoPath } from "./config.js";
import {
  JUMP_TASK_REF_TYPES,
  type JumpIndex,
  type JumpTask,
  type JumpTaskMetadata,
  type JumpTaskRef,
  type JumpTaskRefType,
} from "./types.js";

export type TaskLinkField = "code" | "tests" | "depends_on" | "refs" | "gaps";
export type TaskLinkAction = "add" | "remove";

export type TaskLinkUpdateInput = {
  add?: {
    code?: string[];
    tests?: string[];
    depends_on?: string[];
    refs?: JumpTaskRef[];
    gaps?: string[];
  };
  remove?: {
    code?: string[];
    tests?: string[];
    depends_on?: string[];
    refs?: JumpTaskRef[];
    gaps?: string[];
  };
};

export type TaskLinkOperation = {
  action: TaskLinkAction;
  field: TaskLinkField;
  value: string;
  changed: boolean;
  reason: "added" | "removed" | "already_present" | "not_present";
  ref?: JumpTaskRef;
};

export type TaskLinkUpdatePlan = {
  ok: true;
  task_id: string;
  changed: boolean;
  operations: TaskLinkOperation[];
  metadata: JumpTaskMetadata;
};

export type TaskLinkUpdateResult =
  | TaskLinkUpdatePlan
  | {
      ok: false;
      errors: JsonCommandError[];
    };

export type TaskLinkSuggestionCandidate = {
  path: string;
  statuses?: string[];
  sources?: string[];
  content?: string;
};

export type TaskLinkSuggestion = {
  task_id: string;
  field: "code" | "tests";
  path: string;
  score: number;
  match_reasons: string[];
  matched_terms: string[];
  evidence: TaskLinkSuggestionEvidence;
  sources: string[];
  statuses: string[];
};

export type TaskLinkRejectedCandidate = {
  task_id: string;
  field: "code" | "tests";
  path: string;
  reason: "NO_SOURCE_EVIDENCE";
  match_reasons: string[];
  matched_terms: string[];
  evidence: TaskLinkSuggestionEvidence;
  sources: string[];
  statuses: string[];
};

export type TaskLinkSuggestionEvidence = {
  path_terms: string[];
  basename_terms: string[];
  content_terms: string[];
  identifier_terms: string[];
  phrase_matches: string[];
  coverage: {
    matched_terms: number;
    total_terms: number;
    ratio: number;
  };
};

export type TaskLinkSuggestionReport = {
  ok: true;
  task_id: string;
  suggestions: TaskLinkSuggestion[];
  rejected_candidates: TaskLinkRejectedCandidate[];
  candidates_considered: number;
};

export async function planTaskLinkUpdate(
  root: string,
  index: JumpIndex,
  taskId: string,
  input: TaskLinkUpdateInput,
): Promise<TaskLinkUpdateResult> {
  const task = index.tasks.find((candidate) => candidate.id === taskId);
  if (!task) {
    return {
      ok: false,
      errors: [commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${taskId}". Run \`jumpspace find <query>\` to locate it.`, { taskId })],
    };
  }

  const validationErrors = await validateLinkInput(root, index, task, input);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      errors: validationErrors,
    };
  }

  const operations: TaskLinkOperation[] = [];
  const metadata: JumpTaskMetadata = {
    id: task.id,
    type: task.type,
    status: task.status,
    module: task.module,
    space: task.space ?? "repo",
    keywords: task.keywords,
    code: [...task.code],
    tests: [...task.tests],
    gaps: [...(task.gaps ?? [])],
    depends_on: [...task.depends_on],
    refs: (task.refs ?? []).map((ref) => ({ ...ref })),
    sources: task.sources?.map((source) => ({ ...source })),
    plan: task.plan,
    acceptance_criteria: task.acceptance_criteria,
    verification_records: task.verification_records,
    external: task.external,
  };

  applyPathOperations(metadata, operations, "add", "code", unique(input.add?.code ?? []));
  applyPathOperations(metadata, operations, "add", "tests", unique(input.add?.tests ?? []));
  applyPathOperations(metadata, operations, "add", "depends_on", unique(input.add?.depends_on ?? []));
  applyPathOperations(metadata, operations, "add", "gaps", unique(input.add?.gaps ?? []));
  applyRefOperations(metadata, operations, "add", uniqueRefs(input.add?.refs ?? []));

  applyPathOperations(metadata, operations, "remove", "code", unique(input.remove?.code ?? []));
  applyPathOperations(metadata, operations, "remove", "tests", unique(input.remove?.tests ?? []));
  applyPathOperations(metadata, operations, "remove", "depends_on", unique(input.remove?.depends_on ?? []));
  applyPathOperations(metadata, operations, "remove", "gaps", unique(input.remove?.gaps ?? []));
  applyRefOperations(metadata, operations, "remove", uniqueRefs(input.remove?.refs ?? []));

  return {
    ok: true,
    task_id: task.id,
    changed: operations.some((operation) => operation.changed),
    operations,
    metadata,
  };
}

export async function applyTaskLinkUpdate(root: string, task: JumpTask, plan: TaskLinkUpdatePlan): Promise<JumpTaskMetadata> {
  if (!plan.changed) {
    return plan.metadata;
  }
  return updateTaskMetadata(root, task, () => plan.metadata);
}

export function parseTaskRef(raw: string): JumpTaskRef | { ok: false; error: JsonCommandError } {
  const [type, id] = raw.split(":");
  if (!type || !id || raw.split(":").length !== 2) {
    return {
      ok: false,
      error: commandError("INVALID_REF", `Invalid ref "${raw}". Expected <type:id>.`),
    };
  }
  if (!JUMP_TASK_REF_TYPES.includes(type as JumpTaskRefType)) {
    return {
      ok: false,
      error: commandError("INVALID_REF_TYPE", `Invalid ref type "${type}". Expected one of: ${JUMP_TASK_REF_TYPES.join(", ")}.`),
    };
  }
  return {
    type: type as JumpTaskRefType,
    id,
  };
}

export function suggestTaskLinks(
  task: JumpTask,
  candidates: TaskLinkSuggestionCandidate[],
  options: { limit?: number } = {},
): TaskLinkSuggestionReport {
  const intent = taskIntent(task);
  const evaluations = candidates
    .filter((candidate) => isSuggestiblePath(candidate.path) && !(candidate.statuses ?? []).includes("deleted"))
    .map((candidate) => scoreCandidate(task, intent, candidate))
    .filter((evaluation): evaluation is CandidateEvaluation => evaluation !== undefined);
  const suggestions = evaluations
    .flatMap((evaluation) => (evaluation.kind === "suggestion" ? [evaluation.suggestion] : []))
    .filter((suggestion) => !alreadyLinked(task, suggestion.field, suggestion.path))
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, options.limit ?? 20);
  const rejectedCandidates = evaluations
    .flatMap((evaluation) => (evaluation.kind === "rejection" ? [evaluation.rejection] : []))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    ok: true,
    task_id: task.id,
    suggestions,
    rejected_candidates: rejectedCandidates,
    candidates_considered: candidates.length,
  };
}

async function validateLinkInput(root: string, index: JumpIndex, task: JumpTask, input: TaskLinkUpdateInput): Promise<JsonCommandError[]> {
  const errors: JsonCommandError[] = [];
  const taskIds = new Set(index.tasks.map((candidate) => candidate.id));

  for (const repoPath of unique([...(input.add?.code ?? []), ...(input.add?.tests ?? [])])) {
    if (!(await pathExists(resolveRepoPath(root, repoPath)))) {
      errors.push(commandError("MISSING_LINK_PATH", `Linked path "${repoPath}" does not exist.`, { taskId: task.id, path: repoPath }));
    }
  }

  for (const dependency of unique(input.add?.depends_on ?? [])) {
    if (dependency === task.id) {
      errors.push(commandError("SELF_DEPENDENCY", `Task ${task.id} cannot depend on itself.`, { taskId: task.id }));
    } else if (!taskIds.has(dependency)) {
      errors.push(commandError("UNKNOWN_DEPENDENCY", `Unknown dependency task ID "${dependency}".`, { taskId: task.id }));
    }
  }

  for (const ref of uniqueRefs(input.add?.refs ?? [])) {
    if (ref.id === task.id) {
      errors.push(commandError("SELF_REF", `Task ${task.id} cannot reference itself.`, { taskId: task.id }));
    } else if (!taskIds.has(ref.id)) {
      errors.push(commandError("UNKNOWN_REF_TASK", `Unknown referenced task ID "${ref.id}".`, { taskId: task.id }));
    }
  }

  return errors;
}

function applyPathOperations(
  metadata: JumpTaskMetadata,
  operations: TaskLinkOperation[],
  action: TaskLinkAction,
  field: "code" | "tests" | "depends_on" | "gaps",
  values: string[],
): void {
  for (const value of values) {
    const existing = metadata[field].includes(value);
    const changed = action === "add" ? !existing : existing;
    if (changed && action === "add") {
      metadata[field] = [...metadata[field], value];
    } else if (changed) {
      metadata[field] = metadata[field].filter((candidate) => candidate !== value);
    }
    operations.push({
      action,
      field,
      value,
      changed,
      reason: action === "add" ? (existing ? "already_present" : "added") : existing ? "removed" : "not_present",
    });
  }
}

function applyRefOperations(metadata: JumpTaskMetadata, operations: TaskLinkOperation[], action: TaskLinkAction, refs: JumpTaskRef[]): void {
  for (const ref of refs) {
    const existing = metadata.refs.find((candidate) => sameRef(candidate, ref));
    const changed = action === "add" ? !existing : Boolean(existing);
    if (changed && action === "add") {
      metadata.refs = [...metadata.refs, ref];
    } else if (changed) {
      metadata.refs = metadata.refs.filter((candidate) => !sameRef(candidate, ref));
    }
    operations.push({
      action,
      field: "refs",
      value: `${ref.type}:${ref.id}`,
      ref,
      changed,
      reason: action === "add" ? (existing ? "already_present" : "added") : existing ? "removed" : "not_present",
    });
  }
}

type TaskLinkIntent = {
  terms: Set<string>;
  phrases: string[];
};

type CandidateEvaluation =
  | {
      kind: "suggestion";
      suggestion: TaskLinkSuggestion;
    }
  | {
      kind: "rejection";
      rejection: TaskLinkRejectedCandidate;
    };

function scoreCandidate(task: JumpTask, intent: TaskLinkIntent, candidate: TaskLinkSuggestionCandidate): CandidateEvaluation | undefined {
  const pathTerms = new Set(tokenize(candidate.path));
  const basename = path.basename(candidate.path, path.extname(candidate.path));
  const basenameTerms = new Set(tokenize(basename));
  const contentTerms = new Set(tokenize(candidate.content ?? ""));
  const identifierTerms = new Set(extractIdentifierTerms(candidate.content ?? ""));
  const pathMatchedTerms = [...pathTerms].filter((term) => intent.terms.has(term));
  const basenameMatchedTerms = [...basenameTerms].filter((term) => intent.terms.has(term));
  const contentMatchedTerms = [...contentTerms].filter((term) => intent.terms.has(term));
  const identifierMatchedTerms = [...identifierTerms].filter((term) => intent.terms.has(term));
  const phraseMatches = matchIntentPhrases(intent.phrases, {
    path: candidate.path,
    basename,
    content: candidate.content ?? "",
    identifier: [...identifierTerms].join(" "),
  });
  const matchedTerms = unique([...pathMatchedTerms, ...basenameMatchedTerms, ...identifierMatchedTerms, ...contentMatchedTerms]);
  const evidence = {
    path_terms: unique(pathMatchedTerms),
    basename_terms: unique(basenameMatchedTerms),
    content_terms: unique(contentMatchedTerms),
    identifier_terms: unique(identifierMatchedTerms),
    phrase_matches: unique(phraseMatches),
    coverage: coverage(matchedTerms.length, intent.terms.size),
  };
  const sources = candidate.sources ?? [];
  const statuses = candidate.statuses ?? [];
  const field = isTestPath(candidate.path) ? "tests" : "code";
  if (matchedTerms.length === 0) {
    return {
      kind: "rejection",
      rejection: {
        task_id: task.id,
        field,
        path: candidate.path,
        reason: "NO_SOURCE_EVIDENCE",
        match_reasons: [],
        matched_terms: [],
        evidence,
        sources,
        statuses,
      },
    };
  }

  const matchReasons = [
    ...pathMatchedTerms.map((term) => `path:${term}`),
    ...basenameMatchedTerms.map((term) => `basename:${term}`),
    ...identifierMatchedTerms.map((term) => `identifier:${term}`),
    ...contentMatchedTerms.map((term) => `content:${term}`),
    ...phraseMatches.map((match) => `phrase:${match}`),
  ];
  let score =
    basenameMatchedTerms.length * 20 +
    pathMatchedTerms.length * 12 +
    identifierMatchedTerms.length * 16 +
    contentMatchedTerms.length * 6 +
    phraseMatches.reduce((total, match) => total + phraseScore(match), 0);

  if (task.module && (pathTerms.has(normalizeToken(task.module)) || contentTerms.has(normalizeToken(task.module)))) {
    score += 8;
    matchReasons.push(`module:${task.module}`);
  }
  if (statuses.length > 0) {
    score += 3;
    matchReasons.push(...statuses.map((status) => `status:${status}`));
  }
  if (sources.length > 0) {
    score += 2;
    matchReasons.push(...sources.map((source) => `source:${source}`));
  }
  if (field === "tests") {
    score += 2;
    matchReasons.push("field:tests");
  } else {
    matchReasons.push("field:code");
  }

  if (score === 0) {
    return undefined;
  }

  return {
    kind: "suggestion",
    suggestion: {
      task_id: task.id,
      field,
      path: candidate.path,
      score,
      match_reasons: unique(matchReasons),
      matched_terms: unique(matchedTerms),
      evidence,
      sources,
      statuses,
    },
  };
}

function taskIntent(task: JumpTask): TaskLinkIntent {
  const intentSources = [task.id, task.title, task.spec, task.module ?? "", ...(task.keywords ?? []), task.doc.heading];
  return {
    terms: new Set(intentSources.flatMap(tokenize)),
    phrases: intentPhrases([task.title, task.doc.heading, ...(task.keywords ?? []), task.module ?? ""]),
  };
}

function tokenize(value: string): string[] {
  const tokens = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map(normalizeToken)
    .filter((term) => term.length >= 3 && !STOP_WORDS.has(term));
  return unique(tokens.flatMap(pluralVariants));
}

function normalizeToken(value: string): string {
  return value.toLowerCase();
}

function extractIdentifierTerms(value: string): string[] {
  const identifiers = value.match(/\b[A-Za-z_$][A-Za-z0-9_$]*\b/g) ?? [];
  return unique(identifiers.filter(isCodeLikeIdentifier).flatMap(tokenize));
}

function isCodeLikeIdentifier(value: string): boolean {
  return /[A-Z_$]/.test(value.slice(1)) || value.includes("_") || value.includes("$");
}

function intentPhrases(values: string[]): string[] {
  const phrases: string[] = [];
  for (const value of values) {
    const tokens = phraseTokens(value);
    if (tokens.length >= 2 && tokens.length <= 5) {
      phrases.push(tokens.join(" "));
    }
  }
  return unique(phrases);
}

function matchIntentPhrases(phrases: string[], scopes: Record<string, string>): string[] {
  const matches: string[] = [];
  for (const [scope, value] of Object.entries(scopes)) {
    const haystack = ` ${tokenize(value).join(" ")} `;
    for (const phrase of phrases) {
      if (haystack.includes(` ${phrase} `)) {
        matches.push(`${scope}:${phrase}`);
      }
    }
  }
  return unique(matches);
}

function phraseTokens(value: string): string[] {
  return unique(
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(/[^A-Za-z0-9]+/)
      .map(normalizeToken)
      .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
  );
}

function pluralVariants(term: string): string[] {
  if (term.endsWith("s") && term.length > 4 && !term.endsWith("ss") && !term.endsWith("us") && !term.endsWith("is")) {
    return [term, term.slice(0, -1)];
  }
  return [term];
}

function phraseScore(match: string): number {
  if (match.startsWith("basename:") || match.startsWith("path:")) {
    return 30;
  }
  if (match.startsWith("identifier:")) {
    return 24;
  }
  return 16;
}

function coverage(matchedTerms: number, totalTerms: number): TaskLinkSuggestionEvidence["coverage"] {
  return {
    matched_terms: matchedTerms,
    total_terms: totalTerms,
    ratio: totalTerms === 0 ? 0 : Number((matchedTerms / totalTerms).toFixed(3)),
  };
}

function isSuggestiblePath(repoPath: string): boolean {
  if (repoPath.endsWith(".md") || repoPath.endsWith(".mdx")) {
    return false;
  }
  return !["node_modules/", "dist/", "build/", ".git/", ".jumpspace/", "coverage/"].some((prefix) => repoPath.startsWith(prefix));
}

function isTestPath(repoPath: string): boolean {
  const base = path.basename(repoPath).toLowerCase();
  return (
    base.includes(".test.") ||
    base.includes(".spec.") ||
    repoPath.includes("/test/") ||
    repoPath.includes("/tests/") ||
    repoPath.endsWith(".test.ts") ||
    repoPath.endsWith(".test.tsx")
  );
}

function alreadyLinked(task: JumpTask, field: "code" | "tests", repoPath: string): boolean {
  return task[field].includes(repoPath);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sameRef(left: JumpTaskRef, right: JumpTaskRef): boolean {
  return left.type === right.type && left.id === right.id;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueRefs(refs: JumpTaskRef[]): JumpTaskRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "this",
  "that",
  "into",
  "src",
  "lib",
  "app",
  "apps",
  "test",
  "tests",
  "spec",
  "specs",
  "docs",
  "file",
  "files",
  "change",
  "changed",
  "only",
  "not",
  "near",
  "without",
  "should",
  "task",
  "jumpspace",
  "export",
  "const",
  "let",
  "var",
  "function",
  "return",
  "true",
  "false",
]);
