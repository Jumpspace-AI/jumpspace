---
title: Jumpspace
description: Repo-local intent memory for AI coding agents.
---

Jumpspace gives coding agents repo-local intent memory: source-controlled
decisions, rationale, rejected alternatives, and scoped paths an agent should
check before editing code.

It is not generic memory and it is not a hidden hosted knowledge graph. It is a
small set of Markdown records plus CLI packets that help agents understand what
code alone cannot explain.

> Jumpspace is alpha software. CLI commands, JSON schemas, task metadata fields,
> and generated agent guidance may change before a stable 1.0 release. Pin
> versions in CI and review changelogs before upgrading.

## First Useful Path

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli intent list
npx @jumpspace/cli intent check --for src/app/page.tsx
```

If the repo does not have intent files yet, write one decision that code cannot
explain and save it under `documentation/intents/`.

## Where To Go

- [Welcome](/start-here/welcome/) explains the first win.
- [Quickstart](/start-here/quickstart/) gives three copy-paste paths.
- [Why Jumpspace?](/start-here/why-jumpspace/) explains the category.
- [Agent Setup](/start-here/agent-setup/) installs guidance for coding agents.
- [Intents](/core-concepts/intents/) explains what belongs in durable memory.
- [Scopes And Lookup](/core-concepts/scopes-and-lookup/) shows how path-scoped matching works.
- [Ask Questions With Evidence](/workflows/ask-questions-with-evidence/) shows how to use retrieval honestly.
- [Start Agent Work](/workflows/start-agent-work/) explains work packets.
- [Verify Work](/workflows/verify-work/) records checks and acceptance coverage.
- [Review PR Drift](/workflows/review-pr-drift/) prepares PR evidence.
- [Jumpspace Cloud](/jumpspace-cloud/) is looking for early design partners.
- [CLI Reference](/reference/cli/) lists supported commands and examples.

## Agent Rule

When using Jumpspace as an agent, run `intent check --for <path>` before
editing scoped files. Treat `task ask` and `task work` as advanced task-graph
tools for repos that intentionally use task blocks.
