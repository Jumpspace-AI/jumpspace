import path from "node:path";
import { createBootstrapContext, validateBootstrapProposal, type BootstrapContext, type BootstrapValidationResult } from "./bootstrap.js";
import type { BootstrapProposal, BootstrapTaskProposal } from "./bootstrapProposal.js";
import { discoverDocs, type DiscoveryResult } from "./discovery.js";

export type BootstrapProposeOptions = {
  patterns?: string[];
};

export type BootstrapProposeResult = {
  ok: true;
  propose_version: 1;
  mode: "deterministic_extraction";
  agent_generated: false;
  human_approval_required: true;
  inputs: {
    pattern_source: "arguments" | "discovery" | "config";
    patterns: string[];
    discovered_docs: string[];
  };
  summary: {
    documents: number;
    headings: number;
    proposed_tasks: number;
    skipped_headings: number;
    existing_tasks: number;
    validation_errors: number;
    validation_warnings: number;
  };
  proposal: BootstrapProposal;
  validation: BootstrapValidationResult;
  next_commands: {
    validate: string;
    dry_run: string;
    apply_after_approval: string;
  };
  notes: string[];
};

export async function createBootstrapProposalDraft(root: string, options: BootstrapProposeOptions = {}): Promise<BootstrapProposeResult> {
  const discovery = await discoverDocs(root);
  const patterns = selectPatterns(options.patterns ?? [], discovery);
  const context = await createBootstrapContext(root, patterns.patterns);
  const proposal = buildProposalFromContext(context);
  const validation = await validateBootstrapProposal(root, proposal);

  return {
    ok: true,
    propose_version: 1,
    mode: "deterministic_extraction",
    agent_generated: false,
    human_approval_required: true,
    inputs: {
      pattern_source: patterns.source,
      patterns: patterns.patterns,
      discovered_docs: discovery.recommended_docs,
    },
    summary: {
      documents: context.paths.length,
      headings: context.headings.length,
      proposed_tasks: proposal.tasks.length,
      skipped_headings: proposal.skipped.length,
      existing_tasks: context.headings.filter((heading) => heading.has_jumpspace_task).length,
      validation_errors: validation.errors.length,
      validation_warnings: validation.warnings.length,
    },
    proposal,
    validation,
    next_commands: {
      validate: "jumpspace bootstrap validate --file <proposal-file> --json",
      dry_run: "jumpspace bootstrap apply --file <proposal-file> --dry-run --json",
      apply_after_approval: "jumpspace bootstrap apply --file <proposal-file>",
    },
    notes: [
      "This proposal is deterministic extraction, not agent reasoning.",
      "Review task boundaries, titles, links, gaps, and skipped headings before apply.",
      "Apply remains the human approval boundary and is never run by propose.",
    ],
  };
}

function selectPatterns(
  requestedPatterns: string[],
  discovery: DiscoveryResult,
): { source: BootstrapProposeResult["inputs"]["pattern_source"]; patterns: string[] } {
  if (requestedPatterns.length > 0) {
    return { source: "arguments", patterns: requestedPatterns };
  }
  if (discovery.recommended_docs.length > 0) {
    return { source: "discovery", patterns: discovery.recommended_docs };
  }
  return { source: "config", patterns: [] };
}

function buildProposalFromContext(context: BootstrapContext): BootstrapProposal {
  const tasks: BootstrapTaskProposal[] = [];
  const skipped: BootstrapProposal["skipped"] = [];

  for (const heading of context.headings) {
    if (heading.has_jumpspace_task) {
      skipped.push({
        path: heading.path,
        heading: heading.heading,
        line: heading.line,
        level: heading.level,
        parent_headings: heading.parent_headings,
        reason: `Heading already has Jumpspace task ${heading.task_id}.`,
      });
      continue;
    }

    if (!hasOwnEvidence(heading)) {
      skipped.push({
        path: heading.path,
        heading: heading.heading,
        line: heading.line,
        level: heading.level,
        parent_headings: heading.parent_headings,
        reason: "Heading has no own prose or linked file hints to cite.",
      });
      continue;
    }

    const linkedTests = heading.linked_file_hints.filter(isTestPath);
    const linkedCode = heading.linked_file_hints.filter((repoPath) => !isTestPath(repoPath) && !isMarkdownPath(repoPath));
    const evidenceReason = [
      "Deterministic bootstrap extracted this heading from source context.",
      linkedCode.length > 0 ? `Explicit code path hints: ${linkedCode.join(", ")}.` : undefined,
      linkedTests.length > 0 ? `Explicit test path hints: ${linkedTests.join(", ")}.` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    const gaps = [
      linkedCode.length === 0 ? "No explicit code links were cited in this heading." : undefined,
      linkedTests.length === 0 ? "No explicit test links were cited in this heading." : undefined,
      heading.descendant_linked_file_hints.length > 0 ? "Descendant sections cite files; review before attaching them to this task." : undefined,
      heading.descendant_excerpt ? "Descendant sections contain additional prose; review before expanding this task boundary." : undefined,
    ].filter((gap): gap is string => Boolean(gap));

    tasks.push({
      id: heading.suggested_id,
      title: heading.heading,
      source: {
        path: heading.path,
        heading: heading.heading,
        line: heading.line,
        level: heading.level,
        parent_headings: heading.parent_headings,
      },
      type: inferTaskType(heading.heading, heading.path),
      status: "draft",
      space: "repo",
      keywords: keywordsForHeading(heading.heading),
      summary: summaryFromExcerpt(heading.own_excerpt),
      code: linkedCode,
      tests: linkedTests,
      depends_on: [],
      refs: [],
      evidence: [
        {
          path: heading.path,
          heading: heading.heading,
          quote: quoteFromExcerpt(heading.own_excerpt),
          reason: evidenceReason,
        },
      ],
      confidence: confidenceForHeading(heading.own_excerpt, linkedCode.length + linkedTests.length),
      gaps,
    });
  }

  return {
    version: 1,
    tasks,
    skipped,
  };
}

function hasOwnEvidence(heading: BootstrapContext["headings"][number]): boolean {
  return heading.own_excerpt.trim().length > 0 || heading.linked_file_hints.length > 0;
}

function summaryFromExcerpt(excerptValue: string): string | undefined {
  const summary = quoteFromExcerpt(excerptValue);
  return summary || undefined;
}

function quoteFromExcerpt(excerptValue: string): string | undefined {
  const normalized = excerptValue.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.length > 240 ? `${normalized.slice(0, 237).trimEnd()}...` : normalized;
}

function confidenceForHeading(excerptValue: string, linkedHintCount: number): number {
  if (excerptValue.trim() && linkedHintCount > 0) {
    return 0.75;
  }
  if (excerptValue.trim()) {
    return 0.65;
  }
  return 0.55;
}

function keywordsForHeading(heading: string): string[] {
  const words = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  return [...new Set(words)].slice(0, 8);
}

function inferTaskType(heading: string, repoPath: string): BootstrapTaskProposal["type"] {
  const lower = `${heading} ${repoPath}`.toLowerCase();
  if (lower.includes("adr") || lower.includes("decision record")) {
    return "adr";
  }
  return "spec";
}

function isMarkdownPath(repoPath: string): boolean {
  return [".md", ".mdx"].includes(path.extname(repoPath).toLowerCase());
}

function isTestPath(repoPath: string): boolean {
  const normalized = repoPath.replaceAll("\\", "/").toLowerCase();
  const basename = path.basename(normalized);
  return normalized.includes("/test/") || normalized.includes("/tests/") || basename.includes(".test.") || basename.includes(".spec.");
}

const STOP_WORDS = new Set(["and", "the", "for", "with", "from", "into", "this", "that"]);
