---
title: Canonical Demo
description: The end-to-end story Jumpspace should make easy to show.
---

This demo uses real commands and a generic project-management example. Replace
paths and task IDs with ones from your repo.

## 1. A Repo Has Markdown Docs

Start with docs such as `README.md`, `docs/product.md`, or
`docs/architecture.md`.

## 2. Initialize Jumpspace

```bash
npm install -D @jumpspace/cli
npx jumpspace init --auto
npx jumpspace add-skill --all
```

## 3. Bootstrap Source-Backed Task Blocks

```bash
npx jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json
npx jumpspace bootstrap validate --file jumpspace-bootstrap.json
npx jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run
```

Review the proposal, then apply:

```bash
npx jumpspace bootstrap apply --file jumpspace-bootstrap.json
npx jumpspace scan
```

## 4. Ask Where A Behavior Is Implemented

```bash
npx jumpspace ask "Where are project invites implemented?" --json
```

Treat the response as evidence. Inspect task IDs, paths, match reasons, linked
code/tests, coverage, and unanswered terms.

## 5. Start Agent Work From A Task Packet

```bash
npx jumpspace work DOC-PROJECT-001 --json
```

The agent should inspect the packet before editing code.

## 6. Complete A Plan Step

```bash
npx jumpspace step complete DOC-PROJECT-001 design --evidence "Human approved the implementation plan."
```

## 7. Verify Work

```bash
npx jumpspace verify DOC-PROJECT-001 --check "npm test" --criteria AC-1 --evidence "Focused tests passed."
```

`verified` is earned only when checks pass.

## 8. Detect Drift During PR Review

```bash
npx jumpspace changed --since main --json
npx jumpspace drift --since main --json
npx jumpspace pr comment --since main
```

The PR comment is review-only text; it does not post to GitHub.

## 9. Hand Off To The Next Agent

```bash
npx jumpspace handoff --task DOC-PROJECT-001 --json
```

The next agent can resume from repo-local implementation memory instead of
private chat history.
