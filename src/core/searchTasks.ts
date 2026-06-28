import chalk from "chalk";
import { filterTasks, type TaskFilterOptions } from "./filterTasks.js";
import type { JumpIndex, JumpTask } from "./types.js";

export type TaskSearchResult = {
  task: JumpTask;
  score: number;
  matchedFields: string[];
  matchedTerms: string[];
  unmatchedTerms: string[];
};

export type SearchMode = "all" | "any";

export type SearchOptions = TaskFilterOptions & {
  mode?: SearchMode;
};

type SearchField = {
  name: string;
  value: string;
  weight: number;
};

export function findTasks(index: JumpIndex, query: string, filters: SearchOptions = {}): TaskSearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }

  return filterTasks(index, filters)
    .flatMap((task) => {
      const scored = scoreTask(task, terms, filters.mode ?? "all");
      return scored ? [scored] : [];
    })
    .sort((left, right) => right.score - left.score || left.task.id.localeCompare(right.task.id));
}

export function formatSearchResults(results: TaskSearchResult[]): string {
  if (results.length === 0) {
    return chalk.dim("No matching tasks found.");
  }

  const showModule = results.some(({ task }) => Boolean(task.module));
  const showSpace = results.some(({ task }) => Boolean(task.space));
  const headers = [
    "ID",
    "STATUS",
    "TYPE",
    ...(showModule ? ["MODULE"] : []),
    ...(showSpace ? ["SPACE"] : []),
    "MATCHES",
    "TITLE",
  ];
  const rows = results.map(({ task, matchedFields }) => [
    task.id,
    task.status,
    task.type,
    ...(showModule ? [task.module ?? ""] : []),
    ...(showSpace ? [task.space ?? ""] : []),
    matchedFields.join(","),
    task.title,
  ]);
  const widths = headers.map((header, index) => {
    const maxValue = Math.max(header.length, ...rows.map((row) => row[index].length));
    return index === headers.length - 1 ? maxValue : maxValue + 2;
  });

  const formatRow = (row: string[]) =>
    row.map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index]))).join("");

  return [formatRow(headers), ...rows.map(formatRow)].join("\n");
}

function scoreTask(task: JumpTask, terms: string[], mode: SearchMode): TaskSearchResult | undefined {
  const fields = searchFields(task);
  const matchedFields = new Set<string>();
  const matchedTerms = new Set<string>();
  const unmatchedTerms = new Set<string>();
  let score = 0;

  for (const term of terms) {
    let termMatched = false;

    for (const field of fields) {
      if (!normalize(field.value).includes(term)) {
        continue;
      }

      matchedFields.add(field.name);
      score += field.weight;
      termMatched = true;
    }

    if (!termMatched) {
      unmatchedTerms.add(term);
      if (mode === "all") {
        return undefined;
      }
    } else {
      matchedTerms.add(term);
    }
  }

  if (mode === "any" && matchedTerms.size === 0) {
    return undefined;
  }

  const normalizedQuery = terms.join(" ");
  if (normalize(task.id) === normalizedQuery) {
    score += 100;
  }
  if (normalize(task.title) === normalizedQuery) {
    score += 50;
  }

  return {
    task,
    score,
    matchedFields: [...matchedFields].sort(),
    matchedTerms: [...matchedTerms].sort(),
    unmatchedTerms: [...unmatchedTerms].sort(),
  };
}

function searchFields(task: JumpTask): SearchField[] {
  return [
    { name: "id", value: task.id, weight: 40 },
    { name: "title", value: task.title, weight: 35 },
    { name: "module", value: task.module ?? "", weight: 25 },
    { name: "keywords", value: (task.keywords ?? []).join(" "), weight: 25 },
    { name: "status", value: task.status, weight: 10 },
    { name: "type", value: task.type, weight: 10 },
    { name: "space", value: task.space ?? "", weight: 10 },
    { name: "spec", value: task.spec, weight: 8 },
    { name: "doc", value: `${task.doc.path} ${task.doc.heading}`, weight: 8 },
    { name: "code", value: task.code.join(" "), weight: 8 },
    { name: "tests", value: task.tests.join(" "), weight: 8 },
    { name: "depends_on", value: task.depends_on.join(" "), weight: 6 },
    {
      name: "refs",
      value: (task.refs ?? []).map((ref) => `${ref.type} ${ref.id} ${ref.note ?? ""}`).join(" "),
      weight: 6,
    },
    {
      name: "sources",
      value: (task.sources ?? []).map((source) => Object.values(source).join(" ")).join(" "),
      weight: 4,
    },
    { name: "external", value: task.external ? JSON.stringify(task.external) : "", weight: 2 },
  ];
}

export function tokenize(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function normalize(value: string): string {
  return value.toLowerCase();
}
