---
title: CLI Reference
description: Jumpspace commands grouped by workflow with common examples.
---

Use `--help` for exact options:

```bash
npx @jumpspace/cli --help
npx @jumpspace/cli intent --help
npx @jumpspace/cli task bootstrap --help
npx @jumpspace/cli task plan --help
```

Use `--json` for agent and CI consumers. Use
`npx @jumpspace/cli schema show <name> --json` before scripting against a stable
shape.

## Setup

| Command | Purpose | Common examples |
| --- | --- | --- |
| `init` | Create starter Jumpspace files. | `npx @jumpspace/cli init`, `npx @jumpspace/cli init --auto` |
| `init --ci github` | Install GitHub CI workflow integration. | `npx @jumpspace/cli init --ci github --dry-run --json` |
| `add-skill` | Install repo-local agent guidance and named pipeline skills. | `npx @jumpspace/cli add-skill --all`, `npx @jumpspace/cli add-skill jumpspace-work --agent claude`, `npx @jumpspace/cli add-skill intent-review --agent codex` |
| `doctor` | Run repo diagnostics and repair suggestions. | `npx @jumpspace/cli task doctor --json`, `npx @jumpspace/cli task doctor --since main` |
| `release doctor` | Check package release readiness. | `npx @jumpspace/cli release doctor --json` |
| `release install-doctor` | Check which CLI install is active. | `npx @jumpspace/cli release install-doctor --json` |

## Task Graph Discovery

| Command | Purpose | Common examples |
| --- | --- | --- |
| `scan` | Parse task blocks and write the repo-local index. | `npx @jumpspace/cli task scan` |
| `list` | List indexed tasks. | `npx @jumpspace/cli task list --status approved --json` |
| `find <query...>` | Search tasks. Defaults to all-term matching. | `npx @jumpspace/cli task find invite flow`, `npx @jumpspace/cli task find invite flow --mode any --json` |
| `context <id>` | Print raw task context. | `npx @jumpspace/cli task context DOC-PROJECT-001 --json` |
| `related <id>` | Show dependencies and refs. | `npx @jumpspace/cli task related DOC-PROJECT-001 --json --compact` |

Task graph discovery is an advanced workflow layer. Prefer durable intents when
the repo only needs decision memory.

## Intent Memory

| Command | Purpose | Common examples |
| --- | --- | --- |
| `intent list` | List durable intent records from configured roots. | `npx @jumpspace/cli intent list --json` |
| `intent check --for <path>` | Return active intents whose scopes match paths. | `npx @jumpspace/cli intent check --for src/app/page.tsx --json` |
| `intent validate` | Validate intent frontmatter, IDs, supersession, rejected-alternative guardrails, and optional new-intent volume. | `npx @jumpspace/cli intent validate --json`, `npx @jumpspace/cli intent validate --since origin/main --max-new 3 --json` |
| `intent verify` | Create a PR-level verification packet without mutating intent files. | `npx @jumpspace/cli intent verify --since main --json`, `npx @jumpspace/cli intent verify --for src/app/page.tsx --json` |

By default, intents are read from `documentation/intents/*.md`. Configure
`.jumpspace/config.json` with an `intents` array to use different roots.
Intent `scope` supports comma-separated simple globs or YAML arrays for richer
micromatch patterns, including braces and negation.
With `--since`, `intent validate` warns when a branch adds more than the
configured number of active intents. The default `--max-new` is `3`.

Intent verification is intentionally conservative in v1. It proves which
intents apply to changed paths and reports deterministic results as `unknown`
unless a human, agent, or future rule-backed evaluator has checked semantic
consistency. Verification output is a PR-level artifact; it does not mutate
intent files.

## Asking And Retrieval

| Command | Purpose | Common examples |
| --- | --- | --- |
| `ask <question...>` | Return an evidence summary. | `npx @jumpspace/cli task ask "Where are invites implemented?" --json` |
| `semantic build` | Build the local semantic index. | `npx @jumpspace/cli task semantic build --json` |
| `semantic status` | Check semantic readiness and staleness. | `npx @jumpspace/cli task semantic status --json` |
| `semantic search <query...>` | Search the semantic task index. | `npx @jumpspace/cli task semantic search member onboarding --json` |
| `semantic eval` | Compare retrieval modes on fixtures. | `npx @jumpspace/cli task semantic eval --json` |
| `query` | Run deterministic graph queries. | `npx @jumpspace/cli task query --depends-on-transitive ADR-001 --no-tests --json` |

`ask` is not an oracle. It returns task IDs, paths, match reasons, coverage,
unanswered terms, linked code/tests, and semantic status when available.

## Bootstrap (Advanced)

| Command | Purpose | Common examples |
| --- | --- | --- |
| `bootstrap discover` | Detect Markdown roots and recommend config. | `npx @jumpspace/cli task bootstrap discover --json` |
| `bootstrap context` | Export heading context for an AI proposer. | `npx @jumpspace/cli task bootstrap context README.md docs/**/*.md --json` |
| `bootstrap propose` | Create a proposal draft. | `npx @jumpspace/cli task bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json` |
| `bootstrap validate` | Validate a proposal file. | `npx @jumpspace/cli task bootstrap validate --file jumpspace-bootstrap.json --json` |
| `bootstrap apply` | Apply approved task blocks. | `npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json --dry-run` |

Always dry-run and review bootstrap output before mutating docs.

## Task Lifecycle (Advanced)

| Command | Purpose | Common examples |
| --- | --- | --- |
| `plan review <id>` | Print a human approval packet. | `npx @jumpspace/cli task plan review DOC-PROJECT-001` |
| `plan save <id> --file <file>` | Persist a durable plan. | `npx @jumpspace/cli task plan save DOC-PROJECT-001 --file plan.yml --json` |
| `plan show <id>` | Show the stored plan. | `npx @jumpspace/cli task plan show DOC-PROJECT-001 --json` |
| `plan validate <id>` | Validate plan structure and state. | `npx @jumpspace/cli task plan validate DOC-PROJECT-001 --json` |
| `ready` | List approved dependency-unblocked tasks. | `npx @jumpspace/cli task ready --include-blocked --json` |
| `next <id>` | Show pending unblocked plan steps. | `npx @jumpspace/cli task next DOC-PROJECT-001 --json` |
| `work <id>` | Print the main agent start packet. | `npx @jumpspace/cli task work DOC-PROJECT-001 --since main --json` |
| `execute <id>` | Print a narrower execution packet. | `npx @jumpspace/cli task execute DOC-PROJECT-001 --json` |
| `step complete` | Mark a step complete with evidence. | `npx @jumpspace/cli task step complete DOC-PROJECT-001 design --evidence "Plan approved."` |
| `status <id> <status>` | Update non-verified status. | `npx @jumpspace/cli task status DOC-PROJECT-001 implemented` |
| `verify <id>` | Run checks and record verification. | `npx @jumpspace/cli task verify DOC-PROJECT-001 --check "npm test" --criteria AC-1 --json` |

`verified` cannot be set with `status`; it must be earned with `verify`.

## Links

| Command | Purpose | Common examples |
| --- | --- | --- |
| `link suggest <id>` | Suggest code/test links without mutation. | `npx @jumpspace/cli task link suggest DOC-PROJECT-001 --json` |
| `link update <id>` | Add or remove links, dependencies, refs, and gaps. | `npx @jumpspace/cli task link update DOC-PROJECT-001 --code src/project/invitations.ts --dry-run --json` |
| `link eval` | Run link-scorer fixtures. | `npx @jumpspace/cli task link eval --json` |

Use `link update --dry-run --json` before applying suggestions.

## Drift And PR Review

| Command | Purpose | Common examples |
| --- | --- | --- |
| `changed --since <ref>` | List committed, staged, unstaged, untracked, renamed, and deleted files. | `npx @jumpspace/cli changed --since main --json` |
| `drift --since <ref>` | Separate factual drift from heuristic warnings. | `npx @jumpspace/cli task drift --since main --json` |
| `ci --since <ref>` | Generate a local CI/PR packet. | `npx @jumpspace/cli task ci --since main --json` |
| `pr comment --since <ref>` | Render a review-only PR assistant comment. | `npx @jumpspace/cli task pr comment --since main` |
| `repair --since <ref>` | Preview safe task-memory repairs. | `npx @jumpspace/cli task repair --since main --json` |
| `repair --apply` | Apply reviewed mechanical repairs. | `npx @jumpspace/cli task repair --since main --apply` |

`pr comment` does not post to GitHub. It renders text for a human or wrapper to
post.

## Diagnostics And Handoff

| Command | Purpose | Common examples |
| --- | --- | --- |
| `audit` | Validate task metadata and linked files. | `npx @jumpspace/cli task audit --json` |
| `last` | Show the most recent mutation summary. | `npx @jumpspace/cli task last --json` |
| `history` | Show mutation history. | `npx @jumpspace/cli task history --task DOC-PROJECT-001 --limit 10 --json` |
| `handoff` | Summarize state for the next agent or human. | `npx @jumpspace/cli task handoff --task DOC-PROJECT-001 --json` |

## Schemas And SDKs

| Command | Purpose | Common examples |
| --- | --- | --- |
| `schema list` | List stable command schemas. | `npx @jumpspace/cli schema list --json` |
| `schema show <name>` | Show one schema. | `npx @jumpspace/cli schema show task.work --json` |
| `schema coverage` | Check command/schema/artifact/SDK coverage. | `npx @jumpspace/cli schema coverage --json` |

JSON failures use:

```json
{ "ok": false, "errors": [{ "code": "...", "message": "..." }] }
```

The npm package also ships generated schema artifacts under `schemas/`, a
TypeScript SDK at `@jumpspace/cli/sdk`, and a Python contract package under
`sdk/python`.
