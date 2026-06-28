import crypto from "node:crypto";
import { buildCiReport, type CiReport, type CiTaskBlockCandidateMatch, type CiTaskBlockRejectedCandidate, type CiTaskBlockSuggestion } from "./ci.js";
import type { JsonCommandError } from "./errors.js";
import type { DriftRepairReport, RepairFix, RepairGap } from "./repair.js";

export const PR_ASSISTANT_VERSION = 1 as const;
export const PR_ASSISTANT_MARKER = "<!-- jumpspace-pr-assistant:v1 -->";

export type PrAssistantReviewItem =
  | {
      type: "task_block";
      id: string;
      path: string;
      line: number;
      heading: string;
      useful_candidates: PrAssistantTaskBlockCandidate[];
      rejected_candidates: CiTaskBlockRejectedCandidate[];
      evidence: string[];
      body: string;
    }
  | {
      type: "repair";
      task_id: string;
      field: RepairFix["field"];
      old_path: string;
      new_path: string;
      evidence: string[];
      command: string;
    }
  | {
      type: "gap";
      task_id: string;
      field: RepairGap["field"];
      path: string;
      evidence: string[];
      command: string;
    };

export type PrAssistantTaskBlockCandidate = CiTaskBlockCandidateMatch & {
  field: "code" | "tests";
};

export type PrAssistantReport = {
  ok: boolean;
  assistant_version: typeof PR_ASSISTANT_VERSION;
  since: string;
  mode: "local";
  idempotency: {
    marker: typeof PR_ASSISTANT_MARKER;
    strategy: "replace_existing_comment_with_same_marker";
    fingerprint: string;
  };
  mutation_policy: {
    mutates: false;
    requires_human_approval: true;
    allowed_follow_up_commands: string[];
  };
  schemas: {
    packet: "pr.comment";
    ci: "ci";
    errors: "error";
  };
  ci: CiReport;
  review_items: PrAssistantReviewItem[];
  summary: {
    review_items: number;
    task_blocks: number;
    repair_fixes: number;
    repair_gaps: number;
    blocking_errors: number;
    warnings: number;
  };
  review_comment: string;
};

export type PrAssistantResult =
  | {
      ok: true;
      report: PrAssistantReport;
    }
  | {
      ok: false;
      errors: JsonCommandError[];
      review_comment: string;
    };

export type BuildPrAssistantOptions = {
  root: string;
  since: string;
};

export async function buildPrAssistantComment(options: BuildPrAssistantOptions): Promise<PrAssistantResult> {
  const ci = await buildCiReport({ root: options.root, since: options.since });
  if (!ci.ok) {
    return {
      ok: false,
      errors: ci.errors,
      review_comment: renderFailureComment(options.since, ci.errors),
    };
  }

  const reviewItems = reviewItemsForReport(ci.report);
  const fingerprint = fingerprintReport(ci.report, reviewItems);
  const reportWithoutComment: Omit<PrAssistantReport, "review_comment"> = {
    ok: ci.report.ok,
    assistant_version: PR_ASSISTANT_VERSION,
    since: options.since,
    mode: "local" as const,
    idempotency: {
      marker: PR_ASSISTANT_MARKER,
      strategy: "replace_existing_comment_with_same_marker" as const,
      fingerprint,
    },
    mutation_policy: {
      mutates: false as const,
      requires_human_approval: true,
      allowed_follow_up_commands: allowedFollowUpCommands(options.since, ci.report),
    },
    schemas: {
      packet: "pr.comment" as const,
      ci: "ci" as const,
      errors: "error" as const,
    },
    ci: ci.report,
    review_items: reviewItems,
    summary: {
      review_items: reviewItems.length,
      task_blocks: ci.report.suggestions.task_blocks.length,
      repair_fixes: ci.report.suggestions.repair.mechanical_fixes.length,
      repair_gaps: ci.report.suggestions.repair.gaps.length,
      blocking_errors: ci.report.summary.blocking_errors,
      warnings: ci.report.summary.warnings,
    },
  };

  return {
    ok: true,
    report: {
      ...reportWithoutComment,
      review_comment: renderReviewComment(reportWithoutComment),
    },
  };
}

function reviewItemsForReport(report: CiReport): PrAssistantReviewItem[] {
  return [
    ...report.suggestions.task_blocks.map(taskBlockReviewItem),
    ...report.suggestions.repair.mechanical_fixes.map((fix) => repairReviewItem(report.since, fix)),
    ...report.suggestions.repair.gaps.map((gap) => gapReviewItem(report.since, gap)),
  ];
}

function taskBlockReviewItem(suggestion: CiTaskBlockSuggestion): PrAssistantReviewItem {
  const usefulCandidates = usefulTaskBlockCandidates(suggestion);
  return {
    type: "task_block",
    id: suggestion.id,
    path: suggestion.path,
    line: suggestion.line,
    heading: suggestion.heading,
    useful_candidates: usefulCandidates,
    rejected_candidates: suggestion.rejected_candidate_matches,
    body: suggestion.block,
    evidence: [
      `${suggestion.path}:${suggestion.line} ${suggestion.heading}`,
      suggestion.reason,
      `linked_code_candidates: ${suggestion.linked_code_candidates.join(", ") || "none"}`,
      `linked_test_candidates: ${suggestion.linked_test_candidates.join(", ") || "none"}`,
      ...usefulCandidates.map(
        (candidate) =>
          `useful_candidate: ${candidate.field} ${candidate.path} score=${candidate.score} matched_terms=${candidate.matched_terms.join(", ") || "none"} match_reasons=${candidate.match_reasons.join(", ") || "none"}`,
      ),
      ...suggestion.rejected_candidate_matches.map(
        (candidate) =>
          `rejected_candidate: ${candidate.field} ${candidate.path} reason=${candidate.reason} matched_terms=${candidate.matched_terms.join(", ") || "none"}`,
      ),
    ],
  };
}

function usefulTaskBlockCandidates(suggestion: CiTaskBlockSuggestion): PrAssistantTaskBlockCandidate[] {
  return [
    ...suggestion.linked_code_candidate_matches.map((candidate) => ({ ...candidate, field: "code" as const })),
    ...suggestion.linked_test_candidate_matches.map((candidate) => ({ ...candidate, field: "tests" as const })),
  ];
}

function repairReviewItem(since: string, fix: RepairFix): PrAssistantReviewItem {
  return {
    type: "repair",
    task_id: fix.task_id,
    field: fix.field,
    old_path: fix.old_path,
    new_path: fix.new_path,
    command: `jumpspace repair --since ${since} --apply`,
    evidence: [`${fix.field}: ${fix.old_path} -> ${fix.new_path}`, `change_sources: ${fix.sources.join(", ") || "unknown"}`],
  };
}

function gapReviewItem(since: string, gap: RepairGap): PrAssistantReviewItem {
  return {
    type: "gap",
    task_id: gap.task_id,
    field: gap.field,
    path: gap.path,
    command: `jumpspace repair --since ${since} --apply`,
    evidence: [gap.message, `reason: ${gap.reason}`, `removes_link: ${gap.removes_link}`],
  };
}

function allowedFollowUpCommands(since: string, report: CiReport): string[] {
  const commands = ["jumpspace scan", "jumpspace audit --json", "jumpspace doctor --json"];
  if (report.suggestions.repair.mechanical_fixes.length > 0 || report.suggestions.repair.gaps.length > 0) {
    commands.unshift(`jumpspace repair --since ${since} --apply`);
  }
  return commands;
}

function renderReviewComment(report: Omit<PrAssistantReport, "review_comment">): string {
  return [
    PR_ASSISTANT_MARKER,
    `<!-- fingerprint:${report.idempotency.fingerprint} -->`,
    "# Jumpspace PR Assistant",
    "",
    `Since: ${report.since}`,
    `Status: ${report.ok ? "ok" : "blocked"}`,
    "",
    "This is a review-only packet generated from `jumpspace ci --since <ref> --json`. It does not mutate source files or branches. Apply suggestions only after human review.",
    "",
    "## Mutation Policy",
    "- Mutates source: no",
    "- Requires human approval: yes",
    `- Idempotency marker: \`${PR_ASSISTANT_MARKER}\``,
    "",
    "## Review Items",
    renderReviewItems(report.review_items),
    "",
    "## CI Packet",
    report.ci.pr_comment,
  ].join("\n");
}

function renderReviewItems(items: PrAssistantReviewItem[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map(renderReviewItem).join("\n");
}

function renderReviewItem(item: PrAssistantReviewItem): string {
  if (item.type === "task_block") {
    return [
      `- task block ${item.id} at ${item.path}:${item.line}`,
      ...item.evidence.map((evidence) => `  - evidence: ${evidence}`),
      "```markdown",
      item.body,
      "```",
    ].join("\n");
  }
  if (item.type === "repair") {
    return [
      `- repair ${item.task_id} ${item.field}: ${item.old_path} -> ${item.new_path}`,
      ...item.evidence.map((evidence) => `  - evidence: ${evidence}`),
      `  - apply after review: \`${item.command}\``,
    ].join("\n");
  }
  return [
    `- gap ${item.task_id} ${item.field}: ${item.path}`,
    ...item.evidence.map((evidence) => `  - evidence: ${evidence}`),
    `  - record after review: \`${item.command}\``,
  ].join("\n");
}

function renderFailureComment(since: string, errors: JsonCommandError[]): string {
  return [
    PR_ASSISTANT_MARKER,
    "# Jumpspace PR Assistant",
    "",
    `Since: ${since}`,
    "Status: blocked",
    "",
    "Jumpspace could not build the local CI packet. No source files or branches were mutated.",
    "",
    "## Structured Errors",
    "```json",
    JSON.stringify({ ok: false, errors }, null, 2),
    "```",
  ].join("\n");
}

function fingerprintReport(report: CiReport, items: PrAssistantReviewItem[]): string {
  const stable = {
    since: report.since,
    ok: report.ok,
    summary: report.summary,
    changed: report.changed.map((file) => ({
      path: file.path,
      old_path: file.old_path,
      statuses: file.statuses,
      sources: file.sources,
    })),
    review_items: items,
    audit_errors: report.audit.errors.map((issue) => issue.code),
    doctor_warnings: report.doctor.warnings.map((issue) => issue.code),
  };
  return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex").slice(0, 16);
}
