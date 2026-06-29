---
title: Getting Started
description: Install Jumpspace, initialize a repo, scan task blocks, and ask your first evidence question.
---

This guide gets a repo from "no graph" to "agent can ask and orient" with the smallest useful setup.

Start with [Why Jumpspace?](/getting-started/why-jumpspace/) if you want the short version of the problem it solves: source-controlled intent, agent-readable structure, and honest evidence before broad code search.

## Requirements

- Node.js 20 or newer.
- A Git repository.
- Markdown docs that describe product behavior, architecture, runbooks, specs, or decisions.

## Install

Use Jumpspace as a dev dependency:

```bash
npm install -D @jumpspace/cli
```

If you are testing a local checkout before publishing, run this from the Jumpspace repo:

```bash
npm run build
npm link
```

Then run this inside the target repo:

```bash
npm link jumpspace
jumpspace release install-doctor --json
```

`release install-doctor` tells you which binary your shell is actually using and whether it looks stale.

## Initialize

For an existing repo, start with automatic discovery:

```bash
npx jumpspace init --auto
```

This inspects common documentation locations and writes `.jumpspace/config.json` with practical Markdown globs. Plain `jumpspace init` keeps the conservative starter behavior.

Add repo-local agent guidance:

```bash
npx jumpspace add-skill --codex
npx jumpspace add-skill --claude
```

These commands are additive. They create missing guidance files or append Jumpspace-managed instructions without overwriting your existing agent guidance.

## Scan

Scan turns Markdown task blocks into the generated local index:

```bash
npx jumpspace scan
```

The generated index is useful for fast reads, but the source of truth is still your Markdown.

## Find And Ask

Use `find` when you know the words you are looking for:

```bash
npx jumpspace find approval
npx jumpspace find approval review --mode any
```

`find` defaults to strict all-term matching. Use `--mode any` for broader recall.

Use `ask` when you want an evidence summary:

```bash
npx jumpspace ask "How does approval work?"
npx jumpspace ask "How does approval work?" --json
```

`ask` is retrieval, not authority. It should show task IDs, paths, match reasons, coverage, unanswered terms, and linked code/tests. If the evidence is weak, it should say what was not answered.

## Start Agent Work

When a task is approved and has a valid plan, use:

```bash
npx jumpspace work DOC-EXAMPLE-001 --json
```

That packet includes task intent, code and test links, acceptance criteria, current plan state, next unblocked steps, verification records, guardrails, schema names, and optional drift facts.

## Keep The Loop Tight

The normal loop is:

```bash
npx jumpspace scan
npx jumpspace audit --json
npx jumpspace work DOC-EXAMPLE-001 --json
# implement the step
npx jumpspace step complete DOC-EXAMPLE-001 design --evidence "Human approved the design."
npx jumpspace verify DOC-EXAMPLE-001 --check "npm test" --criteria AC-1 --json
```
