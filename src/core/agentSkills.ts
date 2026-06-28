import fs from "node:fs/promises";
import { atomicWriteFile } from "./atomicWrite.js";
import { pathExists, resolveRepoPath } from "./config.js";
import { upsertManagedBlock } from "./managedBlocks.js";

export type SkillAgent = "codex" | "claude";

export type InstalledSkillFile = {
  agent: SkillAgent;
  path: string;
  action: "created" | "updated" | "unchanged";
};

export type AddSkillResult = {
  ok: true;
  agents: SkillAgent[];
  files: InstalledSkillFile[];
};

type AgentSkillConfig = {
  agent: SkillAgent;
  guidancePath: string;
  guidanceBlockName: string;
  skillPath: string;
  skillBlockName: string;
  displayName: string;
};

export const SUPPORTED_SKILL_AGENTS: SkillAgent[] = ["codex", "claude"];

const AGENT_CONFIGS: Record<SkillAgent, AgentSkillConfig> = {
  codex: {
    agent: "codex",
    guidancePath: "AGENTS.md",
    guidanceBlockName: "codex",
    skillPath: ".codex/skills/jumpspace-workflow/SKILL.md",
    skillBlockName: "codex-skill",
    displayName: "Codex",
  },
  claude: {
    agent: "claude",
    guidancePath: "CLAUDE.md",
    guidanceBlockName: "claude",
    skillPath: ".claude/skills/jumpspace-workflow/SKILL.md",
    skillBlockName: "claude-skill",
    displayName: "Claude",
  },
};

export function isSkillAgent(value: string): value is SkillAgent {
  return SUPPORTED_SKILL_AGENTS.includes(value as SkillAgent);
}

export async function addJumpspaceSkills(root: string, agents: SkillAgent[]): Promise<AddSkillResult> {
  const uniqueAgents = unique(agents);
  const files: InstalledSkillFile[] = [];

  for (const agent of uniqueAgents) {
    files.push(await installAgentGuidance(root, agent));
    files.push(await installAgentSkillFile(root, agent));
  }

  return {
    ok: true,
    agents: uniqueAgents,
    files,
  };
}

export async function installAgentGuidance(root: string, agent: SkillAgent): Promise<InstalledSkillFile> {
  const config = AGENT_CONFIGS[agent];
  return upsertManagedMarkdownFile(root, {
    agent,
    targetPath: config.guidancePath,
    blockName: config.guidanceBlockName,
    content: guidanceMarkdown(config),
  });
}

async function installAgentSkillFile(root: string, agent: SkillAgent): Promise<InstalledSkillFile> {
  const config = AGENT_CONFIGS[agent];
  return upsertManagedMarkdownFile(root, {
    agent,
    targetPath: config.skillPath,
    blockName: config.skillBlockName,
    content: skillMarkdown(config),
    prefixWhenMissing: skillFrontmatter(),
  });
}

async function upsertManagedMarkdownFile(
  root: string,
  options: {
    agent: SkillAgent;
    targetPath: string;
    blockName: string;
    content: string;
    prefixWhenMissing?: string;
  },
): Promise<InstalledSkillFile> {
  const absolutePath = resolveRepoPath(root, options.targetPath);
  const exists = await pathExists(absolutePath);
  const existing = exists ? await fs.readFile(absolutePath, "utf8") : undefined;
  const base = prepareBaseMarkdown(existing, {
    prefixWhenMissing: options.prefixWhenMissing,
  });
  const next = upsertManagedBlock(base, {
    name: options.blockName,
    content: options.content,
  });

  if (existing === next) {
    return {
      agent: options.agent,
      path: options.targetPath,
      action: "unchanged",
    };
  }

  await atomicWriteFile(absolutePath, next);
  return {
    agent: options.agent,
    path: options.targetPath,
    action: exists ? "updated" : "created",
  };
}

function prepareBaseMarkdown(
  existing: string | undefined,
  options: {
    prefixWhenMissing?: string;
  },
): string | undefined {
  if (!existing?.trim()) {
    return options.prefixWhenMissing ? `${options.prefixWhenMissing.trimEnd()}\n` : undefined;
  }

  return existing;
}

function guidanceMarkdown(config: AgentSkillConfig): string {
  return [
    `## Jumpspace workflow for ${config.displayName}`,
    "",
    `- Detailed skill file: @${config.skillPath}`,
    "- Use this workflow by default for repo questions, feature work, branch review, first-graph bootstrap, and handoffs. The user should not have to say \"use Jumpspace\" on every request once this guidance is installed. If Jumpspace evidence is missing, weak, or stale, say that clearly and then fall back to normal code search.",
    "- Start with `jumpspace scan`, then use `jumpspace list`, `jumpspace find`, `jumpspace ask`, `jumpspace query`, or `jumpspace context <id>` before broad repo scanning.",
    "- Use `jumpspace bootstrap propose [paths...] --file <proposal-file> --json` when building the first graph for an existing repo; treat it as deterministic extraction evidence and review before apply.",
    "- Use `jumpspace work <id> --json` as the implementation start packet when a task has an approved durable plan; it includes recent task `mutation_history` for resumptions and handoffs.",
    "- Use `jumpspace semantic build --json` to explicitly enable optional local hybrid retrieval. The default backend is deterministic `local-task-vector-v1`; use `jumpspace semantic build --backend lancedb+onnx --model <local-model> --json` only when optional local LanceDB/ONNX packages and model files are available. Use `jumpspace semantic status --json` to check readiness or degraded fallback, `jumpspace semantic search \"<query>\" --json` for evidence with `graph_expansion` plus `connected_tasks`, and `jumpspace semantic eval --json` to compare lexical, local task-vector, and active semantic recall.",
    "- Use `jumpspace link suggest <id> --since <ref> --json` or `jumpspace link suggest <id> --path <path> --json` to preview code/test links; changed-file status is candidate context, not proof, so inspect `evidence.path_terms`, `evidence.basename_terms`, `evidence.identifier_terms`, `evidence.content_terms`, `evidence.phrase_matches`, and coverage before trusting a suggestion. Inspect `rejected_candidates` too; `NO_SOURCE_EVIDENCE` means the file was considered and deliberately not linked. Run `jumpspace link eval --json` after scorer or PR-assistant ranking changes; when a real repo exposes a bad ranking, add a JSON fixture and run `jumpspace link eval --file <fixture.json> --json`. Use `jumpspace link update <id> --dry-run --json` before applying explicit link changes.",
    "- Record step evidence with `jumpspace step complete <task-id> <step-id> --evidence \"...\"`.",
    "- Parallelize read-only discovery and checks when useful, but sequence task-block mutations when practical. Jumpspace serializes `status`, `plan save`, `step complete`, `verify`, `link update`, and `repair --apply` through `.jumpspace/locks/mutation.lock`; JSON lock failures use `MUTATION_LOCK_TIMEOUT`.",
    "- Use `jumpspace verify` to earn `verified`; do not set `verified` with `jumpspace status`.",
    "- For repeated integrations, prefer SDK contracts and generated schema artifacts over ad hoc JSON parsing: TypeScript imports from `jumpspace/sdk`, Python can use `sdk/python/jumpspace_sdk`, and package consumers can pin `jumpspace/schemas/catalog.json` plus `jumpspace/schemas/<name>.schema.json`. Run `jumpspace schema coverage --json` before relying on new command surfaces. `jumpspace schema show handoff --json` documents the post-work recap packet. Write-side schemas such as `plan.save`, `step.complete`, `status`, `verify`, `ready`, `next`, and `execute` are published too.",
    "- Before npm publish or launch validation, run `jumpspace release doctor --json`; add `--check-registry` only when network access is available and you explicitly want registry availability checked.",
    "- When an agent or shell appears to be running an old linked build, run `jumpspace release install-doctor --json`; it compares the invoked binary and PATH-resolved `jumpspace` against the current checkout and reports repair commands such as `npm run build`, `npm link`, or `hash -r`.",
    "- Use `--compact` with `--json` on `find`, `ask`, and `related` when you need bounded orientation output before requesting a full `work` packet.",
    "- If a Git baseline is available, use `jumpspace ci --since <ref> --json` before handoff for one PR-style packet with scan, audit, doctor, drift, repair suggestions, graph query results, and proposed task blocks. Task-block code/test candidates are ranked per heading with the same weighted source-evidence details as `link suggest`; treat those candidates as suggestions, not applied links, and inspect `rejected_candidate_matches` before assuming touched files were missed.",
    "- If a Git baseline is available, use `jumpspace pr comment --since <ref>` when you need an idempotent review-only handoff comment; replace an existing comment with the same Jumpspace marker only after human review.",
    "- To install the GitHub PR assistant loop, preview `jumpspace init --ci github --dry-run --json`, then run `jumpspace init --ci github` only when the managed workflow change is intended.",
    "- If a Git baseline is available, use `jumpspace doctor --since <ref> --json` and review `jumpspace repair --since <ref> --json` before applying self-healing repairs.",
    "- Treat task identity as the task ID. Use `doc.line`, `doc.level`, and `doc.parent_headings` when duplicate headings make title-only anchors ambiguous.",
    "- Source document renames require scan/config review; source document deletions require restore, recreate, stale/supersede, or explicit gap handling.",
    "- Use the work packet's `mutation_history` for recent task context. Run `jumpspace last --json` after Jumpspace mutations, use `jumpspace history --task <id> --json` when you need a deeper task/session trail, then run `jumpspace scan`, `jumpspace audit --json`, `jumpspace doctor --json`, and `jumpspace handoff --task <id> --json` before handing work back.",
  ].join("\n");
}

function skillFrontmatter(): string {
  return [
    "---",
    "name: jumpspace-workflow",
    "description: Use repo-local Jumpspace implementation memory before editing feature behavior, answering repo questions, or bootstrapping a graph.",
    "---",
  ].join("\n");
}

function skillMarkdown(config: AgentSkillConfig): string {
  return [
    "# Jumpspace workflow",
    "",
    `Use this skill by default in ${config.displayName} when a repository has Jumpspace installed, when answering repo questions, when implementing feature behavior, when reviewing branch drift, or when bootstrapping the first graph. The user should not have to say "use Jumpspace" on every request.`,
    "",
    "## Workflow",
    "",
    "1. Run `jumpspace scan` to refresh the repo-local index.",
    "2. Use `jumpspace find <keywords> --mode any --json`, `jumpspace ask \"<question>\" --json`, `jumpspace query --json`, or `jumpspace context <id> --json` to gather grounded context.",
    "3. For new work, prefer documented tasks and durable plans: `jumpspace work <id> --json` is the implementation start packet and includes recent task `mutation_history`; add `--since <ref>` when drift should be included.",
    "4. For first-graph setup in an existing repo, run `jumpspace bootstrap propose [paths...] --file <proposal-file> --json` for a deterministic draft; use `jumpspace bootstrap context <paths...> --json` for raw heading evidence when refining it, ask for human approval, then apply only approved proposal data.",
    "5. If semantic retrieval is useful, run `jumpspace semantic build --json`; select `--backend lancedb+onnx --model <local-model>` only when the optional local embedding runtime is installed. Then use `jumpspace semantic status --json`, `jumpspace semantic eval --json`, `jumpspace semantic search \"<query>\" --json`, or hybrid `jumpspace ask \"<question>\" --json` as evidence, including backend metadata, degraded fallback, `graph_expansion` paths, and `connected_tasks`.",
    "6. Use `jumpspace link suggest <id> --since <ref> --json` or explicit `--path` candidates before changing task links; changed-file status is candidate context, not proof, so inspect `evidence.path_terms`, `evidence.basename_terms`, `evidence.identifier_terms`, `evidence.content_terms`, `evidence.phrase_matches`, coverage, and `rejected_candidates` before trusting a suggestion. `NO_SOURCE_EVIDENCE` means the file was considered and deliberately not linked. Run `jumpspace link eval --json` after scorer or PR-assistant ranking changes; when a real repo exposes a bad ranking, add a JSON fixture and run `jumpspace link eval --file <fixture.json> --json`. Apply with `jumpspace link update <id> --dry-run --json` first, then without `--dry-run` only after the change is intended.",
    "7. After edits, run focused checks, record step evidence with `jumpspace step complete`, and use `jumpspace verify` when acceptance criteria are covered.",
    "8. Parallelize read-only discovery and checks when useful, but sequence task-block mutations when practical. Jumpspace serializes `status`, `plan save`, `step complete`, `verify`, `link update`, and `repair --apply` through `.jumpspace/locks/mutation.lock`; JSON lock failures use `MUTATION_LOCK_TIMEOUT`.",
    "9. Before npm publish or launch validation, run `jumpspace release doctor --json`; add `--check-registry` only when network access is available and you explicitly want registry availability checked. If an agent or shell appears to be running an old linked build, run `jumpspace release install-doctor --json` to compare the invoked and PATH-resolved binaries against the current checkout.",
    "10. If a Git baseline is available, run `jumpspace ci --since <ref> --json` for a PR-style packet with scan, audit, doctor, drift, repair suggestions, graph query results, and proposed task blocks. Task-block code/test candidates are ranked per heading with the same weighted source-evidence details as `link suggest`; treat those candidates as suggestions, not applied links, and inspect `rejected_candidate_matches` before assuming touched files were missed. Use `jumpspace pr comment --since <ref>` when you need an idempotent review-only handoff comment.",
    "11. To install the GitHub PR assistant loop, preview `jumpspace init --ci github --dry-run --json`, then run `jumpspace init --ci github` only when the managed workflow change is intended.",
    "12. If a Git baseline is available, run `jumpspace doctor --since <ref> --json` and preview any repair with `jumpspace repair --since <ref> --json` before applying it.",
    "13. Treat task identity as the task ID. When headings repeat, use `doc.line`, `doc.level`, and `doc.parent_headings`; handle source document renames with scan/config review and source document deletions with restore, recreate, stale/supersede, or explicit gaps.",
    "14. Finish with `jumpspace last --json`, use `jumpspace history --task <id> --json` when you need a deeper task/session trail than the work packet, then run `jumpspace scan`, `jumpspace audit --json`, `jumpspace doctor --json`, and `jumpspace handoff --task <id> --json`. Report changed or verified task IDs and the handoff packet status.",
    "",
    "Do not invent code links, test links, dependencies, repair evidence, or verification evidence. Treat `jumpspace ask` as an evidence summary rather than an authoritative answer, even when it uses hybrid semantic retrieval. Treat `jumpspace bootstrap propose` as deterministic extraction evidence, not a finished graph. Use `jumpspace query` for deterministic graph-shaped questions over dependencies, refs, modules, linked files, verification state, or gaps. Use `--compact` with `--json` on `find`, `ask`, and `related` when you need bounded orientation output before requesting a full `work` packet. Use `jumpspace link suggest` for evidence-backed link candidates, inspect `rejected_candidates` for files considered but rejected, and apply only explicit link changes with `jumpspace link update`; changed-file status is not evidence unless weighted source evidence such as path terms, basename terms, identifier terms, content terms, phrase matches, and coverage explain the link. Run `jumpspace link eval --json` after changing scorer, evidence, stop-word, or PR-assistant ranking behavior; when a real repo exposes a bad ranking, add a JSON fixture and run `jumpspace link eval --file <fixture.json> --json`. Metadata-writing commands are lock-protected through `.jumpspace/locks/mutation.lock`; reads can be parallel, but mutations should be sequenced when practical and `MUTATION_LOCK_TIMEOUT` should be treated as a retryable structured failure. Use `jumpspace last --json` for the latest mutation, `jumpspace history --task <id> --json` for task/session trails, and `jumpspace handoff --task <id> --json` before handing work to another agent or human; the handoff packet summarizes recent mutations, graph health, task state, and suggested next commands. Use `jumpspace ci --since <ref> --json` before handoff when a Git baseline exists and you need one review packet, and inspect `rejected_candidate_matches` in proposed task blocks; use `jumpspace pr comment --since <ref>` when a human or wrapper needs an idempotent review-only PR comment. Run `jumpspace release doctor --json` before npm publish or launch validation; use `--check-registry` only when network access is available and registry availability should be checked. Run `jumpspace release install-doctor --json` when an agent or shell appears to be testing a stale linked build. Preview `jumpspace init --ci github --dry-run --json` before installing the managed GitHub workflow, and do not overwrite user-owned workflows. Prefer `jumpspace/sdk`, `sdk/python/jumpspace_sdk`, or generated `jumpspace/schemas/*.json` artifacts when building repeated integrations; run `jumpspace schema coverage --json` before trusting newly added JSON commands. `jumpspace schema show handoff --json` documents the post-work recap packet. Write-side commands publish schemas too, including `plan.save`, `step.complete`, `status`, and `verify`. Apply repair only after reviewing the dry-run: linked-file renames are mechanical fixes, deleted or missing linked files become explicit gaps, source document renames require scan/config review, and source document deletions require restore, recreate, stale/supersede, or explicit gap handling.",
  ].join("\n");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
