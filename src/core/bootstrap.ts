import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { stringify as stringifyYaml } from "yaml";
import { atomicWriteFile } from "./atomicWrite.js";
import {
  type BootstrapProposal,
  type BootstrapTaskProposal,
  duplicateProposalIdErrors,
} from "./bootstrapProposal.js";
import { loadConfig, pathExists, readIndex, resolveRepoPath, writeConfig } from "./config.js";
import { commandError, type JsonCommandError } from "./errors.js";
import { DISCOVERY_IGNORE_PATTERNS } from "./discovery.js";
import { refreshIndex } from "./refreshIndex.js";
import type { JumpTaskMetadata, JumpTaskRefType } from "./types.js";

export type BootstrapContextHeading = {
  source_key: string;
  path: string;
  heading: string;
  level: number;
  line: number;
  parent_headings: string[];
  suggested_id: string;
  excerpt: string;
  own_excerpt: string;
  descendant_excerpt: string;
  has_jumpspace_task: boolean;
  task_id?: string;
  linked_file_hints: string[];
  descendant_linked_file_hints: string[];
  linked_file_hint_details: Array<{
    path: string;
    line: number;
    scope: "own" | "descendant";
  }>;
};

export type BootstrapContext = {
  ok: true;
  context_version: 1;
  paths: string[];
  existing_task_ids: string[];
  headings: BootstrapContextHeading[];
  proposal_schema: {
    version: 1;
    required_task_fields: string[];
    commands: {
      validate: string;
      apply: string;
    };
  };
  instructions: string[];
  evidence_gaps: string[];
};

export type BootstrapValidationIssue = JsonCommandError & {
  severity: "error" | "warning";
};

export type BootstrapValidationResult = {
  ok: boolean;
  proposal: BootstrapProposal;
  issues: BootstrapValidationIssue[];
  errors: BootstrapValidationIssue[];
  warnings: BootstrapValidationIssue[];
};

export type BootstrapApplyResult = {
  ok: true;
  dry_run: boolean;
  applied: Array<{
    id: string;
    path: string;
    heading: string;
    line: number;
    action: "inserted" | "would_insert";
  }>;
  config_paths_added: string[];
};

type Heading = {
  path: string;
  title: string;
  level: number;
  index: number;
  endIndex: number;
  line: number;
  parentHeadings: string[];
};

type MarkdownDoc = {
  path: string;
  markdown: string;
  headings: Heading[];
};

const headingPattern = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
const jumpspaceCommentPattern = /<!--\s*jumpspace\b([\s\S]*?)-->/g;
const resolvingRefTypes = new Set<JumpTaskRefType>(["depends_on", "related_to", "implements", "supersedes", "conflicts_with"]);

export async function createBootstrapContext(root: string, patterns: string[]): Promise<BootstrapContext> {
  const docs = await loadMarkdownDocs(root, patterns);
  const existingTaskIds = await loadExistingTaskIds(root);
  const headings: BootstrapContextHeading[] = [];

  for (const doc of docs) {
    for (const heading of doc.headings) {
      const section = sectionMarkdown(doc, heading);
      const ownSection = ownSectionMarkdown(doc, heading);
      const descendantSection = descendantSectionMarkdown(doc, heading);
      const fileHints = await linkedFileHints(root, doc, heading);
      const taskId = taskIdInSection(ownSection);
      headings.push({
        source_key: headingSourceKey(heading),
        path: heading.path,
        heading: heading.title,
        level: heading.level,
        line: heading.line,
        parent_headings: heading.parentHeadings,
        suggested_id: suggestedTaskId(heading.path, heading.title, heading.line, heading.level),
        excerpt: excerpt(section),
        own_excerpt: excerpt(ownSection),
        descendant_excerpt: excerpt(descendantSection),
        has_jumpspace_task: Boolean(taskId),
        task_id: taskId,
        linked_file_hints: unique(fileHints.filter((hint) => hint.scope === "own").map((hint) => hint.path)).slice(0, 20),
        descendant_linked_file_hints: unique(fileHints.filter((hint) => hint.scope === "descendant").map((hint) => hint.path)).slice(0, 20),
        linked_file_hint_details: fileHints.slice(0, 40),
      });
    }
  }

  return {
    ok: true,
    context_version: 1,
    paths: docs.map((doc) => doc.path),
    existing_task_ids: existingTaskIds,
    headings,
    proposal_schema: {
      version: 1,
      required_task_fields: ["id", "title", "source.path", "source.heading", "evidence", "confidence"],
      commands: {
        validate: "jumpspace bootstrap validate --file <proposal-file> --json",
        apply: "jumpspace bootstrap apply --file <proposal-file>",
      },
    },
    instructions: [
      "Produce proposal JSON with version 1, tasks, and skipped arrays.",
      "Use source.path and source.heading from this context exactly.",
      "When available, include source.line, source.level, and source.parent_headings so duplicate heading titles are unambiguous.",
      "Set new task status to draft or proposed only.",
      "Leave code and tests empty unless the source document explicitly cites those paths.",
      "Only add depends_on or resolving refs when the cited task ID already exists or is also in the proposal.",
      "Ask for human approval before running bootstrap apply.",
    ],
    evidence_gaps: [
      "Jumpspace does not infer implementation links from prose alone.",
      "Unknown code and test links should stay empty and be listed in task gaps.",
    ],
  };
}

export async function validateBootstrapProposal(root: string, proposal: BootstrapProposal): Promise<BootstrapValidationResult> {
  const docs = await loadMarkdownDocs(root, unique(proposal.tasks.map((task) => task.source.path)));
  const docsByPath = new Map(docs.map((doc) => [doc.path, doc]));
  const existingTaskIds = new Set(await loadExistingTaskIds(root));
  const proposalTaskIds = new Set(proposal.tasks.map((task) => task.id));
  const issues: BootstrapValidationIssue[] = [];

  for (const error of duplicateProposalIdErrors(proposal.tasks)) {
    issues.push({ ...error, severity: "error" });
  }

  for (const task of proposal.tasks) {
    if (existingTaskIds.has(task.id)) {
      issues.push({
        ...commandError("BOOTSTRAP_TASK_ID_EXISTS", `Task ID "${task.id}" already exists. Choose a new ID or edit the existing task manually.`, {
          taskId: task.id,
        }),
        severity: "error",
      });
    }

    const doc = docsByPath.get(task.source.path);
    if (!doc) {
      issues.push({
        ...commandError("BOOTSTRAP_SOURCE_NOT_FOUND", `Source document "${task.source.path}" was not found.`, {
          taskId: task.id,
          path: task.source.path,
        }),
        severity: "error",
      });
      continue;
    }

    const headingResolution = resolveHeading(doc, task.source);
    if (headingResolution.status === "missing") {
      issues.push({
        ...commandError("BOOTSTRAP_HEADING_NOT_FOUND", `Heading "${task.source.heading}" was not found in ${task.source.path}.`, {
          taskId: task.id,
          path: task.source.path,
        }),
        severity: "error",
      });
    } else if (headingResolution.status === "ambiguous") {
      issues.push({
        ...commandError(
          "BOOTSTRAP_AMBIGUOUS_HEADING",
          `Heading "${task.source.heading}" is ambiguous in ${task.source.path}. Include source.line, source.level, and source.parent_headings from bootstrap context.`,
          {
            taskId: task.id,
            path: task.source.path,
          },
        ),
        severity: "error",
      });
    } else if (taskIdInSection(ownSectionMarkdown(doc, headingResolution.heading))) {
      issues.push({
        ...commandError("BOOTSTRAP_HEADING_ALREADY_HAS_TASK", `Heading "${task.source.heading}" in ${task.source.path} already has a Jumpspace task block.`, {
          taskId: task.id,
          path: task.source.path,
        }),
        severity: "error",
      });
    }

    for (const dependency of task.depends_on) {
      if (!existingTaskIds.has(dependency) && !proposalTaskIds.has(dependency)) {
        issues.push({
          ...commandError("BOOTSTRAP_UNKNOWN_DEPENDENCY", `Task ${task.id} depends on unknown task ID "${dependency}".`, {
            taskId: task.id,
          }),
          severity: "error",
        });
      }
    }

    for (const ref of task.refs) {
      if (!resolvingRefTypes.has(ref.type) || existingTaskIds.has(ref.id) || proposalTaskIds.has(ref.id)) {
        continue;
      }
      issues.push({
        ...commandError("BOOTSTRAP_UNKNOWN_REF", `Task ${task.id} has ${ref.type} ref to unknown task ID "${ref.id}".`, {
          taskId: task.id,
        }),
        severity: ref.type === "depends_on" ? "error" : "warning",
      });
    }

    issues.push(...(await linkedPathIssues(root, task, "code")));
    issues.push(...(await linkedPathIssues(root, task, "tests")));
  }

  issues.push(...duplicateSourceHeadingIssues(docsByPath, proposal.tasks));

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return {
    ok: errors.length === 0,
    proposal,
    issues,
    errors,
    warnings,
  };
}

export async function applyBootstrapProposal(root: string, proposal: BootstrapProposal, options: { dryRun?: boolean } = {}): Promise<BootstrapApplyResult> {
  const validation = await validateBootstrapProposal(root, proposal);
  if (!validation.ok) {
    throw validation;
  }

  const applied: BootstrapApplyResult["applied"] = [];
  const byPath = groupBy(proposal.tasks, (task) => task.source.path);

  for (const [repoPath, tasks] of byPath) {
    const absolutePath = resolveRepoPath(root, repoPath);
    let markdown = await fs.readFile(absolutePath, "utf8");
    const doc: MarkdownDoc = {
      path: repoPath,
      markdown,
      headings: collectHeadings(markdown, repoPath),
    };
    const insertions = tasks.map((task) => {
      const headingResolution = resolveHeading(doc, task.source);
      if (headingResolution.status !== "found") {
        throw new Error(`Heading "${task.source.heading}" disappeared from ${repoPath}.`);
      }
      const heading = headingResolution.heading;
      return {
        index: heading.endIndex,
        content: `\n\n${renderTaskBlock(task)}`,
        task,
        heading,
      };
    });

    for (const insertion of insertions.sort((left, right) => right.index - left.index)) {
      if (!options.dryRun) {
        markdown = `${markdown.slice(0, insertion.index)}${insertion.content}${markdown.slice(insertion.index)}`;
      }
      applied.push({
        id: insertion.task.id,
        path: repoPath,
        heading: insertion.task.source.heading,
        line: insertion.heading.line,
        action: options.dryRun ? "would_insert" : "inserted",
      });
    }

    if (!options.dryRun) {
      await atomicWriteFile(absolutePath, markdown);
    }
  }

  const configPathsAdded = options.dryRun ? [] : await ensureConfigIncludesPaths(root, [...byPath.keys()]);
  if (!options.dryRun) {
    await refreshIndex(root);
  }

  return {
    ok: true,
    dry_run: Boolean(options.dryRun),
    applied,
    config_paths_added: configPathsAdded,
  };
}

export function renderBootstrapContext(context: BootstrapContext): string {
  const lines = [
    "# Jumpspace Bootstrap Context",
    "",
    `Documents: ${context.paths.length}`,
    `Headings: ${context.headings.length}`,
    "",
    "## Agent Instructions",
    ...context.instructions.map((instruction) => `- ${instruction}`),
    "",
    "## Candidate Headings",
  ];

  for (const heading of context.headings) {
    lines.push(
      "",
      `- ${heading.path}:${heading.line} ${"#".repeat(heading.level)} ${heading.heading}`,
      `  source_key: ${heading.source_key}`,
      `  parent_headings: ${heading.parent_headings.join(" > ") || "none"}`,
      `  suggested_id: ${heading.suggested_id}`,
      `  existing_task: ${heading.task_id ?? "none"}`,
      `  file_hints: ${heading.linked_file_hints.join(", ") || "none"}`,
      `  descendant_file_hints: ${heading.descendant_linked_file_hints.join(", ") || "none"}`,
      `  excerpt: ${heading.excerpt || "(empty)"}`,
    );
  }

  return lines.join("\n");
}

export function renderBootstrapValidation(result: BootstrapValidationResult): string {
  const lines = [
    result.ok ? "Bootstrap proposal is valid." : "Bootstrap proposal has blocking issues.",
    `Tasks: ${result.proposal.tasks.length}`,
    `Skipped headings: ${result.proposal.skipped.length}`,
  ];

  for (const issue of result.issues) {
    lines.push(`${issue.severity} ${issue.code}${issue.taskId ? ` ${issue.taskId}` : ""}${issue.path ? ` ${issue.path}` : ""}: ${issue.message}`);
  }

  return lines.join("\n");
}

function renderTaskBlock(task: BootstrapTaskProposal): string {
  const metadata: JumpTaskMetadata = {
    id: task.id,
    type: task.type,
    status: task.status,
    module: task.module,
    space: task.space,
    keywords: task.keywords.length > 0 ? task.keywords : undefined,
    code: task.code,
    tests: task.tests,
    gaps: task.gaps,
    depends_on: task.depends_on,
    refs: task.refs,
    sources: task.sources,
    acceptance_criteria: task.acceptance_criteria,
    external: {
      bootstrap: {
        title: task.title,
        summary: task.summary,
        confidence: task.confidence,
        evidence: task.evidence,
        gaps: task.gaps,
      },
    },
  };
  return `<!-- jumpspace\n${stringifyYaml(metadata, { lineWidth: 0 }).trimEnd()}\n-->\n`;
}

async function linkedPathIssues(
  root: string,
  task: BootstrapTaskProposal,
  field: "code" | "tests",
): Promise<BootstrapValidationIssue[]> {
  const issues: BootstrapValidationIssue[] = [];
  for (const repoPath of task[field]) {
    if (!(await pathExists(resolveRepoPath(root, repoPath)))) {
      issues.push({
        ...commandError(
          field === "code" ? "BOOTSTRAP_MISSING_CODE_FILE" : "BOOTSTRAP_MISSING_TEST_FILE",
          `Task ${task.id} links missing ${field === "code" ? "code" : "test"} file "${repoPath}". Leave ${field} empty unless evidence proves the path.`,
          { taskId: task.id, path: repoPath },
        ),
        severity: "error",
      });
    }
    if (!evidenceMentionsPath(task, repoPath)) {
      issues.push({
        ...commandError(
          field === "code" ? "BOOTSTRAP_UNEVIDENCED_CODE_FILE" : "BOOTSTRAP_UNEVIDENCED_TEST_FILE",
          `Task ${task.id} links "${repoPath}" without proposal evidence mentioning that path.`,
          { taskId: task.id, path: repoPath },
        ),
        severity: "error",
      });
    }
  }
  return issues;
}

async function ensureConfigIncludesPaths(root: string, repoPaths: string[]): Promise<string[]> {
  const config = await loadConfig(root);
  const additions = repoPaths.filter((repoPath) => !config.docs.includes(repoPath));
  if (additions.length === 0) {
    return [];
  }

  await writeConfig(root, {
    ...config,
    docs: [...config.docs, ...additions],
  });
  return additions;
}

function evidenceMentionsPath(task: BootstrapTaskProposal, repoPath: string): boolean {
  return task.evidence.some((item) => [item.path, item.quote, item.reason].filter(Boolean).some((value) => value?.includes(repoPath)));
}

async function loadMarkdownDocs(root: string, patterns: string[]): Promise<MarkdownDoc[]> {
  const files = await resolveMarkdownFiles(root, patterns);
  const docs: MarkdownDoc[] = [];
  for (const repoPath of files) {
    const markdown = await fs.readFile(resolveRepoPath(root, repoPath), "utf8");
    docs.push({
      path: repoPath,
      markdown,
      headings: collectHeadings(markdown, repoPath),
    });
  }
  return docs;
}

async function resolveMarkdownFiles(root: string, patterns: string[]): Promise<string[]> {
  const activePatterns = patterns.length > 0 ? patterns : (await loadConfig(root)).docs;
  const files = await fg(activePatterns, {
    cwd: root,
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: DISCOVERY_IGNORE_PATTERNS,
  });
  return files.filter((file) => [".md", ".mdx"].includes(path.extname(file).toLowerCase())).sort();
}

async function loadExistingTaskIds(root: string): Promise<string[]> {
  try {
    const index = await readIndex(root);
    return index.tasks.map((task) => task.id).sort();
  } catch {
    return [];
  }
}

function collectHeadings(markdown: string, repoPath: string): Heading[] {
  const headings: Heading[] = [];
  const stack: Heading[] = [];
  for (const match of markdown.matchAll(headingPattern)) {
    const index = match.index ?? 0;
    const title = stripClosingHashes(match[2].trim());
    while (stack.length > 0 && stack[stack.length - 1].level >= match[1].length) {
      stack.pop();
    }
    const heading: Heading = {
      path: repoPath,
      title,
      level: match[1].length,
      index,
      endIndex: index + match[0].length,
      line: lineNumberAt(markdown, index),
      parentHeadings: stack.map((parent) => parent.title),
    };
    headings.push(heading);
    stack.push(heading);
  }
  return headings;
}

type HeadingSourceSelector = {
  heading: string;
  line?: number;
  level?: number;
  parent_headings?: string[];
};

type HeadingResolution =
  | { status: "found"; heading: Heading }
  | { status: "missing" }
  | { status: "ambiguous"; matches: Heading[] };

function resolveHeading(doc: MarkdownDoc, source: HeadingSourceSelector): HeadingResolution {
  let matches = doc.headings.filter((heading) => heading.title === source.heading);
  if (source.line !== undefined) {
    matches = matches.filter((heading) => heading.line === source.line);
  }
  if (source.level !== undefined) {
    matches = matches.filter((heading) => heading.level === source.level);
  }
  if (source.parent_headings !== undefined) {
    matches = matches.filter((heading) => arraysEqual(heading.parentHeadings, source.parent_headings ?? []));
  }

  if (matches.length === 0) {
    return { status: "missing" };
  }
  if (matches.length > 1) {
    return { status: "ambiguous", matches };
  }
  return { status: "found", heading: matches[0] };
}

function sectionMarkdown(doc: MarkdownDoc, heading: Heading): string {
  const end = nextPeerHeadingIndex(doc.headings, heading.endIndex, heading.level);
  return doc.markdown.slice(heading.endIndex, end).trim();
}

function ownSectionMarkdown(doc: MarkdownDoc, heading: Heading): string {
  const end = nextHeadingIndex(doc.headings, heading.endIndex);
  return doc.markdown.slice(heading.endIndex, end);
}

function descendantSectionMarkdown(doc: MarkdownDoc, heading: Heading): string {
  const ownEnd = nextHeadingIndex(doc.headings, heading.endIndex);
  const sectionEnd = nextPeerHeadingIndex(doc.headings, heading.endIndex, heading.level);
  if (ownEnd >= sectionEnd) {
    return "";
  }
  return doc.markdown.slice(ownEnd, sectionEnd);
}

function nextHeadingIndex(headings: Heading[], afterIndex: number): number {
  for (const heading of headings) {
    if (heading.index > afterIndex) {
      return heading.index;
    }
  }
  return Number.POSITIVE_INFINITY;
}

function nextPeerHeadingIndex(headings: Heading[], afterIndex: number, currentLevel: number): number {
  for (const heading of headings) {
    if (heading.index > afterIndex && heading.level <= currentLevel) {
      return heading.index;
    }
  }
  return Number.POSITIVE_INFINITY;
}

function taskIdInSection(section: string): string | undefined {
  const match = jumpspaceCommentPattern.exec(section);
  jumpspaceCommentPattern.lastIndex = 0;
  if (!match) {
    return undefined;
  }
  const idMatch = /^\s*id:\s*["']?([^"'\n]+)["']?\s*$/m.exec(match[1]);
  return idMatch?.[1]?.trim();
}

function excerpt(section: string): string {
  return section
    .replace(jumpspaceCommentPattern, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

async function linkedFileHints(
  root: string,
  doc: MarkdownDoc,
  heading: Heading,
): Promise<Array<{ path: string; line: number; scope: "own" | "descendant" }>> {
  const own = await linkedFileHintDetails(root, ownSectionMarkdown(doc, heading), heading.line, "own");
  const descendant = await linkedFileHintDetails(root, descendantSectionMarkdown(doc, heading), heading.line, "descendant");
  return uniqueHintDetails([...own, ...descendant]).slice(0, 40);
}

async function linkedFileHintDetails(
  root: string,
  section: string,
  baseLine: number,
  scope: "own" | "descendant",
): Promise<Array<{ path: string; line: number; scope: "own" | "descendant" }>> {
  const pattern = /(?:^|[\s([`'"])([A-Za-z0-9_@./-]+\.(?:test\.ts|spec\.ts|ts|tsx|js|jsx|py|go|rs|rb|java|md|mdx))/g;
  const hints: Array<{ path: string; line: number; scope: "own" | "descendant" }> = [];
  for (const match of section.matchAll(pattern)) {
    const repoPath = normalizeHintPath(match[1]);
    if (!repoPath || !(await pathExists(resolveRepoPath(root, repoPath)))) {
      continue;
    }
    hints.push({
      path: repoPath,
      line: baseLine + lineNumberAt(section, match.index ?? 0) - 1,
      scope,
    });
  }
  return hints;
}

function normalizeHintPath(value: string): string | undefined {
  const cleaned = value.replace(/^[./]+/, (prefix) => (prefix === "./" ? "" : prefix)).replace(/[),.;:'"`\]]+$/, "");
  if (!cleaned.includes("/") && !cleaned.startsWith("README.") && !cleaned.startsWith("AGENTS.") && !cleaned.startsWith("CLAUDE.")) {
    return undefined;
  }
  return cleaned;
}

function suggestedTaskId(repoPath: string, heading: string, line: number, level: number): string {
  const hash = crypto.createHash("sha1").update(`${repoPath}\n${line}\n${level}\n${heading}`).digest("hex").slice(0, 8).toUpperCase();
  return `DOC-${hash}`;
}

function headingSourceKey(heading: Heading): string {
  return `${heading.path}:${heading.line}:${heading.level}:${heading.title}`;
}

function duplicateSourceHeadingIssues(
  docsByPath: Map<string, MarkdownDoc>,
  tasks: BootstrapTaskProposal[],
): BootstrapValidationIssue[] {
  const targets = new Map<string, BootstrapTaskProposal[]>();
  for (const task of tasks) {
    const doc = docsByPath.get(task.source.path);
    if (!doc) {
      continue;
    }
    const resolution = resolveHeading(doc, task.source);
    if (resolution.status !== "found") {
      continue;
    }
    const key = headingSourceKey(resolution.heading);
    targets.set(key, [...(targets.get(key) ?? []), task]);
  }

  const issues: BootstrapValidationIssue[] = [];
  for (const [key, targetTasks] of targets.entries()) {
    if (targetTasks.length <= 1) {
      continue;
    }
    for (const task of targetTasks) {
      issues.push({
        ...commandError("BOOTSTRAP_DUPLICATE_SOURCE_HEADING", `Multiple proposal tasks target the same source heading ${key}.`, {
          taskId: task.id,
          path: task.source.path,
        }),
        severity: "error",
      });
    }
  }
  return issues;
}

function uniqueHintDetails(
  hints: Array<{ path: string; line: number; scope: "own" | "descendant" }>,
): Array<{ path: string; line: number; scope: "own" | "descendant" }> {
  const seen = new Set<string>();
  const uniqueHints: Array<{ path: string; line: number; scope: "own" | "descendant" }> = [];
  for (const hint of hints) {
    const key = `${hint.path}:${hint.line}:${hint.scope}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueHints.push(hint);
  }
  return uniqueHints;
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stripClosingHashes(title: string): string {
  return title.replace(/[ \t]+#+$/, "").trim();
}

function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

function groupBy<T>(values: T[], getKey: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = getKey(value);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return grouped;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
