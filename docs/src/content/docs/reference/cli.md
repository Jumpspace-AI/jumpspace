---
title: CLI Reference
description: Jumpspace commands grouped by workflow.
---

Use `--help` on any command for exact options:

```bash
npx jumpspace --help
npx jumpspace plan --help
npx jumpspace bootstrap --help
```

## Setup

| Command | Purpose |
| --- | --- |
| `init` | Create starter Jumpspace files. |
| `init --auto` | Discover docs and create a better starter config. |
| `init --ci github` | Add GitHub CI workflow support. |
| `add-skill --codex` | Add Codex guidance. |
| `add-skill --claude` | Add Claude Code guidance. |
| `release doctor` | Check package release readiness. |
| `release install-doctor` | Check which installed CLI is active. |

## Index And Discovery

| Command | Purpose |
| --- | --- |
| `scan` | Parse Markdown task blocks and write `.jumpspace/index.json`. |
| `list` | List indexed tasks. |
| `find <query...>` | Search indexed tasks. |
| `context <id>` | Print task context. |
| `ask <question...>` | Return an evidence summary for a question. |
| `semantic build` | Build local semantic retrieval index. |
| `semantic status` | Show semantic index readiness. |
| `semantic search <query...>` | Search semantic task vectors. |
| `semantic eval` | Compare retrieval modes. |

## Bootstrap

| Command | Purpose |
| --- | --- |
| `bootstrap discover` | Detect docs and recommend config globs. |
| `bootstrap context <paths...>` | Export heading context for an AI proposer. |
| `bootstrap propose <paths...> --file <file>` | Create a proposal file. |
| `bootstrap validate --file <file>` | Validate a proposal. |
| `bootstrap apply --file <file>` | Apply proposed task blocks. |
| `bootstrap apply --dry-run` | Preview Markdown changes. |

## Planning And Execution

| Command | Purpose |
| --- | --- |
| `plan review <id>` | Review plan state and issues. |
| `plan save <id> --file <file>` | Persist a durable plan. |
| `plan show <id>` | Show a task plan. |
| `plan validate <id>` | Validate plan structure and execution state. |
| `ready` | List approved tasks ready for execution. |
| `execute <id>` | Print an execution packet. |
| `work <id>` | Print the main agent start packet. |
| `next <id>` | Show pending unblocked plan steps. |
| `step complete <id> <step-id>` | Mark a plan step complete with evidence. |
| `status <id> <status>` | Update non-verified task status. |
| `verify <id>` | Run checks and record verification evidence. |

## Graph And Links

| Command | Purpose |
| --- | --- |
| `related <id>` | Show dependencies and references. |
| `query` | Run deterministic graph queries. |
| `link suggest <id>` | Suggest code/test links. |
| `link update <id>` | Apply code/test/dependency/ref/gap link updates. |
| `link eval` | Run link-scorer fixtures. |

## Drift, CI, And Repair

| Command | Purpose |
| --- | --- |
| `changed --since <ref>` | List committed, staged, unstaged, untracked, renamed, and deleted paths. |
| `drift --since <ref>` | Detect facts and warnings about task-memory drift. |
| `ci --since <ref>` | Produce local CI/PR packet. |
| `pr comment --since <ref>` | Generate review-only PR assistant output. |
| `repair --since <ref>` | Preview safe task-memory repairs. |
| `repair --apply` | Apply safe repairs. |

## Health And Contracts

| Command | Purpose |
| --- | --- |
| `audit` | Validate task metadata and linked files. |
| `doctor` | Run diagnostics and repair suggestions. |
| `schema list` | List stable JSON schemas. |
| `schema show <name>` | Show one JSON schema. |
| `schema coverage` | Check schema catalog, artifacts, and SDK coverage. |
| `last` | Show the most recent mutation. |
| `history` | Show mutation history. |
| `handoff` | Summarize state for the next agent or human. |

## JSON Mode

Most agent-facing commands support `--json`. Use schemas before writing scripts:

```bash
npx jumpspace schema list --json
npx jumpspace schema show work --json
```
