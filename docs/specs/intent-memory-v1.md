# Intent Memory v1 Product Requirements

Status: draft
Date: 2026-06-30

## Summary

Jumpspace should make repo-local intent memory its default product surface. The
primary durable object is an intent: a small, scoped decision record that
captures what code cannot tell an agent, especially rationale, project state,
external constraints, implicit guarantees, and rejected alternatives.

Task graphs, plans, work packets, and verification state remain useful, but
they are advanced workflow features. They should not be the default unit that a
coding agent produces for every feature. For ordinary work, the durable output
of a design or implementation conversation should be 0-3 high-signal intents,
not dozens of task units.

## Background

Jumpspace currently models implementation memory around task blocks. A task can
carry status, code links, tests, dependencies, refs, sources, gaps, acceptance
criteria, durable plans, and verification records. That model is powerful, but
the default experience is too heavy: one feature-planning session produced 76
task units for human review. The product is preserving implementation
management state when the user often only needs the agent to remember a small
set of important decisions.

The NeuroSync paper, "Intent-Aware Code-Based Problem Solving via Direct LLM
Understanding Modification" (arXiv:2508.02823), reinforces this diagnosis.
The paper identifies bidirectional ambiguity: user intent and coding tasks are
both nonlinear, but prompts and generated code are linear. NeuroSync responds
by externalizing the model's inferred task structure before code generation so
users can inspect and edit intent-task alignment. Its user study reported lower
cognitive load and fewer LLM calls, while also noting latency and lack of
large multi-file project validation.

The product lesson for Jumpspace is not "persist every task graph." It is:

1. Intermediate structure is valuable before code generation.
2. Durable repo memory should preserve the decisions that future agents cannot
   reliably recover from code alone.
3. Generated task decompositions should be ephemeral unless a human explicitly
   promotes a decision into durable intent memory.

## Product Thesis

Jumpspace is repo-local intent memory for AI coding agents.

The default workflow should help agents answer:

- What decisions constrain this change?
- Why were those decisions made?
- What alternatives should the agent avoid re-proposing?
- Does this PR appear to violate any active intents?

The default workflow should not require humans to review a large generated task
ledger before an agent can make progress.

## Goals

- Make intent the default durable unit in Jumpspace.
- Preserve the "what code cannot tell you" filter as the core authoring rule.
- Treat rejected alternatives as the highest-value part of an intent.
- Add a verifier loop that checks PR diffs against matching intents.
- Keep v1 simple enough to dogfood in Kodiak for one month.
- Design the lookup API so the initial read-all implementation can later become
  indexed lookup without changing the agent-facing workflow.
- Explicitly position task/work/verify as opt-in advanced workflow features.

## Non-Goals

- Do not replace project trackers.
- Do not persist generated task graphs by default.
- Do not add per-intent acceptance criteria, plan steps, or lifecycle evidence.
- Do not build a semantic index for intents in v1.
- Do not block on public renaming before internal dogfooding.

## Users

- Human engineers who want agents to preserve product and architecture
  decisions across sessions.
- Coding agents that need scoped, binding context before editing files.
- Reviewers who want to know whether a PR conflicts with documented intent.

## Core Concepts

### Intent

An intent is a durable decision record stored in the repo, usually under
`documentation/intents/*.md` or another configured intent root.

An intent earns its keep when it captures at least one of:

- Project state that shapes the decision.
- Rejected alternatives with reasons.
- External constraints.
- Implicit guarantees not directly visible in code.
- Coordination across files where no single file reveals the rule.

An intent is not:

- A task.
- A to-do.
- A PR summary.
- A description of what code already says.
- A pattern a fresh agent could re-derive with a quick grep and skim.

### Ephemeral Understanding Graph

The NeuroSync-inspired graph is a planning and alignment surface. Agents may
generate temporary intent/task decompositions during a conversation, and users
may edit them before implementation. In v1, that structure is not persisted by
default. Only explicit, high-value decisions become intents.

V1 does not yet include a `jumpspace intent promote` command. That bridge is a
v1.1 candidate: take an ephemeral plan or conversation summary and draft 0-3
human-reviewable intents from the decisions that code cannot explain.

### PR-Level Verification Log

The verifier may produce logs saying which intents were checked against a PR
and whether possible violations were found. Those logs are CI artifacts, PR
comments, or local command output. They are not per-intent verification records
and must not introduce task-shaped state into intent files.

## Intent File Format

```markdown
---
id: <kebab-slug>
status: active
scope: <glob>
superseded_by: <id>
---

# <one-line decision statement>

## Decision
<what was decided, in 1-3 sentences>

## Why
<rationale focused on what code cannot tell you>

## Alternatives rejected
- <alternative and reason>

## When this intent will change
<optional trigger for revisiting the decision>

## Confidence note
<optional note for inferred rationale or inferred alternatives>
```

Required frontmatter:

- `id`
- `status`: `active`, `superseded`, or `rejected`
- `scope`: one glob or comma-separated globs

Optional frontmatter:

- `superseded_by`

The `scope` field is the lookup boundary. Agents must not apply an intent
outside its declared scope just because the prose feels relevant.

## V1 User Flows

### 1. Before Editing Code

1. Agent identifies the files likely to be edited.
2. Agent runs or emulates `intent check --for <paths...>`.
3. Matching active intents are read in full.
4. Superseded and rejected intents are ignored unless explicitly requested.
5. If the proposed change conflicts with an active intent, the agent stops and
   asks whether to honor the intent or update it first.

### 2. After A Design Decision

1. Agent considers whether the conversation produced a durable decision.
2. Agent applies the filter: would a fresh agent reading the affected files
   reach the same conclusion without this intent?
3. If yes, no intent is written.
4. If no, the agent drafts at most 0-3 intents for the feature.
5. If more than 3 intents seem necessary, the agent must stop and ask whether
   the feature is being over-decomposed or whether only the top decisions should
   be captured.
6. Drafted intents are shown to the human for review before commit.

### 3. PR Verification

1. Verifier collects changed files from the PR or local diff.
2. Verifier finds matching active intents by scope.
3. Verifier evaluates whether the diff is consistent with each matching intent.
4. Verifier reports:
   - checked intents
   - possible violations
   - unknowns where the diff lacks enough evidence
   - unmatched changed files
5. Verifier output is non-blocking by default during dogfooding.
6. A future `--fail-on violation` mode may make clear violations blocking.

### 3a. Local Agent Intent Review Skill

Before hosted verification, CI can act as a tripwire: when changed files match
active intents, a PR comment can ask the human to run a local agent workflow.
The `jumpspace-intent-review` skill tells the local coding agent to run
`jumpspace intent validate --since <ref> --json`, run
`jumpspace intent verify --since <ref> --json`, inspect the actual diff hunks,
and report `possible_violation` only when it can quote both the intent text and
the changed diff evidence. This keeps semantic review privacy-first and does
not require an LLM key in CI.

### 4. Intent Lookup At Scale

V1 may implement lookup by reading all intent files because Kodiak currently has
a small ledger. The public command shape must still be path-scoped:

```bash
jumpspace intent check --for src/lib/foo.ts src/inngest/functions/bar.ts --json
```

This lets the implementation switch later to an index without changing agent
instructions. Indexed lookup becomes a requirement when either:

- a repo has more than 30 active intents, or
- read-all matching adds noticeable latency or token load.

At 100 active intents, agents must not be asked to read every intent file.

## Functional Requirements

### FR1: Intent Discovery

Jumpspace can discover configured intent roots and list intent files with their
IDs, statuses, scopes, titles, and paths.

### FR2: Scoped Intent Matching

Given a set of file paths, Jumpspace can return only the active intents whose
scope globs match those paths. The response should include the intent title,
scope, path, decision, rationale, and rejected alternatives for matches. It
should not dump raw Markdown or duplicate frontmatter into default machine
output.

### FR3: Intent Validation

Jumpspace can validate intent files for:

- missing required frontmatter
- invalid status
- invalid or empty scope
- duplicate IDs
- `superseded_by` references that do not exist
- active intents with no rejected alternative unless explicitly waived
- branches that add more than 3 active intents when validation runs with
  `--since <ref>` unless the reviewer explicitly raises the limit

### FR4: Agent Skill

The agent skill must:

- use intents before editing code in repos with intent roots
- preserve the "what code cannot tell you" filter
- treat rejected alternatives as load-bearing
- enforce the 0-3 durable intents per feature north star
- explain that task graphs are ephemeral planning artifacts unless promoted
- provide a local intent-review workflow for PRs where CI matched changed files
  to active intents
- avoid creating intent roots speculatively

### FR5: Intent Verifier

Jumpspace can check a diff against matching active intents and emit JSON plus
human-readable output. The verifier must distinguish:

- `consistent`
- `possible_violation`
- `unknown`
- `not_applicable`

The verifier must cite the intent ID, changed paths, and evidence summary for
each result.

### FR6: PR-Level Logs

Verifier runs may be written to CI artifacts or PR comments. They must not
mutate intent files and must not add verification state to individual intents.

### FR7: Advanced Workflow Positioning

Existing task/work/verify capabilities remain available, but docs and agent
guidance should describe them as advanced workflow features. The README should
lead with repo-local intent memory before task lifecycle language.

## CLI Shape

V1 command names are proposed, not final:

```bash
jumpspace intent list --json
jumpspace intent check --for <paths...> --json
jumpspace intent validate --json
jumpspace intent validate --since <ref> --max-new 3 --json
jumpspace intent verify --since <ref> --json
jumpspace intent verify --diff <file> --json
jumpspace add-skill intent-review --agent codex
jumpspace add-skill intent-review --agent claude
```

The important interface decision is that lookup is path-scoped from the start,
even if the first implementation reads all files internally.

## Success Metrics

- Kodiak dogfooders use intents for one month without returning to large task
  ledgers as the default.
- A typical feature produces 0-3 durable intents.
- Agents report matching intents before editing scoped files.
- Verifier catches at least one real conflict or prevents one repeated rejected
  alternative during dogfood.
- False-positive verifier reports are low enough that reviewers keep reading
  them.
- Read-all lookup remains acceptable under 30 active intents.
- The system does not introduce per-intent task state.

## Open Questions

- What is the first production verifier evaluator: bounded LLM calls, a
  structured agent prompt, rules, or a hybrid?
- Should verifier results become blocking before external release?
- Should existing Jumpspace task docs be renamed before public launch, or only
  repositioned for internal dogfood?
- What exact threshold should force indexed lookup: 30 active intents, 50, or a
  measured latency/token budget?

## Rollout Plan

1. Dogfood the file format and agent skill in Kodiak.
2. Add the path-scoped lookup command with a simple read-all implementation.
3. Add validation for intent files.
4. Add branch-level validation for more than 3 new active intents.
5. Add non-blocking PR verifier output.
6. Reposition README and agent guidance around repo-local intent memory.
7. Add `jumpspace-intent-review` as the privacy-first local agent review skill.
8. Ship v1.1 verifier judgment with bounded calls, cached results, and
   calibration reporting.
9. After one month, review:
   - number of intents created
   - average intents per feature
   - verifier usefulness
   - lookup cost
   - whether task/work/verify should remain advanced or be split from the
     default product surface

## Guardrails

- If a feature produces more than 3 durable intents, assume the system is
  over-capturing until proven otherwise.
- If an intent lacks a concrete rejected alternative, challenge whether it is
  only pattern documentation.
- If a verifier result requires hidden chat history to understand, the intent
  is underspecified.
- If an agent needs to read every intent at 100 active intents, lookup has
  failed.
- If an intent starts accumulating plan steps or acceptance criteria, it has
  become a task and should move to the advanced workflow model.
