---
title: Quickstart
description: Three copy-paste paths for new repos, existing docs, and agent setup.
---

This page gives you the shortest useful path. Use the
[CLI reference](/reference/cli/) for detailed options.

> Jumpspace is alpha software. Commands and metadata fields may change before a
> stable 1.0 release. Pin versions in CI and review changelogs before upgrading.

## Path 1: New Repo Or Clean Setup

```bash
npm install -D @jumpspace/cli
npx jumpspace init --auto
npx jumpspace add-skill --all
npx jumpspace doctor
```

Add a small task block to a Markdown spec:

```md
## Project invite flow

<!-- jumpspace
id: DOC-PROJECT-001
type: spec
status: approved
module: project-management
space: repo
code:
  - src/project/invitations.ts
tests:
  - tests/project-invitations.test.ts
acceptance_criteria:
  - id: AC-1
    description: A project admin can invite a teammate by email.
-->
```

Then index and inspect it:

```bash
npx jumpspace scan
npx jumpspace context DOC-PROJECT-001
```

## Path 2: Existing Repo Bootstrap

Use this when the repo already has Markdown docs but no Jumpspace task blocks.

```bash
npx jumpspace init --auto
npx jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json
npx jumpspace bootstrap validate --file jumpspace-bootstrap.json
npx jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run
```

Review the proposed task blocks. If they are useful:

```bash
npx jumpspace bootstrap apply --file jumpspace-bootstrap.json
npx jumpspace scan
npx jumpspace doctor
```

Use `bootstrap context README.md docs/**/*.md --json` when you want an AI agent
to reason about headings and propose a better graph before applying anything.

## Path 3: Agent Setup

```bash
npx jumpspace add-skill --all
npx jumpspace scan
npx jumpspace ask "What does this repo know?"
```

Then ask your agent:

```text
Read the repo's Jumpspace guidance, then use Jumpspace to understand the
implementation memory before changing code.
```

`ask` returns an evidence summary, not an authoritative answer. Treat it as a
map of task IDs, paths, match reasons, coverage, and unanswered terms.

## Health Check

Run this whenever setup feels uncertain:

```bash
npx jumpspace doctor --json
npx jumpspace audit --json
npx jumpspace release install-doctor --json
```
