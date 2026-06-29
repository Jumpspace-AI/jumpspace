import fs from "node:fs/promises";
import { loadConfig, readIndex } from "../core/config.js";
import { getChangedFiles, getWorkingTreeChangedFiles } from "../core/changed.js";
import { commandError, errorEnvelope, type JsonCommandError } from "../core/errors.js";
import { recordMutation } from "../core/mutations.js";
import { refreshIndex } from "../core/refreshIndex.js";
import { resolveRepoPath } from "../core/config.js";
import { evaluateLinkSuggestionRanking, loadLinkSuggestionEvalFixture, type LinkSuggestionEvalReport } from "../core/taskLinkEval.js";
import {
  applyTaskLinkUpdate,
  parseTaskRef,
  planTaskLinkUpdate,
  suggestTaskLinks,
  type TaskLinkOperation,
  type TaskLinkRejectedCandidate,
  type TaskLinkSuggestion,
  type TaskLinkSuggestionCandidate,
} from "../core/taskLinks.js";
import type { JumpTaskRef } from "../core/types.js";

const MAX_SUGGESTION_CONTENT_BYTES = 64 * 1024;

export type LinkUpdateOptions = {
  root?: string;
  dryRun?: boolean;
  code?: string[];
  test?: string[];
  dependsOn?: string[];
  ref?: string[];
  gap?: string[];
  removeCode?: string[];
  removeTest?: string[];
  removeDependsOn?: string[];
  removeRef?: string[];
  removeGap?: string[];
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type LinkUpdateResult = {
  ok: true;
  task_id: string;
  dry_run: boolean;
  applied: boolean;
  changed: boolean;
  operations: TaskLinkOperation[];
  touched_files: string[];
};

export type LinkSuggestOptions = {
  root?: string;
  since?: string;
  path?: string[];
  limit?: number;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type LinkSuggestResult = {
  ok: true;
  task_id: string;
  since: string | null;
  suggestions: TaskLinkSuggestion[];
  rejected_candidates: TaskLinkRejectedCandidate[];
  candidates_considered: number;
  mutated: false;
};

export type LinkEvalOptions = {
  root?: string;
  file?: string;
  limit?: number;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runLinkUpdate(id: string, options: LinkUpdateOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);
  if (!task) {
    return writeError(
      options,
      commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`, { taskId: id }),
    );
  }

  const parsedRefs = parseRefs([...(options.ref ?? []), ...(options.removeRef ?? [])]);
  if (!parsedRefs.ok) {
    return writeError(options, parsedRefs.errors);
  }
  const addRefs = parsedRefs.refs.slice(0, options.ref?.length ?? 0);
  const removeRefs = parsedRefs.refs.slice(options.ref?.length ?? 0);

  const plan = await planTaskLinkUpdate(root, index, id, {
    add: {
      code: options.code,
      tests: options.test,
      depends_on: options.dependsOn,
      refs: addRefs,
      gaps: options.gap,
    },
    remove: {
      code: options.removeCode,
      tests: options.removeTest,
      depends_on: options.removeDependsOn,
      refs: removeRefs,
      gaps: options.removeGap,
    },
  });

  if (!plan.ok) {
    return writeError(options, plan.errors);
  }

  let touchedFiles: string[] = [];
  const dryRun = Boolean(options.dryRun);
  if (plan.changed && !dryRun) {
    await applyTaskLinkUpdate(root, task, plan);
    await refreshIndex(root);
    const config = await loadConfig(root);
    touchedFiles = [task.doc.path, config.indexPath];
    await recordMutation(root, {
      command: "link update",
      touched_files: touchedFiles,
      task_ids: [id],
      index_changed: true,
    });
  }

  const result: LinkUpdateResult = {
    ok: true,
    task_id: id,
    dry_run: dryRun,
    applied: plan.changed && !dryRun,
    changed: plan.changed,
    operations: plan.operations,
    touched_files: touchedFiles,
  };

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderLinkUpdate(result));
  return 0;
}

export async function runLinkSuggest(id: string, options: LinkSuggestOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const task = index.tasks.find((candidate) => candidate.id === id);
  if (!task) {
    return writeError(
      options,
      commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace find <query>\` to locate it.`, { taskId: id }),
    );
  }
  const candidates = new Map<string, TaskLinkSuggestionCandidate>();
  for (const repoPath of options.path ?? []) {
    mergeCandidate(candidates, {
      path: repoPath,
      statuses: ["candidate"],
      sources: ["argument"],
    });
  }

  if (options.since) {
    const changed = await getChangedFiles(root, options.since);
    if (!changed.ok) {
      return writeError(options, changed.errors);
    }
    for (const file of changed.files) {
      mergeCandidate(candidates, {
        path: file.path,
        statuses: file.statuses,
        sources: file.sources,
      });
    }
  } else if (!options.path || options.path.length === 0) {
    const changed = await getWorkingTreeChangedFiles(root);
    if (!changed.ok) {
      return writeError(options, changed.errors);
    }
    for (const file of changed.files) {
      mergeCandidate(candidates, {
        path: file.path,
        statuses: file.statuses,
        sources: file.sources,
      });
    }
  }

  const enrichedCandidates = await Promise.all([...candidates.values()].map((candidate) => readCandidateContent(root, candidate)));
  const report = suggestTaskLinks(task, enrichedCandidates, { limit: options.limit });
  const result: LinkSuggestResult = {
    ok: true,
    task_id: id,
    since: options.since ?? null,
    suggestions: report.suggestions,
    rejected_candidates: report.rejected_candidates,
    candidates_considered: report.candidates_considered,
    mutated: false,
  };

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderLinkSuggest(result));
  return 0;
}

export async function runLinkEval(options: LinkEvalOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  let result: LinkSuggestionEvalReport;
  if (options.file) {
    const fixturePath = resolveRepoPath(root, options.file);
    const loaded = await loadLinkSuggestionEvalFixture(fixturePath);
    if (!loaded.ok) {
      return writeError(options, commandError("INVALID_LINK_EVAL_FIXTURE", loaded.message, { path: options.file }));
    }
    result = evaluateLinkSuggestionRanking({ limit: options.limit, cases: loaded.cases, suite: loaded.suite, fixturePath: options.file });
  } else {
    result = evaluateLinkSuggestionRanking({ limit: options.limit });
  }
  writeLine(options.json ? JSON.stringify(result, null, 2) : renderLinkEval(result));
  return 0;
}

function parseRefs(values: string[]): { ok: true; refs: JumpTaskRef[] } | { ok: false; errors: JsonCommandError[] } {
  const refs: JumpTaskRef[] = [];
  const errors: JsonCommandError[] = [];
  for (const value of values) {
    const parsed = parseTaskRef(value);
    if ("ok" in parsed) {
      errors.push(parsed.error);
    } else {
      refs.push(parsed);
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, refs };
}

function mergeCandidate(candidates: Map<string, TaskLinkSuggestionCandidate>, candidate: TaskLinkSuggestionCandidate): void {
  const existing = candidates.get(candidate.path);
  if (!existing) {
    candidates.set(candidate.path, {
      path: candidate.path,
      statuses: unique(candidate.statuses ?? []),
      sources: unique(candidate.sources ?? []),
    });
    return;
  }
  existing.statuses = unique([...(existing.statuses ?? []), ...(candidate.statuses ?? [])]);
  existing.sources = unique([...(existing.sources ?? []), ...(candidate.sources ?? [])]);
}

async function readCandidateContent(root: string, candidate: TaskLinkSuggestionCandidate): Promise<TaskLinkSuggestionCandidate> {
  try {
    const absolutePath = resolveRepoPath(root, candidate.path);
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile() || stats.size > MAX_SUGGESTION_CONTENT_BYTES) {
      return candidate;
    }
    const buffer = await fs.readFile(absolutePath);
    if (buffer.includes(0)) {
      return candidate;
    }
    return {
      ...candidate,
      content: buffer.toString("utf8"),
    };
  } catch {
    return candidate;
  }
}

function renderLinkUpdate(result: LinkUpdateResult): string {
  return [
    "# Jumpspace Link Update",
    "",
    `Task: ${result.task_id}`,
    `Dry run: ${result.dry_run ? "yes" : "no"}`,
    `Applied: ${result.applied ? "yes" : "no"}`,
    `Changed: ${result.changed ? "yes" : "no"}`,
    "",
    "## Operations",
    result.operations.length === 0
      ? "- None"
      : result.operations
          .map((operation) => `- ${operation.action} ${operation.field} ${operation.value}: ${operation.reason}`)
          .join("\n"),
    "",
    "## Touched Files",
    result.touched_files.length === 0 ? "- None" : result.touched_files.map((file) => `- ${file}`).join("\n"),
  ].join("\n");
}

function renderLinkSuggest(result: LinkSuggestResult): string {
  return [
    "# Jumpspace Link Suggestions",
    "",
    `Task: ${result.task_id}`,
    `Since: ${result.since ?? "n/a"}`,
    `Candidates considered: ${result.candidates_considered}`,
    "",
    "## Suggestions",
    result.suggestions.length === 0
      ? "- None"
      : result.suggestions
          .map((suggestion) => `- ${suggestion.field}: ${suggestion.path} (score ${suggestion.score}; ${suggestion.match_reasons.join(", ")})`)
          .join("\n"),
    "",
    "## Rejected Candidates",
    result.rejected_candidates.length === 0
      ? "- None"
      : result.rejected_candidates
          .map((candidate) => `- ${candidate.field}: ${candidate.path} (${candidate.reason})`)
          .join("\n"),
  ].join("\n");
}

function renderLinkEval(result: LinkSuggestionEvalReport): string {
  return [
    "# Jumpspace Link Suggestion Eval",
    "",
    `Suite: ${result.suite}`,
    `Fixture: ${result.fixture_path ?? "built-in"}`,
    `Cases: ${result.case_count}`,
    `Passed: ${result.summary.passed}`,
    `Failed: ${result.summary.failed}`,
    `Top-1 accuracy: ${result.summary.top1_accuracy}`,
    `MRR: ${result.summary.mean_reciprocal_rank}`,
    "",
    "## Cases",
    result.cases
      .map((testCase) =>
        [
          `- ${testCase.passed ? "PASS" : "FAIL"} ${testCase.id}`,
          `  Expected: ${testCase.expected.path ?? "no suggestion"}${testCase.expected.field ? ` (${testCase.expected.field})` : ""}`,
          `  Rank: ${testCase.rank ?? "n/a"}`,
          `  Top: ${testCase.top ? `${testCase.top.path} (${testCase.top.field}, score ${testCase.top.score})` : "none"}`,
          testCase.failure_reason ? `  Reason: ${testCase.failure_reason}` : null,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      )
      .join("\n"),
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

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
