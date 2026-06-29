---
title: CLI Reference
description: Jumpspace commands grouped by workflow with common examples.
---

Use `--help` for exact options:

```bash
npx jumpspace --help
npx jumpspace bootstrap --help
npx jumpspace plan --help
```

Use `--json` for agent and CI consumers. Use
`npx jumpspace schema show <name> --json` before scripting against a stable
shape.

## Setup

| Command | Purpose | Common examples |
| --- | --- | --- |
| `init` | Create starter Jumpspace files. | `npx jumpspace init`, `npx jumpspace init --auto` |
| `init --ci github` | Install GitHub CI workflow integration. | `npx jumpspace init --ci github --dry-run --json` |
| `add-skill` | Install repo-local agent guidance and named pipeline skills. | `npx jumpspace add-skill --all`, `npx jumpspace add-skill jumpspace-work --agent claude` |
| `doctor` | Run repo diagnostics and repair suggestions. | `npx jumpspace doctor --json`, `npx jumpspace doctor --since main` |
| `release doctor` | Check package release readiness. | `npx jumpspace release doctor --json` |
| `release install-doctor` | Check which CLI install is active. | `npx jumpspace release install-doctor --json` |

## Indexing And Discovery

| Command | Purpose | Common examples |
| --- | --- | --- |
| `scan` | Parse task blocks and write the repo-local index. | `npx jumpspace scan` |
| `list` | List indexed tasks. | `npx jumpspace list --status approved --json` |
| `find <query...>` | Search tasks. Defaults to all-term matching. | `npx jumpspace find invite flow`, `npx jumpspace find invite flow --mode any --json` |
| `context <id>` | Print raw task context. | `npx jumpspace context DOC-PROJECT-001 --json` |
| `related <id>` | Show dependencies and refs. | `npx jumpspace related DOC-PROJECT-001 --json --compact` |

## Asking And Retrieval

| Command | Purpose | Common examples |
| --- | --- | --- |
| `ask <question...>` | Return an evidence summary. | `npx jumpspace ask "Where are invites implemented?" --json` |
| `semantic build` | Build the local semantic index. | `npx jumpspace semantic build --json` |
| `semantic status` | Check semantic readiness and staleness. | `npx jumpspace semantic status --json` |
| `semantic search <query...>` | Search the semantic task index. | `npx jumpspace semantic search member onboarding --json` |
| `semantic eval` | Compare retrieval modes on fixtures. | `npx jumpspace semantic eval --json` |
| `query` | Run deterministic graph queries. | `npx jumpspace query --depends-on-transitive ADR-001 --no-tests --json` |

`ask` is not an oracle. It returns task IDs, paths, match reasons, coverage,
unanswered terms, linked code/tests, and semantic status when available.

## Bootstrap

| Command | Purpose | Common examples |
| --- | --- | --- |
| `bootstrap discover` | Detect Markdown roots and recommend config. | `npx jumpspace bootstrap discover --json` |
| `bootstrap context` | Export heading context for an AI proposer. | `npx jumpspace bootstrap context README.md docs/**/*.md --json` |
| `bootstrap propose` | Create a proposal draft. | `npx jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json` |
| `bootstrap validate` | Validate a proposal file. | `npx jumpspace bootstrap validate --file jumpspace-bootstrap.json --json` |
| `bootstrap apply` | Apply approved task blocks. | `npx jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run` |

Always dry-run and review bootstrap output before mutating docs.

## Task Lifecycle

| Command | Purpose | Common examples |
| --- | --- | --- |
| `plan review <id>` | Print a human approval packet. | `npx jumpspace plan review DOC-PROJECT-001` |
| `plan save <id> --file <file>` | Persist a durable plan. | `npx jumpspace plan save DOC-PROJECT-001 --file plan.yml --json` |
| `plan show <id>` | Show the stored plan. | `npx jumpspace plan show DOC-PROJECT-001 --json` |
| `plan validate <id>` | Validate plan structure and state. | `npx jumpspace plan validate DOC-PROJECT-001 --json` |
| `ready` | List approved dependency-unblocked tasks. | `npx jumpspace ready --include-blocked --json` |
| `next <id>` | Show pending unblocked plan steps. | `npx jumpspace next DOC-PROJECT-001 --json` |
| `work <id>` | Print the main agent start packet. | `npx jumpspace work DOC-PROJECT-001 --since main --json` |
| `execute <id>` | Print a narrower execution packet. | `npx jumpspace execute DOC-PROJECT-001 --json` |
| `step complete` | Mark a step complete with evidence. | `npx jumpspace step complete DOC-PROJECT-001 design --evidence "Plan approved."` |
| `status <id> <status>` | Update non-verified status. | `npx jumpspace status DOC-PROJECT-001 implemented` |
| `verify <id>` | Run checks and record verification. | `npx jumpspace verify DOC-PROJECT-001 --check "npm test" --criteria AC-1 --json` |

`verified` cannot be set with `status`; it must be earned with `verify`.

## Links

| Command | Purpose | Common examples |
| --- | --- | --- |
| `link suggest <id>` | Suggest code/test links without mutation. | `npx jumpspace link suggest DOC-PROJECT-001 --since main --json` |
| `link update <id>` | Add or remove links, dependencies, refs, and gaps. | `npx jumpspace link update DOC-PROJECT-001 --code src/project/invitations.ts --dry-run --json` |
| `link eval` | Run link-scorer fixtures. | `npx jumpspace link eval --json` |

Use `link update --dry-run --json` before applying suggestions.

## Drift And PR Review

| Command | Purpose | Common examples |
| --- | --- | --- |
| `changed --since <ref>` | List committed, staged, unstaged, untracked, renamed, and deleted files. | `npx jumpspace changed --since main --json` |
| `drift --since <ref>` | Separate factual drift from heuristic warnings. | `npx jumpspace drift --since main --json` |
| `ci --since <ref>` | Generate a local CI/PR packet. | `npx jumpspace ci --since main --json` |
| `pr comment --since <ref>` | Render a review-only PR assistant comment. | `npx jumpspace pr comment --since main` |
| `repair --since <ref>` | Preview safe task-memory repairs. | `npx jumpspace repair --since main --json` |
| `repair --apply` | Apply reviewed mechanical repairs. | `npx jumpspace repair --since main --apply` |

`pr comment` does not post to GitHub. It renders text for a human or wrapper to
post.

## Diagnostics And Handoff

| Command | Purpose | Common examples |
| --- | --- | --- |
| `audit` | Validate task metadata and linked files. | `npx jumpspace audit --json` |
| `last` | Show the most recent mutation summary. | `npx jumpspace last --json` |
| `history` | Show mutation history. | `npx jumpspace history --task DOC-PROJECT-001 --limit 10 --json` |
| `handoff` | Summarize state for the next agent or human. | `npx jumpspace handoff --task DOC-PROJECT-001 --json` |

## Schemas And SDKs

| Command | Purpose | Common examples |
| --- | --- | --- |
| `schema list` | List stable command schemas. | `npx jumpspace schema list --json` |
| `schema show <name>` | Show one schema. | `npx jumpspace schema show work --json` |
| `schema coverage` | Check command/schema/artifact/SDK coverage. | `npx jumpspace schema coverage --json` |

JSON failures use:

```json
{ "ok": false, "errors": [{ "code": "...", "message": "..." }] }
```

The npm package also ships generated schema artifacts under `schemas/`, a
TypeScript SDK at `@jumpspace/cli/sdk`, and a Python contract package under
`sdk/python`.
