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
Plain `init` keeps the conservative default.

## 3. Add Agent Guidance

```bash
npx @jumpspace/cli add-skill --all
```

This adds repo-local guidance for supported coding agents.

## 4. Scan And Diagnose

```bash
npx @jumpspace/cli scan
npx @jumpspace/cli doctor
npx @jumpspace/cli audit
```

`scan` writes the generated index. `doctor` gives operator-friendly diagnostics.
`audit` validates task metadata and linked files.

## 5. Commit The Shared State

Usually commit:

- `.jumpspace/config.json`
- Markdown docs with `<!-- jumpspace ... -->` task blocks
- repo-local agent guidance files created by `add-skill`
- CI files created by `init --ci github`, if used

Review whether generated indexes belong in your repo policy before committing
them.

## Optional CI Setup

```bash
npx @jumpspace/cli init --ci github --dry-run --json
npx @jumpspace/cli init --ci github
```

The generated workflow is local-only Jumpspace analysis. It does not require a
hosted Jumpspace service.
