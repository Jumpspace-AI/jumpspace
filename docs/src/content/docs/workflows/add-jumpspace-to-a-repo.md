---
title: Add Jumpspace To A Repo
description: Install, initialize, scan, diagnose, and commit the shared files.
---

Use this workflow for a repo that is adopting Jumpspace from scratch.

## 1. Install

```bash
npm install -D @jumpspace/cli
```

## 2. Initialize

```bash
npx @jumpspace/cli init --auto
```

`--auto` discovers common docs roots and writes a starter `.jumpspace/config.json`.
Plain `init` keeps the conservative default. Both paths create or refresh a
managed `.gitignore` block for Jumpspace runtime locks, semantic caches, and
one-shot bootstrap proposal files.

## 3. Add Agent Guidance

```bash
npx @jumpspace/cli add-skill --all
```

This adds repo-local guidance for supported coding agents.

## 4. Scan And Diagnose

```bash
npx @jumpspace/cli task scan
npx @jumpspace/cli task doctor
npx @jumpspace/cli task audit
```

`scan` writes the generated index. `doctor` gives operator-friendly diagnostics.
`audit` validates task metadata and linked files.

## 5. Commit The Shared State

Usually commit:

- `.jumpspace/config.json`
- `.gitignore` if `init` added the Jumpspace-managed ignore block
- Markdown docs with `<!-- jumpspace ... -->` task blocks
- repo-local agent guidance files created by `add-skill`
- CI files created by `init --ci github`, if used

The managed ignore block leaves `.jumpspace/index.json` and mutation logs to
your repo policy, but ignores `.jumpspace/locks/`,
`.jumpspace/semantic-index.json`, `.jumpspace/semantic-lancedb/`,
`jumpspace-bootstrap.json`, and `jumpspace-bootstrap-context.json`.

## Optional CI Setup

```bash
npx @jumpspace/cli init --ci github --dry-run --json
npx @jumpspace/cli init --ci github
```

The generated workflow is local-only Jumpspace analysis. It scans, refreshes
the semantic index, renders the PR packet, and runs audit/doctor without
requiring a hosted Jumpspace service.
