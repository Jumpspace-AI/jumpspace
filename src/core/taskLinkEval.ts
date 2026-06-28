import fs from "node:fs/promises";
import { suggestTaskLinks, type TaskLinkRejectedCandidate, type TaskLinkSuggestion, type TaskLinkSuggestionCandidate } from "./taskLinks.js";
import type { JumpTask } from "./types.js";

export type LinkSuggestionEvalExpected = {
  path: string | null;
  field: "code" | "tests" | null;
  max_rank: number | null;
  min_matched_terms?: number;
};

export type LinkSuggestionEvalCase = {
  id: string;
  description: string;
  task: JumpTask;
  candidates: TaskLinkSuggestionCandidate[];
  expected: LinkSuggestionEvalExpected;
};

export type LinkSuggestionEvalCaseResult = {
  id: string;
  description: string;
  expected: LinkSuggestionEvalExpected;
  passed: boolean;
  rank: number | null;
  reciprocal_rank: number;
  top: Pick<TaskLinkSuggestion, "field" | "path" | "score" | "matched_terms" | "match_reasons" | "evidence"> | null;
  suggestions: Array<Pick<TaskLinkSuggestion, "field" | "path" | "score" | "matched_terms" | "match_reasons" | "evidence">>;
  rejected_candidates: Array<Pick<TaskLinkRejectedCandidate, "field" | "path" | "reason" | "matched_terms" | "match_reasons" | "evidence">>;
  failure_reason: string | null;
};

export type LinkSuggestionEvalReport = {
  ok: true;
  suite: string;
  fixture_path: string | null;
  case_count: number;
  summary: {
    passed: number;
    failed: number;
    top1_accuracy: number;
    mean_reciprocal_rank: number;
  };
  cases: LinkSuggestionEvalCaseResult[];
};

export type LinkSuggestionEvalFixture = {
  suite?: string;
  shared_candidates?: TaskLinkSuggestionCandidate[];
  cases: LinkSuggestionEvalFixtureCase[];
};

export type LinkSuggestionEvalFixtureCase = {
  id: string;
  description?: string;
  task: Partial<JumpTask> & Pick<JumpTask, "id" | "title" | "spec">;
  candidates?: TaskLinkSuggestionCandidate[];
  expected: LinkSuggestionEvalExpected;
};

export type LinkSuggestionEvalFixtureLoadResult =
  | {
      ok: true;
      suite: string;
      cases: LinkSuggestionEvalCase[];
    }
  | {
      ok: false;
      message: string;
    };

export function evaluateLinkSuggestionRanking(
  options: { limit?: number; cases?: LinkSuggestionEvalCase[]; suite?: string; fixturePath?: string | null } = {},
): LinkSuggestionEvalReport {
  const cases = options.cases ?? defaultLinkSuggestionEvalCases();
  const results = cases.map((testCase) => evaluateCase(testCase, options.limit ?? 5));
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const reciprocalTotal = results.reduce((total, result) => total + result.reciprocal_rank, 0);

  return {
    ok: true,
    suite: options.suite ?? "built-in",
    fixture_path: options.fixturePath ?? null,
    case_count: results.length,
    summary: {
      passed,
      failed,
      top1_accuracy: ratio(passed, results.length),
      mean_reciprocal_rank: ratio(reciprocalTotal, results.length),
    },
    cases: results,
  };
}

function evaluateCase(testCase: LinkSuggestionEvalCase, limit: number): LinkSuggestionEvalCaseResult {
  const report = suggestTaskLinks(testCase.task, testCase.candidates, { limit });
  const suggestions = report.suggestions;
  const rejectedCandidates = report.rejected_candidates;
  const expectedPath = testCase.expected.path;
  const top = suggestions[0] ? suggestionBrief(suggestions[0]) : null;

  if (expectedPath === null) {
    const passed = suggestions.length === 0;
    return {
      id: testCase.id,
      description: testCase.description,
      expected: testCase.expected,
      passed,
      rank: null,
      reciprocal_rank: passed ? 1 : 0,
      top,
      suggestions: suggestions.map(suggestionBrief),
      rejected_candidates: rejectedCandidates.map(rejectedCandidateBrief),
      failure_reason: passed ? null : `Expected no suggestions, but ${top?.path ?? "a candidate"} ranked first.`,
    };
  }

  const index = suggestions.findIndex((suggestion) => suggestion.path === expectedPath && suggestion.field === testCase.expected.field);
  const rank = index >= 0 ? index + 1 : null;
  const maxRank = testCase.expected.max_rank ?? 1;
  const matchedSuggestion = index >= 0 ? suggestions[index] : null;
  const evidenceMatches = matchedSuggestion ? matchedSuggestion.matched_terms.length >= (testCase.expected.min_matched_terms ?? 0) : true;
  const passed = rank !== null && rank <= maxRank && evidenceMatches;

  return {
    id: testCase.id,
    description: testCase.description,
    expected: testCase.expected,
    passed,
    rank,
    reciprocal_rank: rank === null ? 0 : Number((1 / rank).toFixed(3)),
    top,
    suggestions: suggestions.map(suggestionBrief),
    rejected_candidates: rejectedCandidates.map(rejectedCandidateBrief),
    failure_reason: passed ? null : explainFailure(testCase, suggestions, rank, maxRank),
  };
}

function explainFailure(
  testCase: LinkSuggestionEvalCase,
  suggestions: TaskLinkSuggestion[],
  rank: number | null,
  maxRank: number,
): string {
  const expectedPath = testCase.expected.path;
  if (expectedPath === null) {
    return "Expected no suggestions.";
  }
  if (!testCase.candidates.some((candidate) => candidate.path === expectedPath)) {
    return `Expected candidate ${expectedPath} is missing from fixture candidates.`;
  }
  const samePath = suggestions.find((suggestion) => suggestion.path === expectedPath);
  if (samePath && samePath.field !== testCase.expected.field) {
    return `Expected ${expectedPath} as ${testCase.expected.field}, but it ranked as ${samePath.field}.`;
  }
  if (rank === null) {
    return `Expected ${expectedPath} to rank <= ${maxRank}, but it was not ranked among ${suggestions.length} suggestion(s).`;
  }
  if (rank > maxRank) {
    return `Expected ${expectedPath} to rank <= ${maxRank}, got rank ${rank}.`;
  }
  const matched = suggestions[rank - 1]?.matched_terms.length ?? 0;
  const minimum = testCase.expected.min_matched_terms ?? 0;
  if (matched < minimum) {
    return `Expected ${expectedPath} to have at least ${minimum} matched term(s), got ${matched}.`;
  }
  return `Expected ${expectedPath} did not satisfy the fixture assertion.`;
}

function suggestionBrief(suggestion: TaskLinkSuggestion): LinkSuggestionEvalCaseResult["suggestions"][number] {
  return {
    field: suggestion.field,
    path: suggestion.path,
    score: suggestion.score,
    matched_terms: suggestion.matched_terms,
    match_reasons: suggestion.match_reasons,
    evidence: suggestion.evidence,
  };
}

function rejectedCandidateBrief(candidate: TaskLinkRejectedCandidate): LinkSuggestionEvalCaseResult["rejected_candidates"][number] {
  return {
    field: candidate.field,
    path: candidate.path,
    reason: candidate.reason,
    matched_terms: candidate.matched_terms,
    match_reasons: candidate.match_reasons,
    evidence: candidate.evidence,
  };
}

export function defaultLinkSuggestionEvalCases(): LinkSuggestionEvalCase[] {
  const sharedCandidates: TaskLinkSuggestionCandidate[] = [
    {
      path: "src/metrics/quarterly-extract.ts",
      statuses: ["modified"],
      sources: ["fixture"],
      content: "export function extractQuarterlyMetrics() { return normalizeQuarterlyMetricRows(); }\n",
    },
    {
      path: "src/auth/password-entry.tsx",
      statuses: ["modified"],
      sources: ["fixture"],
      content: "export function PasswordEntryForm() { return credentialPasswordEntry(); }\n",
    },
    {
      path: "docs/local-development.md",
      statuses: ["untracked"],
      sources: ["fixture"],
      content: "Local development instructions mention changed files but not product features.\n",
    },
  ];

  return [
    {
      id: "exact-path-phrase",
      description: "Exact filename phrase evidence ranks above incidental content-only mentions.",
      task: task("EVAL-PASSWORD", "Password entry", {
        module: "auth",
        keywords: ["password", "credential"],
        spec: "Users enter their password through a credential form.",
      }),
      candidates: [
        { path: "src/password-entry.ts", statuses: ["modified"], sources: ["fixture"], content: "export const handler = true;\n" },
        { path: "src/copy.ts", statuses: ["modified"], sources: ["fixture"], content: "The password entry wording is mentioned in a comment.\n" },
      ],
      expected: { path: "src/password-entry.ts", field: "code", max_rank: 1 },
    },
    {
      id: "identifier-evidence",
      description: "Identifier evidence ranks above free-text content evidence.",
      task: task("EVAL-CREDENTIAL", "Credential password entry", {
        module: "auth",
        keywords: ["credential", "password"],
        spec: "The credential password entry handler controls the password form.",
      }),
      candidates: [
        { path: "src/form.ts", statuses: ["modified"], sources: ["fixture"], content: "export function credentialPasswordEntry() { return true; }\n" },
        { path: "src/comments.ts", statuses: ["modified"], sources: ["fixture"], content: "credential password entry appears in a comment only.\n" },
      ],
      expected: { path: "src/form.ts", field: "code", max_rank: 1 },
    },
    {
      id: "test-classification",
      description: "Matching test files classify as tests and can rank ahead of equivalent code files.",
      task: task("EVAL-METRICS", "Quarterly metrics extraction", {
        module: "metrics",
        keywords: ["quarterly", "metrics", "extraction"],
        spec: "Quarterly metrics extraction needs linked implementation and tests.",
      }),
      candidates: [
        { path: "src/quarterly-metrics.ts", statuses: ["modified"], sources: ["fixture"], content: "export const quarterlyMetrics = true;\n" },
        { path: "src/quarterly-metrics.test.ts", statuses: ["modified"], sources: ["fixture"], content: "export const quarterlyMetricsTest = true;\n" },
      ],
      expected: { path: "src/quarterly-metrics.test.ts", field: "tests", max_rank: 1 },
    },
    {
      id: "shared-candidates-quarterly-metrics",
      description: "Shared candidate pools can rank the metrics implementation first for a metrics heading.",
      task: task("EVAL-SHARED-METRICS", "Quarterly metrics extraction", {
        module: "metrics",
        keywords: ["quarterly", "metrics", "extraction"],
        spec: "Quarterly metrics extraction normalizes metric rows for reporting.",
      }),
      candidates: sharedCandidates,
      expected: { path: "src/metrics/quarterly-extract.ts", field: "code", max_rank: 1, min_matched_terms: 2 },
    },
    {
      id: "shared-candidates-password-entry",
      description: "The same shared candidate pool can rank the password implementation first for an auth heading.",
      task: task("EVAL-SHARED-PASSWORD", "Password entry form", {
        module: "auth",
        keywords: ["password", "credential", "entry"],
        spec: "Users enter credentials through the password entry form.",
      }),
      candidates: sharedCandidates,
      expected: { path: "src/auth/password-entry.tsx", field: "code", max_rank: 1, min_matched_terms: 2 },
    },
    {
      id: "generic-changed-file-rejected",
      description: "Changed-file status and generic path words do not create a recommendation by themselves.",
      task: task("EVAL-TRUST", "Agent trust verification", {
        module: "agent-workflow",
        keywords: ["verify", "evidence"],
        spec: "Verification records prove checks and acceptance criteria.",
      }),
      candidates: [{ path: "src/changed-file.ts", statuses: ["modified"], sources: ["fixture"] }],
      expected: { path: null, field: null, max_rank: null },
    },
  ];
}

export async function loadLinkSuggestionEvalFixture(filePath: string): Promise<LinkSuggestionEvalFixtureLoadResult> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    return { ok: false, message: `Could not read link eval fixture ${filePath}: ${errorMessage(error)}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: false, message: `Could not parse link eval fixture ${filePath} as JSON: ${errorMessage(error)}` };
  }

  const validation = parseFixture(parsed);
  if (!validation.ok) {
    return { ok: false, message: `Invalid link eval fixture ${filePath}: ${validation.message}` };
  }
  return validation;
}

function parseFixture(value: unknown): LinkSuggestionEvalFixtureLoadResult {
  if (!isRecord(value)) {
    return { ok: false, message: "fixture must be a JSON object." };
  }
  const suite = optionalString(value.suite) ?? "file";
  const sharedCandidates = parseCandidates(value.shared_candidates, "shared_candidates");
  if (!sharedCandidates.ok) {
    return sharedCandidates;
  }
  if (!Array.isArray(value.cases) || value.cases.length === 0) {
    return { ok: false, message: "cases must be a non-empty array." };
  }

  const cases: LinkSuggestionEvalCase[] = [];
  const ids = new Set<string>();
  for (const [index, fixtureCase] of value.cases.entries()) {
    const parsed = parseFixtureCase(fixtureCase, index, sharedCandidates.candidates);
    if (!parsed.ok) {
      return parsed;
    }
    if (ids.has(parsed.testCase.id)) {
      return { ok: false, message: `cases[${index}].id duplicates ${parsed.testCase.id}.` };
    }
    ids.add(parsed.testCase.id);
    cases.push(parsed.testCase);
  }

  return { ok: true, suite, cases };
}

function parseFixtureCase(
  value: unknown,
  index: number,
  sharedCandidates: TaskLinkSuggestionCandidate[],
): { ok: true; testCase: LinkSuggestionEvalCase } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: `cases[${index}] must be an object.` };
  }
  const id = requiredString(value.id, `cases[${index}].id`);
  if (!id.ok) {
    return id;
  }
  const taskResult = parseFixtureTask(value.task, index);
  if (!taskResult.ok) {
    return taskResult;
  }
  const candidates = parseCandidates(value.candidates, `cases[${index}].candidates`);
  if (!candidates.ok) {
    return candidates;
  }
  const expected = parseExpected(value.expected, index);
  if (!expected.ok) {
    return expected;
  }
  return {
    ok: true,
    testCase: {
      id: id.value,
      description: optionalString(value.description) ?? id.value,
      task: taskResult.task,
      candidates: [...sharedCandidates, ...candidates.candidates],
      expected: expected.expected,
    },
  };
}

function parseFixtureTask(value: unknown, index: number): { ok: true; task: JumpTask } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: `cases[${index}].task must be an object.` };
  }
  const id = requiredString(value.id, `cases[${index}].task.id`);
  const title = requiredString(value.title, `cases[${index}].task.title`);
  const spec = requiredString(value.spec, `cases[${index}].task.spec`);
  if (!id.ok) return id;
  if (!title.ok) return title;
  if (!spec.ok) return spec;

  return {
    ok: true,
    task: {
      id: id.value,
      title: title.value,
      type: enumValue(value.type, ["spec", "engineering", "hotfix", "adr"] as const, "spec"),
      status: enumValue(value.status, ["draft", "proposed", "approved", "partial", "implemented", "verified", "stale"] as const, "approved"),
      module: optionalString(value.module),
      space: enumValue(value.space, ["repo", "module", "global"] as const, "repo"),
      keywords: stringArray(value.keywords),
      doc: {
        path: optionalString(value.doc_path) ?? "fixtures/link-eval.json",
        heading: title.value,
      },
      spec: spec.value,
      code: stringArray(value.code),
      tests: stringArray(value.tests),
      gaps: stringArray(value.gaps),
      depends_on: stringArray(value.depends_on),
      refs: [],
    },
  };
}

function parseCandidates(value: unknown, field: string): { ok: true; candidates: TaskLinkSuggestionCandidate[] } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true, candidates: [] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, message: `${field} must be an array when provided.` };
  }
  const candidates: TaskLinkSuggestionCandidate[] = [];
  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate)) {
      return { ok: false, message: `${field}[${index}] must be an object.` };
    }
    const path = requiredString(candidate.path, `${field}[${index}].path`);
    if (!path.ok) {
      return path;
    }
    candidates.push({
      path: path.value,
      statuses: stringArray(candidate.statuses),
      sources: stringArray(candidate.sources),
      content: optionalString(candidate.content),
    });
  }
  return { ok: true, candidates };
}

function parseExpected(value: unknown, index: number): { ok: true; expected: LinkSuggestionEvalExpected } | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: `cases[${index}].expected must be an object.` };
  }
  let expectedPath: string | null;
  if (value.path === null) {
    expectedPath = null;
  } else {
    const path = requiredString(value.path, `cases[${index}].expected.path`);
    if (!path.ok) {
      return path;
    }
    expectedPath = path.value;
  }
  let field: "code" | "tests" | null;
  if (value.field === null) {
    field = null;
  } else if (value.field === "code" || value.field === "tests") {
    field = value.field;
  } else {
    return { ok: false, message: `cases[${index}].expected.field must be "code", "tests", or null.` };
  }
  return {
    ok: true,
    expected: {
      path: expectedPath,
      field,
      max_rank: numberOrNull(value.max_rank, expectedPath === null ? null : 1),
      min_matched_terms: optionalNumber(value.min_matched_terms),
    },
  };
}

function requiredString(value: unknown, field: string): { ok: true; value: string } | { ok: false; message: string } {
  return typeof value === "string" && value.trim().length > 0
    ? { ok: true, value }
    : { ok: false, message: `${field} must be a non-empty string.` };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T;
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T | null): T | null;
function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T | null): T | null {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function numberOrNull(value: unknown, fallback: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function task(id: string, title: string, options: { module: string; keywords: string[]; spec: string }): JumpTask {
  return {
    id,
    title,
    type: "spec",
    status: "approved",
    module: options.module,
    space: "repo",
    keywords: options.keywords,
    doc: {
      path: "docs/eval.md",
      heading: title,
    },
    spec: options.spec,
    code: [],
    tests: [],
    gaps: [],
    depends_on: [],
    refs: [],
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(3));
}
