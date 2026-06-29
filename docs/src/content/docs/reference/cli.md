---
title: CLI Reference
description: Jumpspace commands grouped by workflow with common examples.
---

Use `--help` for exact options:

```bash
npx @jumpspace/cli --help
npx @jumpspace/cli bootstrap --help
npx @jumpspace/cli plan --help
```

Use `--json` for agent and CI consumers. Use
`npx @jumpspace/cli schema show <name> --json` before scripting against a stable
shape.

## Setup

| Command | Purpose | Common examples |
| --- | --- | --- |
| `init` | Create starter Jumpspace files. | `npx @jumpspace/cli init`, `npx @jumpspace/cli init --auto` |
| `init --ci github` | Install GitHub CI workflow integration. | `npx @jumpspace/cli init --ci github --dry-run --json` |
| `add-skill` | Install repo-local agent guidance and named pipeline skills. | `npx @jumpspace/cli add-skill --all`, `npx @jumpspace/cli add-skill jumpspace-work --agent claude` |
| `doctor` | Run repo diagnostics and repair suggestions. | `npx @jumpspace/cli doctor --json`, `npx @jumpspace/cli doctor --since main` |
| `release doctor` | Check package release readiness. | `npx @jumpspace/cli release doctor --json` |
| `release install-doctor` | Check which CLI install is active. | `npx @jumpspace/cli release install-doctor --json` |

## Indexing And Discovery

| Command | Purpose | Common examples |
| --- | --- | --- |
| `scan` | Parse task blocks and write the repo-local index. | `npx @jumpspace/cli scan` |
| `list` | List indexed tasks. | `npx @jumpspace/cli list --status approved --json` |
| `find <query...>` | Search tasks. Defaults to all-term matching. | `npx @jumpspace/cli find invite flow`, `npx @jumpspace/cli find invite flow --mode any --json` |
| `context <id>` | Print raw task context. | `npx @jumpspace/cli context DOC-PROJECT-001 --json` |
| `related <id>` | Show dependencies and refs. | `npx @jumpspace/cli related DOC-PROJECT-001 --json --compact` |

## Asking And Retrieval

| Command | Purpose | Common examples |
| --- | --- | --- |
| `ask <question...>` | Return an evidence summary. | `npx @jumpspace/cli ask "Where are invites implemented?" --json` |
| `semantic build` | Build the local semantic index. | `npx @jumpspace/cli semantic build --json` |
| `semantic status` | Check semantic readiness and staleness. | `npx @jumpspace/cli semantic status --json` |
| `semantic search <query...>` | Search the semantic task index. | `npx @jumpspace/cli semantic search member onboarding --json` |
| `semantic eval` | Compare retrieval modes on fixtures. | `npx @jumpspace/cli semantic eval --json` |
| `query` | Run deterministic graph queries. | `npx @jumpspace/cli query --depends-on-transitive ADR-001 --no-tests --json` |

`ask` is not an oracle. It returns task IDs, paths, match reasons, coverage,
unanswered terms, linked code/tests, and semantic status when available.

## Bootstrap

| Command | Purpose | Common examples |
| --- | --- | --- |
| `bootstrap discover` | Detect Markdown roots and recommend config. | `npx @jumpspace/cli bootstrap discover --json` |
| `bootstrap context` | Export heading context for an AI proposer. | `npx @jumpspace/cli bootstrap context README.md docs/**/*.md --json` |
| `bootstrap propose` | Create a proposal draft. | `npx @jumpspace/cli bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json` |
| `bootstrap validate` | Validate a proposal file. | `npx @jumpspace/cli bootstrap validate --file jumpspace-bootstrap.json --json` |
| `bootstrap apply` | Apply approved task blocks. | `npx @jumpspace/cli bootstrap apply --file jumpspace-bootstrap.json --dry-run` |

Always dry-run and review bootstrap output before mutating docs.

## Task Lifecycle

| Command | Purpose | Common examples |
| --- | --- | --- |
| `plan review <id>` | Print a human approval packet. | `npx @jumpspace/cli plan review DOC-PROJECT-001` |
| `plan save <id> --file <file>` | Persist a durable plan. | `npx @jumpspace/cli plan save DOC-PROJECT-001 --file plan.yml --json` |
| `plan show <id>` | Show the stored plan. | `npx @jumpspace/cli plan show DOC-PROJECT-001 --json` |
| `plan validate <id>` | Validate plan structure and state. | `npx @jumpspace/cli plan validate DOC-PROJECT-001 --json` |
| `ready` | List approved dependency-unblocked tasks. | `npx @jumpspace/cli ready --include-blocked --json` |
| `next <id>` | Show pending unblocked plan steps. | `npx @jumpspace/cli next DOC-PROJECT-001 --json` |
| `work <id>` | Print the main agent start packet. | `npx @jumpspace/cli work DOC-PROJECT-001 --since main --json` |
| `execute <id>` | Print a narrower execution packet. | `npx @jumpspace/cli execute DOC-PROJECT-001 --json` |
| `step complete` | Mark a step complete with evidence. | `npx @jumpspace/cli step complete DOC-PROJECT-001 design --evidence "Plan approved."` |
| `status <id> <status>` | Update non-verified status. | `npx @jumpspace/cli status DOC-PROJECT-001 implemented` |
| `verify <id>` | Run checks and record verification. | `npx @jumpspace/cli verify DOC-PROJECT-001 --check "npm test" --criteria AC-1 --json` |

`verified` cannot be set with `status`; it must be earned with `verify`.

## Links

| Command | Purpose | Common examples |
| --- | --- | --- |
| `link suggest <id>` | Suggest code/test links without mutation. | `npx @jumpspace/cli link suggest DOC-PROJECT-001 --since main --json` |
| `link update <id>` | Add or remove links, dependencies, refs, and gaps. | `npx @jumpspace/cli link update DOC-PROJECT-001 --code src/project/invitations.ts --dry-run --json` |
| `link eval` | Run link-scorer fixtures. | `npx @jumpspace/cli link eval --json` |

Use `link update --dry-run --json` before applying suggestions.

## Drift And PR Review

| Command | Purpose | Common examples |
| --- | --- | --- |
| `changed --since <ref>` | List committed, staged, unstaged, untracked, renamed, and deleted files. | `npx @jumpspace/cli changed --since main --json` |
| `drift --since <ref>` | Separate factual drift from heuristic warnings. | `npx @jumpspace/cli drift --since main --json` |
| `ci --since <ref>` | Generate a local CI/PR packet. | `npx @jumpspace/cli ci --since main --json` |
| `pr comment --since <ref>` | Render a review-only PR assistant comment. | `npx @jumpspace/cli pr comment --since main` |
| `repair --since <ref>` | Preview safe task-memory repairs. | `npx @jumpspace/cli repair --since main --json` |
| `repair --apply` | Apply reviewed mechanical repairs. | `npx @jumpspace/cli repair --since main --apply` |

`pr comment` does not post to GitHub. It renders text for a human or wrapper to
post.

## Diagnostics And Handoff

| Command | Purpose | Common examples |
| --- | --- | --- |
| `audit` | Validate task metadata and linked files. | `npx @jumpspace/cli audit --json` |
| `last` | Show the most recent mutation summary. | `npx @jumpspace/cli last --json` |
| `history` | Show mutation history. | `npx @jumpspace/cli history --task DOC-PROJECT-001 --limit 10 --json` |
| `handoff` | Summarize state for the next agent or human. | `npx @jumpspace/cli handoff --task DOC-PROJECT-001 --json` |

## Schemas And SDKs

| Command | Purpose | Common examples |
| --- | --- | --- |
| `schema list` | List stable command schemas. | `npx @jumpspace/cli schema list --json` |
| `schema show <name>` | Show one schema. | `npx @jumpspace/cli schema show work --json` |
| `schema coverage` | Check command/schema/artifact/SDK coverage. | `npx @jumpspace/cli schema coverage --json` |

JSON failures use:

```json
{ "ok": false, "errors": [{ "code": "...", "message": "..." }] }
```

The npm package also ships generated schema artifacts under `schemas/`, a
TypeScript SDK at `@jumpspace/cli/sdk`, and a Python contract package under
`sdk/python`.
