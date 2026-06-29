---
title: Welcome
description: What Jumpspace is, who it is for, and the first useful thing to try.
---

Jumpspace is implementation memory for AI coding agents.

It turns source-controlled Markdown into a map between product intent, code,
tests, acceptance criteria, durable plans, verification records, drift checks,
and handoff state.

## The First Win

The first win is not a perfect knowledge graph. The first win is giving an
agent a grounded way to answer:

- What does this repo already know?
- Which docs describe the behavior?
- Which code and tests are linked to that intent?
- What work is approved, blocked, verified, or stale?
- What should the next agent do without relying on chat history?

## Who It Is For

Use Jumpspace when:

- your team uses AI coding agents across sessions or branches
- product intent lives in Markdown docs
- issue trackers and commits are not enough implementation context
- code/docs drift causes repeated rediscovery work
- you want repo-local state instead of hosted memory

Skip it for tiny throwaway repos where a README and grep are enough.

## What To Run First

For a new or clean repo:

```bash
npm install -D @jumpspace/cli
npx jumpspace init --auto
npx jumpspace add-skill --all
npx jumpspace doctor
```

For an existing repo with useful Markdown docs, continue with
[Existing Repo Bootstrap](/start-here/existing-repo-bootstrap/).

For agent setup, go to [Agent Setup](/start-here/agent-setup/).
