# Jumpspace

Repo-local intent memory for AI coding agents.

Coding agents lose the thread between sessions, branches, and teammates.
Jumpspace lets your repo remember the decisions, constraints, and rejected
alternatives that code alone cannot explain.

> Jumpspace is alpha software. CLI commands, JSON schemas, task metadata fields,
> and generated agent guidance may change before a stable 1.0 release. Pin
> versions in CI and review changelogs before upgrading.

## Why Jumpspace?

Coding agents are getting better at changing code, but they still lose product
intent. Git remembers what changed, but not why a decision was made. Issue
trackers know planned work, but not always which alternatives were rejected.
Docs explain intent, but drift from implementation. Vector search can find
similar text, but it does not tell an agent which constraints are binding before
editing a file.

Jumpspace is repo-local intent memory first. It gives coding agents and
teammates a source-backed map between:

- durable decisions
- rationale
- rejected alternatives
- scoped code paths
- PR-level intent verification
- optional task/workflow state

Git remembers what changed. Jumpspace remembers the constraints a future agent
should honor.

## 30-Second Demo

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli intent list
npx @jumpspace/cli intent check --for src/app/page.tsx
```

For an existing repo with docs but no intent memory yet, start by writing one
decision that code cannot explain:

```bash
npx @jumpspace/cli intent list --json
npx @jumpspace/cli intent check --for src/app/page.tsx --json
npx @jumpspace/cli intent validate --json
```

When a branch adds intent files, compare against a base ref so Jumpspace can
warn if the feature is drifting past the 0-3 new-intent guardrail:

```bash
npx @jumpspace/cli intent validate --since origin/main --json
npx @jumpspace/cli intent verify --since origin/main --json
```

## What It Does

- Reads durable intent files from `documentation/intents/*.md` by default.
- Shows agents which active intents match files they are about to edit.
- Validates intent frontmatter, duplicate IDs, supersession links, and missing
  rejected alternatives.
- Creates PR-level intent verification packets without mutating intent files.
- Keeps task/work/verify as an opt-in advanced workflow for teams that want
  source-backed execution state.
- Keeps memory local, reviewable, and source-controlled in the repo.

## Minimal Intent

Add an intent when a decision captures what code cannot tell a future agent:

```md
---
id: no-pre-launch-feature-flags
status: active
scope: src/**/*.ts, src/**/*.tsx
---

# Do not gate new code paths behind runtime feature flags

## Decision
While the app is pre-launch, new features ship without runtime feature-flag
gates. Rollback is via git revert.

## Why
Feature flags add a second state dimension that the team does not need before
external launch.

## Alternatives rejected
- **Environment-variable gates.** They still create cleanup debt and require a
  redeploy to change.
```

Then inspect scoped intent memory:

```bash
npx @jumpspace/cli intent list
npx @jumpspace/cli intent check --for src/features/example.ts --json
npx @jumpspace/cli intent validate --since origin/main --json
```

Use YAML-array `scope` values when you need richer micromatch patterns such as
braces or negation.

## Advanced Task Graph

Task blocks, durable plans, and earned verification records are still available
for teams that want source-backed execution state. They are not the default
Jumpspace shape.

Use the task graph when a team needs approved work packets, dependency-aware
plans, or recorded verification evidence. Keep that graph small and intentional:
do not create task blocks when a small durable intent is enough.

## Quick Paths

- [Quickstart](https://docs.jumpspace.ai/start-here/quickstart/)
- [Agent setup](https://docs.jumpspace.ai/start-here/agent-setup/)
- [Ask questions with evidence](https://docs.jumpspace.ai/workflows/ask-questions-with-evidence/)
- [Review PR drift](https://docs.jumpspace.ai/workflows/review-pr-drift/)
- [CLI reference](https://docs.jumpspace.ai/reference/cli/)

Advanced workflow docs:

- [Existing repo bootstrap](https://docs.jumpspace.ai/start-here/existing-repo-bootstrap/)
- [Start agent work](https://docs.jumpspace.ai/workflows/start-agent-work/)
- [Verify work](https://docs.jumpspace.ai/workflows/verify-work/)

## Install

```bash
npm install -D @jumpspace/cli
```

The npm package is `@jumpspace/cli`; the installed command remains
`jumpspace`. Jumpspace writes source-controlled Markdown metadata and a
generated `.jumpspace/index.json` index inside your repo. `init` also adds a
managed `.gitignore` block for runtime locks, semantic caches, and one-shot
bootstrap proposal files.

## Current Command Surface

The primary intent-memory commands are:

- `init`, `add-skill`
- `intent list|check|validate|verify`
- `changed`
- `schema`
- `release doctor`, `release install-doctor`

Advanced task-graph commands remain available for teams that opt into the older
workflow layer:

- `task scan|list|find|ask|semantic|query|related`
- `task bootstrap discover|context|propose|validate|apply`
- `task plan|ready|work|execute|next|step|status|verify`
- `task link suggest|update|eval`
- `task drift|ci|pr comment|repair|last|history|handoff|doctor|audit`

Use `npx @jumpspace/cli --help` for exact options and the
[CLI reference](https://docs.jumpspace.ai/reference/cli/) for examples.

## Docs

The documentation site lives in `docs/` and is published at
[docs.jumpspace.ai](https://docs.jumpspace.ai/).

Run it locally:

```bash
npm --prefix docs install
npm --prefix docs run dev
```

## Status

Jumpspace v0 is for one repo, local Markdown docs, and small teams. It is not a
hosted knowledge graph, Jira replacement, or Confluence replacement.

The strongest path today is agent-assisted adoption: install the skills, record
the few intents code cannot explain, and let agents check those intents before
they edit scoped files.

## License and Trademarks

Jumpspace Core is licensed under the Apache License, Version 2.0. See `LICENSE`
and `NOTICE`.

The Jumpspace name, logo, and related brand assets are trademarks controlled by
Jumpspace AI. The Apache-2.0 license does not grant permission to use those
marks except as required for reasonable and customary use in describing the
origin of the software. See `TRADEMARKS.md`.
