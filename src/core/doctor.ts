import fs from "node:fs/promises";
import fg from "fast-glob";
import { DISCOVERY_IGNORE_PATTERNS } from "./discovery.js";
import { resolveRepoPath } from "./config.js";
import type { LastMutationSummary } from "./mutations.js";
import { planDriftRepair, type DriftRepairReport } from "./repair.js";
import type { JumpConfig, JumpIssue } from "./types.js";

export type DoctorSuggestion = {
  code: string;
  message: string;
  command?: string;
  taskId?: string;
  path?: string;
};

export type DoctorReport = {
  ok: boolean;
  errors: JumpIssue[];
  warnings: JumpIssue[];
  suggestions: DoctorSuggestion[];
  checked: {
    config_docs: string[];
    ignored_patterns: string[];
    repair_since?: string;
    semantic_index: {
      enabled: boolean;
      path: string;
    };
  };
  last_mutation: LastMutationSummary | null;
  repair: DriftRepairReport | null;
};

export async function createDoctorReport(
  root: string,
  issues: JumpIssue[],
  config: JumpConfig,
  lastMutation: LastMutationSummary | undefined,
  options: { since?: string } = {},
): Promise<DoctorReport> {
  const repairCheck = options.since ? await planRepairForDoctor(root, options.since) : { report: null, errors: [] };
  const doctorWarnings = [
    ...issues.filter((issue) => issue.severity === "warning"),
    ...(await configWarnings(root, config)),
    ...(await duplicateHeadingWarnings(root, config)),
    ...repairWarningsAsIssues(repairCheck.report),
    ...repairCheck.errors,
  ];
  const errors = issues.filter((issue) => issue.severity === "error");
  const suggestions = uniqueSuggestions([
    ...suggestionsForIssues([...errors, ...doctorWarnings]),
    ...suggestionsForRepair(repairCheck.report),
  ]);

  return {
    ok: errors.length === 0,
    errors,
    warnings: doctorWarnings,
    suggestions,
    checked: {
      config_docs: config.docs,
      ignored_patterns: DISCOVERY_IGNORE_PATTERNS,
      repair_since: options.since,
      semantic_index: {
        enabled: Boolean(config.semanticIndex?.enabled),
        path: config.semanticIndex?.path ?? ".jumpspace/semantic-index.json",
      },
    },
    last_mutation: lastMutation ?? null,
    repair: repairCheck.report,
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  return [
    "# Jumpspace Doctor",
    "",
    `Status: ${report.ok ? "ok" : "blocked"}`,
    `Last mutation: ${report.last_mutation ? `${report.last_mutation.command} at ${report.last_mutation.recorded_at}` : "None"}`,
    "",
    "## Errors",
    renderIssues(report.errors),
    "",
    "## Warnings",
    renderIssues(report.warnings),
    "",
    "## Suggested Repairs",
    renderSuggestions(report.suggestions),
    "",
    "## Repair Opportunities",
    renderRepairOpportunities(report.repair),
    "",
    "## Checked",
    `Config docs: ${report.checked.config_docs.join(", ") || "none"}`,
    `Ignored patterns: ${report.checked.ignored_patterns.join(", ") || "none"}`,
    `Semantic index: ${report.checked.semantic_index.enabled ? "enabled" : "disabled"} at ${report.checked.semantic_index.path}`,
    `Repair since: ${report.checked.repair_since ?? "not requested"}`,
  ].join("\n");
}

async function planRepairForDoctor(root: string, since: string): Promise<{ report: DriftRepairReport | null; errors: JumpIssue[] }> {
  const result = await planDriftRepair(root, since);
  if (result.ok) {
    return {
      report: result,
      errors: [],
    };
  }

  return {
    report: null,
    errors: result.errors.map((error) => ({
      severity: "warning",
      code: "REPAIR_PLAN_UNAVAILABLE",
      message: `Could not inspect repair opportunities: ${error.message}`,
      path: error.path,
      taskId: error.taskId,
      stepId: error.stepId,
    })),
  };
}

async function configWarnings(root: string, config: JumpConfig): Promise<JumpIssue[]> {
  const warnings: JumpIssue[] = [];

  for (const pattern of config.docs) {
    if (isIgnoredGeneratedPattern(pattern)) {
      warnings.push({
        severity: "warning",
        code: "CONFIG_INCLUDES_IGNORED_PATH",
        path: pattern,
        message: `Config doc pattern "${pattern}" points into a generated or ignored path.`,
      });
      continue;
    }

    const matches = await fg(pattern, {
      cwd: root,
      onlyFiles: true,
      unique: true,
      dot: false,
      ignore: DISCOVERY_IGNORE_PATTERNS,
    });
    if (matches.length === 0) {
      warnings.push({
        severity: "warning",
        code: "CONFIG_GLOB_MATCHES_NO_FILES",
        path: pattern,
        message: `Config doc pattern "${pattern}" did not match any files.`,
      });
    }
  }

  return warnings;
}

async function duplicateHeadingWarnings(root: string, config: JumpConfig): Promise<JumpIssue[]> {
  const warnings: JumpIssue[] = [];
  const paths = await fg(config.docs, {
    cwd: root,
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: DISCOVERY_IGNORE_PATTERNS,
  });

  for (const repoPath of paths.sort()) {
    const markdown = await fs.readFile(resolveRepoPath(root, repoPath), "utf8");
    const headings = collectHeadings(markdown);
    const byTitle = new Map<string, number[]>();
    for (const heading of headings) {
      byTitle.set(heading.title, [...(byTitle.get(heading.title) ?? []), heading.line]);
    }

    for (const [title, lines] of byTitle) {
      if (lines.length <= 1) {
        continue;
      }
      warnings.push({
        severity: "warning",
        code: "DUPLICATE_HEADING_TITLE",
        path: repoPath,
        message: `Heading "${title}" appears ${lines.length} times in ${repoPath} at lines ${lines.join(", ")}.`,
      });
    }
  }

  return warnings;
}

function collectHeadings(markdown: string): Array<{ title: string; line: number }> {
  return markdown.split(/\r?\n/).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) {
      return [];
    }
    return [
      {
        title: match[2].trim(),
        line: index + 1,
      },
    ];
  });
}

function suggestionsForIssues(issues: JumpIssue[]): DoctorSuggestion[] {
  const suggestions: DoctorSuggestion[] = [];
  for (const issue of issues) {
    if (issue.code === "STALE_INDEX") {
      suggestions.push({
        code: "RUN_SCAN",
        message: "Refresh the generated index.",
        command: "jumpspace scan",
      });
    } else if (issue.code === "MISSING_CODE_FILE" || issue.code === "MISSING_TEST_FILE") {
      suggestions.push({
        code: "RESTORE_OR_RELINK_FILE",
        message: "Restore the missing file or update the task's linked code/test path.",
        taskId: issue.taskId,
        path: issue.path,
      });
    } else if (issue.code === "DUPLICATE_ID") {
      suggestions.push({
        code: "MAKE_TASK_ID_UNIQUE",
        message: "Give each Jumpspace task block a unique ID.",
        taskId: issue.taskId,
      });
    } else if (issue.code === "DUPLICATE_HEADING_TITLE") {
      suggestions.push({
        code: "USE_HEADING_SOURCE_IDENTITY",
        message: "Use source line, heading level, and parent headings when applying bootstrap proposals.",
        path: issue.path,
      });
    } else if (issue.code === "AMBIGUOUS_TASK_HEADING") {
      suggestions.push({
        code: "DISAMBIGUATE_TASK_HEADING",
        message: "Use doc.line, doc.level, and doc.parent_headings when referencing this task, or rename duplicate headings if humans need title-only anchors.",
        path: issue.path,
      });
    } else if (issue.code === "TASK_SOURCE_DOC_RENAMED") {
      suggestions.push({
        code: "REFRESH_SOURCE_DOC_RENAME",
        message: "Refresh the index after the source document move and confirm config docs still include the new path.",
        command: "jumpspace scan",
        taskId: issue.taskId,
        path: issue.path,
      });
    } else if (issue.code === "TASK_SOURCE_DOC_DELETED") {
      suggestions.push({
        code: "RESOLVE_ORPHANED_TASK",
        message: "Restore the source document, recreate the task from surviving evidence, or mark the task superseded, stale, or retired in a surviving doc.",
        taskId: issue.taskId,
        path: issue.path,
      });
    } else if (issue.code === "CONFIG_GLOB_MATCHES_NO_FILES" || issue.code === "CONFIG_INCLUDES_IGNORED_PATH") {
      suggestions.push({
        code: "UPDATE_CONFIG_DOCS",
        message: "Update .jumpspace/config.json docs globs or run jumpspace init --auto.",
        command: "jumpspace init --auto",
        path: issue.path,
      });
    } else if (issue.code === "TASK_HAS_GAP") {
      suggestions.push({
        code: "RESOLVE_TASK_GAP",
        message: "Review the task gap, add a replacement code/test link if available, or leave it documented for follow-up.",
        taskId: issue.taskId,
      });
    } else if (
      issue.code === "MISSING_SEMANTIC_INDEX" ||
      issue.code === "STALE_SEMANTIC_INDEX" ||
      issue.code === "INVALID_SEMANTIC_INDEX"
    ) {
      suggestions.push({
        code: "REBUILD_SEMANTIC_INDEX",
        message: "Refresh the optional generated semantic retrieval index.",
        command: "jumpspace semantic build",
        path: issue.path,
      });
    }
  }
  return uniqueSuggestions(suggestions);
}

function repairWarningsAsIssues(repair: DriftRepairReport | null): JumpIssue[] {
  return (repair?.warnings ?? []).map((warning) => ({
    severity: "warning",
    code: warning.code,
    message: warning.message,
    taskId: warning.taskId,
    path: warning.path,
  }));
}

function suggestionsForRepair(repair: DriftRepairReport | null): DoctorSuggestion[] {
  if (!repair || (repair.mechanical_fixes.length === 0 && repair.gaps.length === 0)) {
    return [];
  }
  return [
    {
      code: "RUN_REPAIR",
      message: `Apply ${repair.mechanical_fixes.length} mechanical fix(es) and record ${repair.gaps.length} gap(s).`,
      command: `jumpspace repair --since ${repair.since} --apply`,
    },
  ];
}

function uniqueSuggestions(suggestions: DoctorSuggestion[]): DoctorSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = [suggestion.code, suggestion.command, suggestion.taskId, suggestion.path].join("\0");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function renderIssues(issues: JumpIssue[]): string {
  if (issues.length === 0) {
    return "- None";
  }
  return issues.map((issue) => `- ${issue.code}${issue.taskId ? ` ${issue.taskId}` : ""}${issue.path ? ` ${issue.path}` : ""}: ${issue.message}`).join("\n");
}

function renderSuggestions(suggestions: DoctorSuggestion[]): string {
  if (suggestions.length === 0) {
    return "- None";
  }
  return suggestions
    .map((suggestion) => `- ${suggestion.code}${suggestion.command ? ` (${suggestion.command})` : ""}: ${suggestion.message}`)
    .join("\n");
}

function renderRepairOpportunities(repair: DriftRepairReport | null): string {
  if (!repair) {
    return "- Not checked. Pass --since <ref> to inspect repairable drift.";
  }

  const lines = [
    `- Since: ${repair.since}`,
    `- Mechanical fixes: ${repair.mechanical_fixes.length}`,
    `- Gaps to record: ${repair.gaps.length}`,
    `- Warnings: ${repair.warnings.length}`,
  ];
  if (repair.mechanical_fixes.length > 0 || repair.gaps.length > 0) {
    lines.push(`- Apply: jumpspace repair --since ${repair.since} --apply`);
  }
  return lines.join("\n");
}

function isIgnoredGeneratedPattern(pattern: string): boolean {
  const normalized = pattern.replaceAll("\\", "/").replace(/^\.\//, "");
  return DISCOVERY_IGNORE_PATTERNS.some((ignored) => {
    const prefix = ignored.replace(/\/\*\*$/, "");
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
}
