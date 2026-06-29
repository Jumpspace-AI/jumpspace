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
- `docs/src/content/docs/workflows/start-agent-work.md`

## First Prompt

```text
Use Jumpspace as repo-local implementation memory. Before editing, run the
commands needed to find the relevant task, inspect linked docs/code/tests, and
report any gaps in the evidence.
```

## Safe Rerun

`add-skill` is idempotent for supported targets. For manual-only agents, review
the generated Markdown guidance and copy the relevant parts into that agent's
preferred instruction file.
