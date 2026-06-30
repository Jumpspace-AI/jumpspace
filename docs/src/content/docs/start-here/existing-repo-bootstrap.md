---
title: Existing Repo Bootstrap
description: Convert existing Markdown docs into source-backed task memory.
---

Bootstrap is for the retrofit case: your repo already has docs, but it does not
yet have Jumpspace task blocks.

## 1. Initialize

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
```

`init --auto` discovers common doc roots such as `README.md`, `docs/`,
`documentation/`, `adr/`, `architecture/`, package READMEs, and similar
locations.

## 2. Preview The Docs

```bash
npx @jumpspace/cli task bootstrap discover --json
npx @jumpspace/cli task bootstrap context README.md docs/**/*.md --json
```

Use `bootstrap context` when an AI agent should inspect heading structure,
source lines, parent headings, and linked-file hints before proposing task
blocks.

## 3. Propose

```bash
npx @jumpspace/cli task bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json
```

The deterministic proposal is a draft. It should be reviewed by a human or an
agent before applying.

## 4. Validate

```bash
npx @jumpspace/cli task bootstrap validate --file jumpspace-bootstrap.json
```

Validation checks duplicate IDs, missing source evidence, unresolved
dependencies, and ambiguous heading references.

## 5. Dry Run And Apply

```bash
npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json --dry-run
npx @jumpspace/cli task bootstrap apply --file jumpspace-bootstrap.json
npx @jumpspace/cli task scan
npx @jumpspace/cli task doctor
```

The dry run shows planned Markdown insertions. Apply only after reviewing the
proposal.

## Good Bootstrap Rules

- Start with a few high-value docs, not the entire repo.
- Prefer one task per durable behavior or decision.
- Leave `code` and `tests` empty unless the proposal has real evidence.
- Use `link suggest` later to connect tasks to code with better signal.
- Let the first graph be useful before making it complete.
