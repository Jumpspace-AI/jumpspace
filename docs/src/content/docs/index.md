---
title: Jumpspace
description: Implementation memory for AI coding agents.
---

Jumpspace gives coding agents a source-backed map between docs, code, tests,
acceptance criteria, verification, drift, and handoff state.

It is not generic memory. It is repo-local implementation memory: readable
Markdown task blocks plus CLI packets that help agents understand what matters
before they edit.

> Jumpspace is alpha software. CLI commands, JSON schemas, task metadata fields,
> and generated agent guidance may change before a stable 1.0 release. Pin
> versions in CI and review changelogs before upgrading.

## First Useful Path

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli scan
npx @jumpspace/cli ask "What does this repo know?"
```

If the repo already has docs but no task blocks, start with
[Existing Repo Bootstrap](/start-here/existing-repo-bootstrap/).

## Where To Go

- [Welcome](/start-here/welcome/) explains the first win.
- [Quickstart](/start-here/quickstart/) gives three copy-paste paths.
- [Why Jumpspace?](/start-here/why-jumpspace/) explains the category.
- [Agent Setup](/start-here/agent-setup/) installs guidance for coding agents.
- [Ask Questions With Evidence](/workflows/ask-questions-with-evidence/) shows how to use retrieval honestly.
- [Start Agent Work](/workflows/start-agent-work/) explains work packets.
- [Verify Work](/workflows/verify-work/) records checks and acceptance coverage.
- [Review PR Drift](/workflows/review-pr-drift/) prepares PR evidence.
- [Jumpspace Cloud](/jumpspace-cloud/) is looking for early design partners.
- [CLI Reference](/reference/cli/) lists supported commands and examples.

## Agent Rule

When using Jumpspace as an agent, treat `ask` as an evidence summary, inspect
linked files before editing, and use `work <id>` when a task is ready for
implementation.
