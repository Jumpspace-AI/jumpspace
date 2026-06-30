---
title: Agent Setup
description: Install repo-local guidance so Codex, Claude Code, and other agents know how to use Jumpspace.
---

Jumpspace works best when the coding agent does not need you to remember every
command. Install repo-local guidance once, then ask the agent to use Jumpspace
before changing code.

## Install All Supported Guidance

```bash
npx @jumpspace/cli add-skill --all
```

Today this installs supported Codex and Claude Code guidance. The operation is
idempotent and non-destructive: Jumpspace creates missing files, appends managed
blocks, or updates clearly marked Jumpspace-managed blocks.

## Install One Agent

```bash
npx @jumpspace/cli add-skill --codex
npx @jumpspace/cli add-skill --claude
```

Use `--json` when another tool needs to inspect exactly what changed.

## Install One Pipeline Skill

```bash
npx @jumpspace/cli add-skill jumpspace-bootstrap --agent claude
npx @jumpspace/cli add-skill jumpspace-work --agent codex
npx @jumpspace/cli add-skill review --agent claude
npx @jumpspace/cli add-skill intent-review --agent codex
```

Named installs include the reference `jumpspace-workflow` skill and the selected
pipeline skill. Use this when you want a smaller agent packet for a specific
workflow.

## Verify Setup

```bash
npx @jumpspace/cli release install-doctor --json
npx @jumpspace/cli task doctor --json
```

`release install-doctor` checks whether the `jumpspace` on your PATH matches
the current repo build. `doctor` checks repo-local task memory health.

## First Prompt To Try

```text
Read the Jumpspace guidance for this repo. Then run the appropriate Jumpspace
commands to understand existing intent memory before editing code.
```

Once likely edit paths are known, the agent should usually run:

```bash
npx @jumpspace/cli intent check --for <paths...> --json
```

If the repo intentionally uses the advanced task graph, it can also run:

```bash
npx @jumpspace/cli task scan
npx @jumpspace/cli task find <keywords> --json --compact
npx @jumpspace/cli task work <TASK_ID> --json
```

When CI says changed files match active intents, ask the agent to use the
`jumpspace-intent-review` skill. The agent should run
`jumpspace intent validate --since <ref> --json` and
`jumpspace intent verify --since <ref> --json`, inspect local diff hunks, and
report `possible_violation` only with quoted intent and diff evidence.

## What Humans Still Approve

Agents can gather evidence, draft plans, suggest links, and run checks. Humans
should still approve new task blocks, durable plans, risky repairs, and any
claim that a task is complete.
