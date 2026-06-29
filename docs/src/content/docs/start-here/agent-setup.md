---
title: Agent Setup
description: Install repo-local guidance so Codex, Claude Code, and other agents know how to use Jumpspace.
---

Jumpspace works best when the coding agent does not need you to remember every
command. Install repo-local guidance once, then ask the agent to use Jumpspace
before changing code.

## Install All Supported Guidance

```bash
npx jumpspace add-skill --all
```

Today this installs supported Codex and Claude Code guidance. The operation is
idempotent and non-destructive: Jumpspace creates missing files, appends managed
blocks, or updates clearly marked Jumpspace-managed blocks.

## Install One Agent

```bash
npx jumpspace add-skill --codex
npx jumpspace add-skill --claude
```

Use `--json` when another tool needs to inspect exactly what changed.

## Install One Pipeline Skill

```bash
npx jumpspace add-skill jumpspace-bootstrap --agent claude
npx jumpspace add-skill jumpspace-work --agent codex
npx jumpspace add-skill review --agent claude
```

Named installs include the reference `jumpspace-workflow` skill and the selected
pipeline skill. Use this when you want a smaller agent packet for a specific
workflow.

## Verify Setup

```bash
npx jumpspace release install-doctor --json
npx jumpspace doctor --json
```

`release install-doctor` checks whether the `jumpspace` on your PATH matches
the current repo build. `doctor` checks repo-local task memory health.

## First Prompt To Try

```text
Read the Jumpspace guidance for this repo. Then run the appropriate Jumpspace
commands to understand existing implementation memory before editing code.
```

If the repo has tasks, the agent should usually run:

```bash
npx jumpspace scan
npx jumpspace find <keywords> --json --compact
npx jumpspace context <TASK_ID> --json
```

For approved implementation work, it should prefer:

```bash
npx jumpspace work <TASK_ID> --json
```

## What Humans Still Approve

Agents can gather evidence, draft plans, suggest links, and run checks. Humans
should still approve new task blocks, durable plans, risky repairs, and any
claim that a task is complete.
