import { findTasks, tokenize, type TaskSearchResult } from "./searchTasks.js";
import {
  searchSemanticIndex,
  type SemanticConnectedTask,
  type SemanticGraphPath,
  type SemanticIndex,
  type SemanticIndexStatus,
  type SemanticSearchResult,
} from "./semanticIndex.js";
import type { JumpIndex, JumpTask } from "./types.js";

export type AskEvidence = {
  task_id: string;
  title: string;
  status: string;
  path: string;
  heading: string;
  match_reasons: string[];
  matched_terms: string[];
  semantic_terms: string[];
  graph_expansion: SemanticGraphPath[];
  connected_tasks: SemanticConnectedTask[];
  retrieval_sources: Array<"lexical" | "semantic">;
  scores: {
    combined: number;
    lexical?: number;
    semantic?: number;
  };
  linked_code: string[];
  linked_tests: string[];
  excerpt: string;
};

export type AskSummary = {
  question: string;
  retrieval_mode: "any" | "hybrid";
  terms: string[];
  coverage: {
    matched_terms: string[];
    unanswered_terms: string[];
    matched: number;
    total: number;
  };
  unanswered_terms: string[];
  retrieval: {
    lexical: {
      mode: "any";
      results: number;
    };
    semantic: {
      enabled: boolean;
      ready: boolean;
      used: boolean;
      path?: string;
      backend?: string;
      degraded?: boolean;
      issues: string[];
      results: number;
    };
  };
  evidence: AskEvidence[];
  weak_evidence: boolean;
};

const stopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "should",
  "the",
  "their",
  "there",
  "this",
  "to",
  "user",
  "users",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
  "would",
]);

export type AskSemanticOptions = {
  status: SemanticIndexStatus;
  index?: SemanticIndex;
};

export async function summarizeQuestionEvidence(
  index: JumpIndex,
  question: string,
  options: { limit?: number; semantic?: AskSemanticOptions } = {},
): Promise<AskSummary> {
  const terms = evidenceTerms(question);
  const results = terms.length === 0 ? [] : findTasks(index, terms.join(" "), { mode: "any" });
  const semanticResults =
    terms.length > 0 && options.semantic?.status.ready && options.semantic.index
      ? await searchSemanticIndex(options.semantic.index, question, { limit: options.limit ?? 8 })
      : [];
  const limited = mergeRetrievalResults(index, results, semanticResults, options.limit ?? 8);
  const matchedTerms = unique(limited.flatMap((result) => result.matchedTerms));
  const unansweredTerms = terms.filter((term) => !matchedTerms.some((matched) => termsEquivalent(term, matched)));
  const semanticStatus = options.semantic?.status;

  return {
    question,
    retrieval_mode: semanticStatus?.ready ? "hybrid" : "any",
    terms,
    coverage: {
      matched_terms: matchedTerms,
      unanswered_terms: unansweredTerms,
      matched: matchedTerms.length,
      total: terms.length,
    },
    unanswered_terms: unansweredTerms,
    retrieval: {
      lexical: {
        mode: "any",
        results: results.length,
      },
      semantic: {
        enabled: Boolean(semanticStatus?.enabled),
        ready: Boolean(semanticStatus?.ready),
        used: semanticResults.length > 0,
        path: semanticStatus?.path,
        backend: semanticStatus?.index?.backend.active,
        degraded: semanticStatus?.index?.backend.degraded,
        issues: semanticStatus?.issues.map((issue) => issue.code) ?? [],
        results: semanticResults.length,
      },
    },
    evidence: limited.map(resultToEvidence),
    weak_evidence: limited.length === 0 || unansweredTerms.length > matchedTerms.length,
  };
}

export function renderAskSummary(summary: AskSummary): string {
  const lines = [
    "# Jumpspace Evidence Summary",
    "",
    `Question: ${summary.question}`,
    `Coverage: ${summary.coverage.matched}/${summary.coverage.total}`,
    `Matched terms: ${summary.coverage.matched_terms.length ? summary.coverage.matched_terms.join(", ") : "None"}`,
    `Unanswered terms: ${summary.coverage.unanswered_terms.length ? summary.coverage.unanswered_terms.join(", ") : "None"}`,
    "",
  ];

  if (summary.weak_evidence) {
    lines.push("Evidence is weak. Treat this as source discovery, not an answer.", "");
  }

  if (summary.evidence.length === 0) {
    lines.push("No matching Jumpspace evidence found.");
    return lines.join("\n");
  }

  lines.push(
    "## Evidence",
    "",
    ...summary.evidence.flatMap((item) => [
      `- ${item.task_id} ${item.title} (${item.status})`,
      `  Path: ${item.path}`,
      `  Retrieval: ${item.retrieval_sources.join(", ")}`,
      `  Score: ${item.scores.combined}`,
      `  Match reasons: ${item.match_reasons.join(", ")}`,
      `  Matched terms: ${item.matched_terms.join(", ")}`,
      `  Semantic terms: ${item.semantic_terms.length ? item.semantic_terms.join(", ") : "None"}`,
      `  Graph paths: ${item.graph_expansion.length ? item.graph_expansion.map(formatGraphPath).join("; ") : "None"}`,
      `  Code: ${item.linked_code.length ? item.linked_code.join(", ") : "None"}`,
      `  Tests: ${item.linked_tests.length ? item.linked_tests.join(", ") : "None"}`,
      `  Excerpt: ${item.excerpt || "None"}`,
    ]),
  );

  return lines.join("\n");
}

type HybridResult = {
  task: JumpTask;
  combinedScore: number;
  lexicalScore?: number;
  semanticScore?: number;
  matchedFields: string[];
  matchedTerms: string[];
  unmatchedTerms: string[];
  semanticTerms: string[];
  graphExpansion: SemanticGraphPath[];
  connectedTasks: SemanticConnectedTask[];
  retrievalSources: Array<"lexical" | "semantic">;
};

function mergeRetrievalResults(
  index: JumpIndex,
  lexicalResults: TaskSearchResult[],
  semanticResults: SemanticSearchResult[],
  limit: number,
): HybridResult[] {
  const tasksById = new Map(index.tasks.map((task) => [task.id, task]));
  const maxLexicalScore = Math.max(1, ...lexicalResults.map((result) => result.score));
  const byTask = new Map<string, HybridResult>();

  for (const result of lexicalResults) {
    byTask.set(result.task.id, {
      task: result.task,
      combinedScore: round((result.score / maxLexicalScore) * 0.65),
      lexicalScore: result.score,
      matchedFields: result.matchedFields,
      matchedTerms: result.matchedTerms,
      unmatchedTerms: result.unmatchedTerms,
      semanticTerms: [],
      graphExpansion: [],
      connectedTasks: [],
      retrievalSources: ["lexical"],
    });
  }

  for (const result of semanticResults) {
    const task = tasksById.get(result.task_id);
    if (!task) {
      continue;
    }

    const existing = byTask.get(result.task_id);
    if (existing) {
      existing.combinedScore = round(existing.combinedScore + result.score * 0.35);
      existing.semanticScore = result.score;
      existing.matchedFields = unique([...existing.matchedFields, ...result.match_reasons]);
      existing.matchedTerms = unique([...existing.matchedTerms, ...result.matched_terms]);
      existing.semanticTerms = unique([...existing.semanticTerms, ...result.semantic_terms]);
      existing.graphExpansion = uniqueGraphPaths([...existing.graphExpansion, ...result.graph_expansion]);
      existing.connectedTasks = uniqueConnectedTasks([...existing.connectedTasks, ...result.connected_tasks]);
      existing.retrievalSources = unique([...existing.retrievalSources, "semantic"]) as Array<"lexical" | "semantic">;
    } else {
      byTask.set(result.task_id, {
        task,
        combinedScore: round(result.score * 0.35),
        semanticScore: result.score,
        matchedFields: result.match_reasons,
        matchedTerms: result.matched_terms,
        unmatchedTerms: [],
        semanticTerms: result.semantic_terms,
        graphExpansion: result.graph_expansion,
        connectedTasks: result.connected_tasks,
        retrievalSources: ["semantic"],
      });
    }
  }

  return [...byTask.values()]
    .sort((left, right) => right.combinedScore - left.combinedScore || left.task.id.localeCompare(right.task.id))
    .slice(0, limit);
}

function resultToEvidence(result: HybridResult): AskEvidence {
  return {
    task_id: result.task.id,
    title: result.task.title,
    status: result.task.status,
    path: result.task.doc.path,
    heading: result.task.doc.heading,
    match_reasons: result.matchedFields,
    matched_terms: result.matchedTerms,
    semantic_terms: result.semanticTerms,
    graph_expansion: result.graphExpansion,
    connected_tasks: result.connectedTasks,
    retrieval_sources: result.retrievalSources,
    scores: {
      combined: result.combinedScore,
      lexical: result.lexicalScore,
      semantic: result.semanticScore,
    },
    linked_code: result.task.code,
    linked_tests: result.task.tests,
    excerpt: excerpt(result.task.spec),
  };
}

function evidenceTerms(question: string): string[] {
  const terms = tokenize(question)
    .map((term) => term.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((term) => term.length >= 3 && !stopwords.has(term));
  return unique(terms);
}

function excerpt(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueGraphPaths(paths: SemanticGraphPath[]): SemanticGraphPath[] {
  const seen = new Set<string>();
  return paths.filter((path) => {
    const key = [path.kind, path.from, path.to, path.ref_type, path.field, path.value, path.via.join(">")].join("\0");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueConnectedTasks(tasks: SemanticConnectedTask[]): SemanticConnectedTask[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = [task.task_id, task.relation, task.via.join(">")].join("\0");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function formatGraphPath(path: SemanticGraphPath): string {
  const detail = path.ref_type ?? path.value;
  return `${path.kind}${detail ? `(${detail})` : ""}:${path.via.join(" -> ")}`;
}

function termsEquivalent(left: string, right: string): boolean {
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
