---
title: Bootstrap Existing Repos
description: Build the first Jumpspace graph from existing Markdown docs.
---

Bootstrap is for repos that already have docs but no Jumpspace task graph.

The goal is not to let a parser invent your architecture. The goal is to give an AI agent enough structured context to propose task blocks, links, and IDs that a human can review.

## Discover Docs

```bash
npx @jumpspace/cli task bootstrap discover --json
```

Discovery looks for common Markdown locations such as README, PRODUCT, docs, documentation, ADRs, architecture docs, app README files, infrastructure docs, and skills. It reports recommended globs, detected files, profile hints, and ignored generated paths.

## Export Context For An Agent

```bash
npx @jumpspace/cli task bootstrap context README.md documentation/**/*.md --json
```

The context packet includes headings, source line numbers, parent heading chains, excerpts, existing task IDs, suggested IDs, linked file hints, and proposal instructions.

Use this packet with an AI agent to draft task blocks. The agent should reason about the docs, propose links, and mark uncertain connections as gaps.

## Propose, Validate, Apply

```bash
npx @jumpspace/cli task bootstrap propose README.md documentation/**/*.md --file jumpspace-bootstrap.json --json
npx @jumpspace/cli task bootstrap validate --file jumpspace-bootstrap.json --json
npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json --dry-run --json
npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json --json
```

Always inspect the dry run before applying.

## Good Bootstrap Rules

- Prefer fewer, higher-confidence task blocks over one block per heading.
- Use source line numbers and parent headings to avoid duplicate-heading ambiguity.
- Add `code` and `tests` only when the evidence is strong.
- Add `gaps` when a doc describes behavior but implementation links are unknown.
- Run `task scan`, `task audit`, and `task doctor` after apply.

```bash
npx @jumpspace/cli task scan
npx @jumpspace/cli task audit --json
npx @jumpspace/cli task doctor --json
```

## After Bootstrap

Bootstrap is a starting point. Day-1 maintenance is the real value: new work should update the task block while the author still knows which code and tests matter.
