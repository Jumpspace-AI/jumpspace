import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { auditJumpspace, type AuditResult } from "../commands/audit.js";
import { getChangedFiles, type ChangedFile } from "./changed.js";
import { loadConfig, pathExists, resolveRepoPath, writeIndex } from "./config.js";
import { createDoctorReport, type DoctorReport } from "./doctor.js";
import { detectDrift, type DriftResult } from "./drift.js";
import { errorEnvelope, type JsonCommandError } from "./errors.js";
import { runGraphQuery, type GraphQueryInput, type GraphQueryReport } from "./graphQuery.js";
import { indexTasks } from "./indexTasks.js";
import { readLastMutation } from "./mutations.js";
import { planDriftRepair, type DriftRepairReport } from "./repair.js";
import { suggestTaskLinks, type TaskLinkRejectedCandidate, type TaskLinkSuggestion, type TaskLinkSuggestionCandidate } from "./taskLinks.js";
import type { JumpConfig, JumpIndex, JumpTask, JumpTaskMetadata } from "./types.js";

const MAX_SUGGESTION_CONTENT_BYTES = 64 * 1024;

export type CiTaskBlockCandidateMatch = {
  path: string;
  score: number;
  match_reasons: string[];
  matched_terms: string[];
  evidence: TaskLinkSuggestion["evidence"];
  sources: string[];
  statuses: string[];
};

export type CiTaskBlockRejectedCandidate = {
  path: string;
  field: "code" | "tests";
  reason: TaskLinkRejectedCandidate["reason"];
  match_reasons: string[];
  matched_terms: string[];
  evidence: TaskLinkRejectedCandidate["evidence"];
  sources: string[];
  statuses: string[];
};

export type CiTaskBlockSuggestion = {
  type: "task_block";
  id: string;
  path: string;
  heading: string;
  line: number;
  reason: string;
  linked_code_candidates: string[];
  linked_test_candidates: string[];
  linked_code_candidate_matches: CiTaskBlockCandidateMatch[];
  linked_test_candidate_matches: CiTaskBlockCandidateMatch[];
  rejected_candidate_matches: CiTaskBlockRejectedCandidate[];
  block: string;
};

export type CiGraphQueryResult = {
  name: string;
  result: GraphQueryReport;
};

export type CiReport = {
  ok: boolean;
  since: string;
  scan: {
    indexed_tasks: number;
    index_path: string;
  };
  changed: ChangedFile[];
  audit: AuditResult & {
    errors: AuditResult["issues"];
    warnings: AuditResult["issues"];
  };
  doctor: DoctorReport;
  drift: Extract<DriftResult, { ok: true }>;
  repair: DriftRepairReport;
  graph_queries: CiGraphQueryResult[];
  suggestions: {
    task_blocks: CiTaskBlockSuggestion[];
    repair: {
      mechanical_fixes: DriftRepairReport["mechanical_fixes"];
      gaps: DriftRepairReport["gaps"];
    };
  };
  summary: {
    blocking_errors: number;
    warnings: number;
    changed_files: number;
    suggested_task_blocks: number;
    repair_fixes: number;
    repair_gaps: number;
    graph_query_results: number;
  };
  pr_comment: string;
};

export type CiResult =
  | {
      ok: true;
      report: CiReport;
    }
  | {
      ok: false;
      errors: JsonCommandError[];
    };

export type BuildCiReportOptions = {
  root: string;
  since: string;
  graphQueries?: Array<{ name: string; query: GraphQueryInput }>;
};

export async function buildCiReport(options: BuildCiReportOptions): Promise<CiResult> {
  const config = await loadConfig(options.root);
  const scanned = await scanForCi(options.root, config);
  const changed = await getChangedFiles(options.root, options.since);
  if (!changed.ok) {
    return changed;
  }

  const drift = await detectDrift(options.root, options.since);
  if (!drift.ok) {
    return drift;
  }

  const repair = await planDriftRepair(options.root, options.since);
  if (!repair.ok) {
    return repair;
  }

  const audit = await auditJumpspace(options.root);
  const lastMutation = await readLastMutation(options.root);
  const doctor = await createDoctorReport(options.root, audit.issues, config, lastMutation, { since: options.since });
  const graphQueries = runCiGraphQueries(scanned.index, options.graphQueries ?? defaultGraphQueries());
  const taskBlocks = await suggestTaskBlocks(options.root, changed.files);
  const errors = audit.issues.filter((issue) => issue.severity === "error");
  const warnings = audit.issues.filter((issue) => issue.severity === "warning");
  const reportWithoutComment = {
    ok: audit.ok,
    since: options.since,
    scan: {
      indexed_tasks: scanned.index.tasks.length,
      index_path: config.indexPath,
    },
    changed: changed.files,
    audit: {
      ...audit,
      errors,
      warnings,
    },
    doctor,
    drift,
    repair,
    graph_queries: graphQueries,
    suggestions: {
      task_blocks: taskBlocks,
      repair: {
        mechanical_fixes: repair.mechanical_fixes,
        gaps: repair.gaps,
      },
    },
    summary: {
      blocking_errors: errors.length,
      warnings: warnings.length + doctor.warnings.length + drift.warnings.length + repair.warnings.length,
      changed_files: changed.files.length,
      suggested_task_blocks: taskBlocks.length,
      repair_fixes: repair.mechanical_fixes.length,
      repair_gaps: repair.gaps.length,
      graph_query_results: graphQueries.reduce((total, query) => total + query.result.results.length, 0),
    },
  };

  const report: CiReport = {
    ...reportWithoutComment,
    pr_comment: renderCiReport(reportWithoutComment),
  };

  return {
    ok: true,
    report,
  };
}

export function renderCiReport(report: Omit<CiReport, "pr_comment">): string {
  return [
    "# Jumpspace CI Report",
    "",
    `Since: ${report.since}`,
    `Status: ${report.ok ? "ok" : "blocked"}`,
    "",
    "## Summary",
    `- Changed files: ${report.summary.changed_files}`,
    `- Audit errors: ${report.summary.blocking_errors}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Suggested task blocks: ${report.summary.suggested_task_blocks}`,
    `- Repair fixes: ${report.summary.repair_fixes}`,
    `- Repair gaps: ${report.summary.repair_gaps}`,
    `- Graph query matches: ${report.summary.graph_query_results}`,
    "",
    "## Repair Suggestions",
    renderRepairSuggestions(report),
    "",
    "## Suggested Task Blocks",
    renderTaskBlockSuggestions(report.suggestions.task_blocks),
    "",
    "## Graph Queries",
    renderGraphQueries(report.graph_queries),
  ].join("\n");
}

async function scanForCi(root: string, config: JumpConfig): Promise<{ index: JumpIndex }> {
  const indexed = await indexTasks(root, config);
  await writeIndex(root, indexed.index, config.indexPath);
  return {
    index: indexed.index,
  };
}

function runCiGraphQueries(index: JumpIndex, queries: Array<{ name: string; query: GraphQueryInput }>): CiGraphQueryResult[] {
  return queries.flatMap((query) => {
    const result = runGraphQuery(index, query.query);
    if (!result.ok) {
      return [];
    }
    return [
      {
        name: query.name,
        result,
      },
    ];
  });
}

function defaultGraphQueries(): Array<{ name: string; query: GraphQueryInput }> {
  return [
    {
      name: "approved_or_partial_without_tests",
      query: {
        statuses: ["approved", "partial"],
        testPresence: "none",
      },
    },
    {
      name: "tasks_with_gaps",
      query: {
        gapPresence: "any",
      },
    },
  ];
}

async function suggestTaskBlocks(root: string, changedFiles: ChangedFile[]): Promise<CiTaskBlockSuggestion[]> {
  const linkCandidates = await readLinkSuggestionCandidates(root, changedFiles);
  const suggestions: CiTaskBlockSuggestion[] = [];

  for (const file of changedFiles) {
    if (!isMarkdownPath(file.path) || file.statuses.includes("deleted")) {
      continue;
    }
    const absolutePath = resolveRepoPath(root, file.path);
    if (!(await pathExists(absolutePath))) {
      continue;
    }

    const markdown = await fs.readFile(absolutePath, "utf8");
    const taskHeadingLines = headingLinesWithTaskBlocks(markdown);
    const headings = collectHeadings(markdown);
    for (const [index, heading] of headings.entries()) {
      if (taskHeadingLines.has(heading.line)) {
        continue;
      }
      const id = suggestedTaskId(file.path, heading.line, heading.title);
      const section = headingSection(markdown, headings, index);
      const pseudoTask = taskFromHeading(id, file.path, heading, section);
      const linkReport = suggestTaskLinks(pseudoTask, linkCandidates);
      const matches = linkReport.suggestions;
      const codeMatches = matches.filter((match) => match.field === "code");
      const testMatches = matches.filter((match) => match.field === "tests");
      const linkedCodeCandidates = codeMatches.map((match) => match.path);
      const linkedTestCandidates = testMatches.map((match) => match.path);
      const metadata: JumpTaskMetadata = {
        id,
        type: "spec",
        status: "proposed",
        space: "repo",
        code: linkedCodeCandidates,
        tests: linkedTestCandidates,
        gaps: [],
        depends_on: [],
        refs: [],
      };
      suggestions.push({
        type: "task_block",
        id,
        path: file.path,
        heading: heading.title,
        line: heading.line,
        reason: "Changed Markdown heading does not have a Jumpspace task block.",
        linked_code_candidates: linkedCodeCandidates,
        linked_test_candidates: linkedTestCandidates,
        linked_code_candidate_matches: codeMatches.map(candidateMatch),
        linked_test_candidate_matches: testMatches.map(candidateMatch),
        rejected_candidate_matches: linkReport.rejected_candidates.map(rejectedCandidateMatch),
        block: `<!-- jumpspace\n${stringifyYaml(metadata, { lineWidth: 0 }).trimEnd()}\n-->`,
      });
    }
  }

  return suggestions;
}

async function readLinkSuggestionCandidates(root: string, changedFiles: ChangedFile[]): Promise<TaskLinkSuggestionCandidate[]> {
  const candidates = changedFiles.filter(
    (file) => !file.statuses.includes("deleted") && !isIgnoredSuggestionPath(file.path) && !isMarkdownPath(file.path),
  );
  return Promise.all(
    candidates.map(async (file) => {
      const candidate: TaskLinkSuggestionCandidate = {
        path: file.path,
        statuses: file.statuses,
        sources: file.sources,
      };
      return readCandidateContent(root, candidate);
    }),
  );
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

function taskFromHeading(id: string, repoPath: string, heading: Heading, section: string): JumpTask {
  return {
    id,
    title: heading.title,
    type: "spec",
    status: "proposed",
    space: "repo",
    doc: {
      path: repoPath,
      heading: heading.title,
      line: heading.line,
    },
    spec: section,
    code: [],
    tests: [],
    depends_on: [],
    refs: [],
  };
}

function headingSection(markdown: string, headings: Heading[], headingIndex: number): string {
  const heading = headings[headingIndex];
  const nextHeading = headings[headingIndex + 1];
  return markdown.slice(heading.index, nextHeading?.index ?? markdown.length);
}

function candidateMatch(suggestion: TaskLinkSuggestion): CiTaskBlockCandidateMatch {
  return {
    path: suggestion.path,
    score: suggestion.score,
    match_reasons: suggestion.match_reasons,
    matched_terms: suggestion.matched_terms,
    evidence: suggestion.evidence,
    sources: suggestion.sources,
    statuses: suggestion.statuses,
  };
}

function rejectedCandidateMatch(candidate: TaskLinkRejectedCandidate): CiTaskBlockRejectedCandidate {
  return {
    path: candidate.path,
    field: candidate.field,
    reason: candidate.reason,
    match_reasons: candidate.match_reasons,
    matched_terms: candidate.matched_terms,
    evidence: candidate.evidence,
    sources: candidate.sources,
    statuses: candidate.statuses,
  };
}

function renderRepairSuggestions(report: Omit<CiReport, "pr_comment">): string {
  const lines: string[] = [];
  for (const fix of report.suggestions.repair.mechanical_fixes) {
    lines.push(`- repair ${fix.task_id} ${fix.field}: ${fix.old_path} -> ${fix.new_path}`);
  }
  for (const gap of report.suggestions.repair.gaps) {
    lines.push(`- gap ${gap.task_id} ${gap.field}: ${gap.message}`);
  }
  return lines.length > 0 ? lines.join("\n") : "- None";
}

function renderTaskBlockSuggestions(suggestions: CiTaskBlockSuggestion[]): string {
  if (suggestions.length === 0) {
    return "- None";
  }
  return suggestions
    .map((suggestion) =>
      [
        `- ${suggestion.id} ${suggestion.path}:${suggestion.line} ${suggestion.heading}`,
        "```markdown",
        suggestion.block,
        "```",
        renderRejectedCandidates(suggestion.rejected_candidate_matches),
      ].join("\n"),
    )
    .join("\n");
}

function renderRejectedCandidates(candidates: CiTaskBlockRejectedCandidate[]): string {
  if (candidates.length === 0) {
    return "  Rejected candidates: none";
  }
  return [
    "  Rejected candidates:",
    ...candidates.map((candidate) => `  - ${candidate.field}: ${candidate.path} (${candidate.reason})`),
  ].join("\n");
}

function renderGraphQueries(queries: CiGraphQueryResult[]): string {
  if (queries.length === 0) {
    return "- None";
  }
  return queries.map((query) => `- ${query.name}: ${query.result.results.length} match(es)`).join("\n");
}

type Heading = {
  title: string;
  index: number;
  line: number;
};

function collectHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const pattern = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
  for (const match of markdown.matchAll(pattern)) {
    const index = match.index ?? 0;
    headings.push({
      title: match[2].replace(/[ \t]+#+$/, "").trim(),
      index,
      line: lineNumberAt(markdown, index),
    });
  }
  return headings;
}

function headingLinesWithTaskBlocks(markdown: string): Set<number> {
  const headings = collectHeadings(markdown);
  const lines = new Set<number>();
  const pattern = /<!--\s*jumpspace\b[\s\S]*?-->/g;
  for (const match of markdown.matchAll(pattern)) {
    const index = match.index ?? 0;
    const heading = nearestHeading(headings, index);
    if (heading) {
      lines.add(heading.line);
    }
  }
  return lines;
}

function nearestHeading(headings: Heading[], beforeIndex: number): Heading | undefined {
  let candidate: Heading | undefined;
  for (const heading of headings) {
    if (heading.index >= beforeIndex) {
      break;
    }
    candidate = heading;
  }
  return candidate;
}

function suggestedTaskId(repoPath: string, line: number, heading: string): string {
  const hash = crypto.createHash("sha1").update(`${repoPath}:${line}:${heading}`).digest("hex").slice(0, 8).toUpperCase();
  return `DOC-${hash}`;
}

function isMarkdownPath(repoPath: string): boolean {
  return /\.(md|mdx)$/i.test(repoPath);
}

function isTestPath(repoPath: string): boolean {
  const normalized = repoPath.replaceAll("\\", "/").toLowerCase();
  const basename = path.basename(normalized);
  return (
    normalized.includes("/test/") ||
    normalized.includes("/tests/") ||
    basename.includes(".test.") ||
    basename.includes(".spec.") ||
    basename.endsWith("_test.ts") ||
    basename.endsWith("_test.js")
  );
}

function isIgnoredSuggestionPath(repoPath: string): boolean {
  const normalized = repoPath.replaceAll("\\", "/");
  return normalized.startsWith(".jumpspace/");
}

function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

export function renderCiError(errors: JsonCommandError[]): string {
  return JSON.stringify(errorEnvelope(errors), null, 2);
}
