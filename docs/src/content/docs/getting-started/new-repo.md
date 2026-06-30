---
title: New Repo Use
description: Add Jumpspace to a repo and choose intent memory or advanced task graph bootstrap.
---

This is the path for a repo that does not have Jumpspace yet.

For the default intent-memory workflow, use
[Quickstart](/start-here/quickstart/) and add one intent that code cannot
explain. Continue here only when you want an agent to bootstrap the advanced
task graph from existing docs.

You do not need to memorize every command. The fastest workflow is to install
Jumpspace, add agent guidance, then ask your agent for the outcome. The
installed guidance tells the agent to use Jumpspace as the workflow spine.

## The Goal

By the end of first setup, your repo should have:

- `.jumpspace/config.json`
- repo-local Codex or Claude guidance
- a small source-backed task graph
- scanned task metadata
- clean audit output
- a repeatable way for agents to ask for context before coding

## Install

```bash
npm install -D @jumpspace/cli
```

If you are testing a local Jumpspace checkout before npm publishing, link it from the Jumpspace repo first:

```bash
npm run build
npm link
```

Then link it in the target repo:

```bash
npm link jumpspace
jumpspace release install-doctor --json
```

`release install-doctor` tells you whether the target repo is using the expected local build or an older global binary.

## Initialize The Repo

```bash
npx @jumpspace/cli init --auto
```

`init --auto` detects common documentation locations and writes a starter config. Use plain `jumpspace init` only when you want the conservative default.

Add agent guidance:

```bash
npx @jumpspace/cli add-skill --codex
npx @jumpspace/cli add-skill --claude
```

These commands are additive. They create missing guidance files or update clearly marked Jumpspace-managed blocks.

## Let An Agent Bootstrap

Ask your agent for the outcome:

```text
Bootstrap this repo. Run discovery first, inspect the docs, propose a small source-backed task graph, and do not apply changes until I approve the proposal.
```

The agent should use commands like:

```bash
npx @jumpspace/cli task bootstrap discover --json
npx @jumpspace/cli task bootstrap context README.md docs/**/*.md documentation/**/*.md --json
npx @jumpspace/cli task bootstrap propose README.md docs/**/*.md documentation/**/*.md --file jumpspace-bootstrap.json --json
npx @jumpspace/cli task bootstrap validate --file jumpspace-bootstrap.json --json
npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json --dry-run --json
```

After you approve the dry run:

```bash
npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json --json
npx @jumpspace/cli task scan
npx @jumpspace/cli task audit --json
```

Use `link suggest <id> --json` without `--since` when you only want current
working-tree candidates.

## Keep The First Graph Small

The first graph should not index every heading. Prefer task blocks for:

- core product workflows
- architectural decisions
- important runbooks
- specs that are likely to drive code changes
- behavior with obvious code or test owners

If the agent is unsure, it should add a `gaps` entry instead of inventing links.

## After Bootstrap

Once the first graph exists, use plain-English requests:

```text
Find the task for task approvals, gather context, and tell me what files and tests matter before coding.
```

For implementation:

```text
Create or review the plan for PM-TASK-001. Show me the plan before making changes. After I approve it, execute the next step and record evidence.
```

The agent can translate that into `task context`, `task plan`, `task next`, `task work`, `task step complete`, `task verify`, `task scan`, and `task audit` calls.

## Day-Two Habit

When new work changes docs or code, ask the agent to keep Jumpspace current:

```text
Check drift and link suggestions for this branch. Tell me what task blocks or code/test links need updating.
```

That usually maps to:

```bash
npx @jumpspace/cli changed --since main --json
npx @jumpspace/cli task drift --since main --json
npx @jumpspace/cli task link suggest PM-TASK-001 --since main --json
npx @jumpspace/cli task audit --json
```
