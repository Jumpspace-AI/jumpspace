---
title: Manual Install
description: Use Jumpspace with agents that do not have a dedicated installer.
---

Use manual install when your agent does not have a dedicated `add-skill` target.

## Install CLI And Repo Files

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
```

Even if your agent is not Codex or Claude Code, the generated Markdown guidance
is useful source material.

## Tell The Agent What To Read

Point it at:

- `README.md`
- `skills/README.md`
- `AGENTS.md` or `CLAUDE.md`, if present
- `docs/src/content/docs/start-here/quickstart.md`
- `docs/src/content/docs/core-concepts/intents.md`
- `docs/src/content/docs/core-concepts/scopes-and-lookup.md`

## First Prompt

```text
Use Jumpspace as repo-local intent memory. Before editing scoped files, run
intent check for the paths you may touch, read matching decisions and rejected
alternatives, and report when no intent applies.
```

If the repo intentionally uses task blocks, also read the advanced task graph
docs and use `jumpspace task ...` commands for work packets and handoffs.

## Safe Rerun

`add-skill` is idempotent for supported targets. For manual-only agents, review
the generated Markdown guidance and copy the relevant parts into that agent's
preferred instruction file.
