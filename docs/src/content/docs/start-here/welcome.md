---
title: Welcome
description: What Jumpspace is, who it is for, and the first intent-memory workflow to try.
---

Jumpspace is repo-local intent memory for AI coding agents.

It turns source-controlled Markdown into durable decisions, rationale, rejected
alternatives, and scoped path checks that agents can read before editing code.

## The First Win

The first win is not a perfect knowledge graph. The first win is giving an
agent a grounded way to answer:

- Which decisions apply to the files I am about to edit?
- Why did the team choose this direction?
- Which tempting alternatives were already rejected?
- Should this branch add one durable intent, or is the code enough?
- What can the next agent learn without relying on chat history?

## Who It Is For

Use Jumpspace when:

- your team uses AI coding agents across sessions or branches
- product or architecture intent is easy to lose between sessions
- issue trackers and commits do not explain why decisions were made
- agents keep rediscovering rejected alternatives
- you want repo-local state instead of hosted memory

Skip it for tiny throwaway repos where a README and grep are enough.

## What To Run First

For a new or clean repo:

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli intent list
npx @jumpspace/cli intent validate --json
```

Then add one intent under `documentation/intents/` for a decision code cannot
explain, and run:

```bash
npx @jumpspace/cli intent check --for src/app/page.tsx
```

For teams that also want source-backed task state, continue with the
[advanced bootstrap workflow](/start-here/existing-repo-bootstrap/).

For agent setup, go to [Agent Setup](/start-here/agent-setup/).
