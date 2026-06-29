import fs from "node:fs/promises";
import { atomicWriteFile } from "./atomicWrite.js";
import { pathExists, resolveRepoPath } from "./config.js";
import { upsertManagedBlock } from "./managedBlocks.js";

export type SkillAgent = "codex" | "claude";

export type AgentSkillName =
  | "jumpspace-workflow"
  | "jumpspace-bootstrap"
  | "jumpspace-work"
  | "jumpspace-review"
  | "jumpspace-handoff";

export type InstalledSkillFile = {
  agent: SkillAgent;
  path: string;
  action: "created" | "updated" | "unchanged";
  skill?: AgentSkillName;
};

export type AddSkillResult = {
  ok: true;
  agents: SkillAgent[];
  skills: AgentSkillName[];
  files: InstalledSkillFile[];
};

type AgentSkillConfig = {
  agent: SkillAgent;
  guidancePath: string;
  guidanceBlockName: string;
  skillRoot: string;
  displayName: string;
};

type AgentSkillDefinition = {
  name: AgentSkillName;
  title: string;
  description: string;
  markdown: (config: AgentSkillConfig) => string;
};

export const SUPPORTED_SKILL_AGENTS: SkillAgent[] = ["codex", "claude"];

export const SUPPORTED_AGENT_SKILLS: AgentSkillName[] = [
  "jumpspace-workflow",
  "jumpspace-bootstrap",
  "jumpspace-work",
  "jumpspace-review",
  "jumpspace-handoff",
];

const SKILL_ALIASES: Record<string, AgentSkillName> = {
  workflow: "jumpspace-workflow",
  bootstrap: "jumpspace-bootstrap",
  work: "jumpspace-work",
  review: "jumpspace-review",
  handoff: "jumpspace-handoff",
  "jumpspace-workflow": "jumpspace-workflow",
  "jumpspace-bootstrap": "jumpspace-bootstrap",
  "jumpspace-work": "jumpspace-work",
  "jumpspace-review": "jumpspace-review",
  "jumpspace-handoff": "jumpspace-handoff",
};

const AGENT_CONFIGS: Record<SkillAgent, AgentSkillConfig> = {
  codex: {
    agent: "codex",
    guidancePath: "AGENTS.md",
    guidanceBlockName: "codex",
    skillRoot: ".codex/skills",
    displayName: "Codex",
  },
  claude: {
    agent: "claude",
    guidancePath: "CLAUDE.md",
    guidanceBlockName: "claude",
    skillRoot: ".claude/skills",
    displayName: "Claude",
  },
};

const SKILL_DEFINITIONS: Record<AgentSkillName, AgentSkillDefinition> = {
  "jumpspace-workflow": {
    name: "jumpspace-workflow",
    title: "Jumpspace workflow",
    description:
      "Use repo-local Jumpspace implementation memory before editing feature behavior, answering repo questions, or bootstrapping a graph.",
    markdown: workflowSkillMarkdown,
  },
  "jumpspace-bootstrap": {
    name: "jumpspace-bootstrap",
    title: "Jumpspace bootstrap",
    description:
      "Bootstrap source-backed Jumpspace task memory from existing Markdown docs with proposal, validation, and human approval.",
    markdown: bootstrapSkillMarkdown,
  },
  "jumpspace-work": {
    name: "jumpspace-work",
    title: "Jumpspace work",
    description:
      "Start implementation from an approved Jumpspace task packet, execute the durable plan, and record evidence.",
    markdown: workSkillMarkdown,
  },
  "jumpspace-review": {
    name: "jumpspace-review",
    title: "Jumpspace review",
    description:
      "Review branch drift, changed files, task links, and PR evidence without mutating source by default.",
    markdown: reviewSkillMarkdown,
  },
  "jumpspace-handoff": {
    name: "jumpspace-handoff",
    title: "Jumpspace handoff",
    description:
      "Prepare a source-backed handoff packet so the next agent can resume without relying on chat history.",
    markdown: handoffSkillMarkdown,
  },
};

export function isSkillAgent(value: string): value is SkillAgent {
  return SUPPORTED_SKILL_AGENTS.includes(value as SkillAgent);
}

export function resolveAgentSkillName(value: string): AgentSkillName | undefined {
  return SKILL_ALIASES[value.trim().toLowerCase()];
}

export function isAgentSkillName(value: string): value is AgentSkillName {
  return resolveAgentSkillName(value) === value;
}

export async function addJumpspaceSkills(
  root: string,
  agents: SkillAgent[],
  options: { skills?: AgentSkillName[] } = {},
): Promise<AddSkillResult> {
  const uniqueAgents = unique(agents);
  const skills = normalizeRequestedSkills(options.skills);
  const files: InstalledSkillFile[] = [];

  for (const agent of uniqueAgents) {
    const guidanceSkills = await guidanceSkillNames(root, agent, skills);
    files.push(await installAgentGuidance(root, agent, guidanceSkills));
    for (const skill of skills) {
      files.push(await installAgentSkillFile(root, agent, skill));
    }
  }

  return {
    ok: true,
    agents: uniqueAgents,
    skills,
    files,
  };
}

export async function installAgentGuidance(
  root: string,
  agent: SkillAgent,
  skillNames: AgentSkillName[] = ["jumpspace-workflow"],
): Promise<InstalledSkillFile> {
  const config = AGENT_CONFIGS[agent];
  return upsertManagedMarkdownFile(root, {
    agent,
    targetPath: config.guidancePath,
    blockName: config.guidanceBlockName,
    content: guidanceMarkdown(config, normalizeRequestedSkills(skillNames)),
  });
}

async function installAgentSkillFile(root: string, agent: SkillAgent, skill: AgentSkillName): Promise<InstalledSkillFile> {
  const config = AGENT_CONFIGS[agent];
  const definition = SKILL_DEFINITIONS[skill];
  return upsertManagedMarkdownFile(root, {
    agent,
    skill,
    targetPath: skillPath(config, skill),
    blockName: skillBlockName(agent, skill),
    content: definition.markdown(config),
    prefixWhenMissing: skillFrontmatter(definition),
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
    skill?: AgentSkillName;
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
      skill: options.skill,
    };
  }

  await atomicWriteFile(absolutePath, next);
  return {
    agent: options.agent,
    path: options.targetPath,
    action: exists ? "updated" : "created",
    skill: options.skill,
  };
}

async function guidanceSkillNames(root: string, agent: SkillAgent, selectedSkills: AgentSkillName[]): Promise<AgentSkillName[]> {
  const config = AGENT_CONFIGS[agent];
  const existing: AgentSkillName[] = [];
  for (const skill of SUPPORTED_AGENT_SKILLS) {
    if (await pathExists(resolveRepoPath(root, skillPath(config, skill)))) {
      existing.push(skill);
    }
  }
  return normalizeRequestedSkills([...existing, ...selectedSkills]);
}

function normalizeRequestedSkills(skills: AgentSkillName[] | undefined): AgentSkillName[] {
  const requested = skills && skills.length > 0 ? skills : SUPPORTED_AGENT_SKILLS;
  return unique(["jumpspace-workflow", ...requested]);
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

function skillPath(config: AgentSkillConfig, skill: AgentSkillName): string {
  return `${config.skillRoot}/${skill}/SKILL.md`;
}

function skillBlockName(agent: SkillAgent, skill: AgentSkillName): string {
  return skill === "jumpspace-workflow" ? `${agent}-skill` : `${agent}-${skill}-skill`;
}

function guidanceMarkdown(config: AgentSkillConfig, skillNames: AgentSkillName[]): string {
  const skillLines = normalizeRequestedSkills(skillNames).map((skill) => {
    const definition = SKILL_DEFINITIONS[skill];
    return `- @${skillPath(config, skill)} - ${definition.title}: ${definition.description}`;
  });

  return [
    `## Jumpspace workflow for ${config.displayName}`,
    "",
    "Installed skill files:",
    ...skillLines,
    "",
    "- Use Jumpspace by default for repo questions, feature work, branch review, first-graph bootstrap, and handoffs. The user should not have to say \"use Jumpspace\" on every request once this guidance is installed.",
    "- Use the reference workflow skill for general command choice and safety rules.",
    "- Use `jumpspace-bootstrap` when converting existing docs into task memory.",
    "- Use `jumpspace-work` when starting implementation from an approved task.",
    "- Use `jumpspace-review` when checking branch drift, link suggestions, CI packets, or PR comments.",
    "- Use `jumpspace-handoff` before pausing, switching agents, or returning work to a human.",
    "- If Jumpspace evidence is missing, weak, or stale, say that clearly and then fall back to normal code search.",
  ].join("\n");
}

function skillFrontmatter(definition: AgentSkillDefinition): string {
  return [
    "---",
    `name: ${definition.name}`,
    `description: ${definition.description}`,
    "---",
  ].join("\n");
}

function workflowSkillMarkdown(config: AgentSkillConfig): string {
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
    "Do not invent code links, test links, dependencies, repair evidence, or verification evidence. Treat `jumpspace ask` as an evidence summary rather than an authoritative answer, even when it uses hybrid semantic retrieval. Treat `jumpspace bootstrap propose` as deterministic extraction evidence, not a finished graph. Use `jumpspace query` for deterministic graph-shaped questions over dependencies, refs, modules, linked files, verification state, or gaps. Use `--compact` with `--json` on `find`, `ask`, and `related` when you need bounded orientation output before requesting a full `work` packet. Use `jumpspace link suggest` for evidence-backed link candidates, inspect `rejected_candidates` for files considered but rejected, and apply only explicit link changes with `jumpspace link update`; changed-file status is not evidence unless weighted source evidence such as path terms, basename terms, identifier terms, content terms, phrase matches, and coverage explain the link. Run `jumpspace link eval --json` after changing scorer, evidence, stop-word, or PR-assistant ranking behavior; when a real repo exposes a bad ranking, add a JSON fixture and run `jumpspace link eval --file <fixture.json> --json`. Metadata-writing commands are lock-protected through `.jumpspace/locks/mutation.lock`; reads can be parallel, but mutations should be sequenced when practical and `MUTATION_LOCK_TIMEOUT` should be treated as a retryable structured failure. Use `jumpspace last --json` for the latest mutation, `jumpspace history --task <id> --json` for task/session trails, and `jumpspace handoff --task <id> --json` before handing work to another agent or human; the handoff packet summarizes recent mutations, graph health, task state, and suggested next commands. Use `jumpspace ci --since <ref> --json` before handoff when a Git baseline exists and you need one review packet, and inspect `rejected_candidate_matches` in proposed task blocks; use `jumpspace pr comment --since <ref>` when a human or wrapper needs an idempotent review-only PR comment. Run `jumpspace release doctor --json` before npm publish or launch validation; use `--check-registry` only when network access is available and registry availability should be checked. Run `jumpspace release install-doctor --json` when an agent or shell appears to be testing a stale linked build. Preview `jumpspace init --ci github --dry-run --json` before installing the managed GitHub workflow, and do not overwrite user-owned workflows. Prefer `@jumpspace/cli/sdk`, `sdk/python/jumpspace_sdk`, or generated `@jumpspace/cli/schemas/*.json` artifacts when building repeated integrations; run `jumpspace schema coverage --json` before trusting newly added JSON commands. `jumpspace schema show handoff --json` documents the post-work recap packet. Write-side commands publish schemas too, including `plan.save`, `step.complete`, `status`, and `verify`. Apply repair only after reviewing the dry-run: linked-file renames are mechanical fixes, deleted or missing linked files become explicit gaps, source document renames require scan/config review, and source document deletions require restore, recreate, stale/supersede, or explicit gap handling.",
  ].join("\n");
}

function bootstrapSkillMarkdown(config: AgentSkillConfig): string {
  return [
    "# Jumpspace bootstrap",
    "",
    `Use this pipeline skill in ${config.displayName} when converting existing Markdown docs into source-backed Jumpspace task memory.`,
    "",
    "## Goal",
    "",
    "Create a small, reviewable first graph from existing docs without pretending extraction is the same thing as human approval.",
    "",
    "## Workflow",
    "",
    "1. Run `jumpspace bootstrap discover --json` to inspect common docs roots and recommended config.",
    "2. Run `jumpspace bootstrap context <paths...> --json` when an AI agent needs heading lines, parent headings, excerpts, existing IDs, and linked-file hints before proposing task blocks.",
    "3. Draft with `jumpspace bootstrap propose <paths...> --file jumpspace-bootstrap.json --json` or have the agent write a proposal from context evidence.",
    "4. Validate with `jumpspace bootstrap validate --file jumpspace-bootstrap.json --json`.",
    "5. Show the proposal and validation result to the human. Do not apply unreviewed task blocks.",
    "6. Preview writes with `jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run --json`.",
    "7. Apply only after approval with `jumpspace bootstrap apply --file jumpspace-bootstrap.json --json`.",
    "8. Finish with `jumpspace scan`, `jumpspace doctor --json`, and `jumpspace handoff --json`.",
    "",
    "## Guardrails",
    "",
    "- Prefer a few high-value docs over a whole-repo bootstrap.",
    "- Leave code and test links empty unless source evidence is explicit.",
    "- Use `source.line`, `source.level`, and `source.parent_headings` when headings repeat.",
    "- Treat deterministic proposals as extraction evidence, not a finished graph.",
    "- Record gaps rather than inventing links, dependencies, or acceptance criteria.",
  ].join("\n");
}

function workSkillMarkdown(config: AgentSkillConfig): string {
  return [
    "# Jumpspace work",
    "",
    `Use this pipeline skill in ${config.displayName} when starting implementation from an approved Jumpspace task.`,
    "",
    "## Goal",
    "",
    "Begin from a source-backed work packet, execute the durable plan, and write evidence back to the repo.",
    "",
    "## Workflow",
    "",
    "1. Run `jumpspace scan`.",
    "2. Find the task with `jumpspace find <keywords> --json --compact` or inspect `jumpspace ready --json`.",
    "3. Validate execution state with `jumpspace plan validate <id> --json` and `jumpspace next <id> --json`.",
    "4. Start with `jumpspace work <id> --json`; add `--since <ref>` when branch drift matters.",
    "5. Read linked docs, code, tests, acceptance criteria, plan steps, verification records, and guardrails before editing.",
    "6. Implement the next unblocked step and run focused checks.",
    "7. Record progress with `jumpspace step complete <id> <step-id> --evidence \"...\"`.",
    "8. Earn verification with `jumpspace verify <id> --check \"<command>\" --criteria <criterion-id> --evidence \"...\" --json` when criteria are covered.",
    "9. Finish with `jumpspace scan`, `jumpspace audit --json`, `jumpspace doctor --json`, and `jumpspace handoff --task <id> --json`.",
    "",
    "## Guardrails",
    "",
    "- Do not set `verified` with `jumpspace status`; use `jumpspace verify`.",
    "- Do not complete blocked plan steps or steps without evidence.",
    "- Fall back to code search when linked files are missing, weak, or stale.",
    "- Report the task ID, checks run, evidence recorded, and handoff status.",
  ].join("\n");
}

function reviewSkillMarkdown(config: AgentSkillConfig): string {
  return [
    "# Jumpspace review",
    "",
    `Use this pipeline skill in ${config.displayName} when reviewing branch drift, task-memory health, link suggestions, or PR evidence.`,
    "",
    "## Goal",
    "",
    "Produce a review packet that separates facts from recommendations and avoids mutating source by default.",
    "",
    "## Workflow",
    "",
    "1. Run `jumpspace scan`.",
    "2. Inspect changed files with `jumpspace changed --since <ref> --json`.",
    "3. Inspect drift with `jumpspace drift --since <ref> --json`; keep facts separate from warnings.",
    "4. Run `jumpspace ci --since <ref> --json` for one local PR packet with audit, doctor, drift, repair opportunities, graph queries, and suggestions.",
    "5. Render review text with `jumpspace pr comment --since <ref>` when a human or wrapper needs an idempotent PR comment.",
    "6. Use `jumpspace link suggest <id> --since <ref> --json` to inspect evidence-backed link candidates; changed-file status alone is not proof.",
    "7. Preview repairs with `jumpspace repair --since <ref> --json`; apply only after explicit human approval.",
    "8. Finish with `jumpspace handoff --json` or `jumpspace handoff --task <id> --json`.",
    "",
    "## Guardrails",
    "",
    "- `pr comment` prints text; it does not post to GitHub.",
    "- Treat proposed links and repairs as suggestions until reviewed.",
    "- Inspect rejected candidates before claiming a touched file was missed.",
    "- Report residual warnings and unresolved gaps honestly.",
  ].join("\n");
}

function handoffSkillMarkdown(config: AgentSkillConfig): string {
  return [
    "# Jumpspace handoff",
    "",
    `Use this pipeline skill in ${config.displayName} before pausing work, switching agents, or returning work to a human.`,
    "",
    "## Goal",
    "",
    "Make the next agent independent of private chat history by preserving source-backed task state and evidence.",
    "",
    "## Workflow",
    "",
    "1. Run `jumpspace scan`.",
    "2. Run `jumpspace audit --json` and `jumpspace doctor --json`; include `--since <ref>` when a Git baseline is available.",
    "3. Review recent mutation state with `jumpspace last --json` and `jumpspace history --task <id> --json` when a task is involved.",
    "4. Record completed steps with `jumpspace step complete` and verification with `jumpspace verify` before handoff when appropriate.",
    "5. Record explicit gaps with `jumpspace link update <id> --gap \"...\" --dry-run --json` before applying them.",
    "6. Generate the handoff packet with `jumpspace handoff --task <id> --json` or `jumpspace handoff --json`.",
    "7. Summarize task IDs, changed files, checks, evidence, warnings, and suggested next commands.",
    "",
    "## Guardrails",
    "",
    "- Do not rely on chat history as the source of truth.",
    "- Do not claim verification unless `jumpspace verify` recorded it.",
    "- Leave unresolved launch, docs, npm, GitHub, or Netlify gaps explicit.",
    "- Tell the next agent which Jumpspace command to run first.",
  ].join("\n");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
