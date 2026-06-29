---
title: Source-Backed Memory
description: Why Jumpspace keeps implementation context in Markdown and linked files.
---

Source-backed memory means the agent can cite where the implementation context
came from.

Jumpspace does not ask you to trust hidden memory. It records task metadata in
Markdown and links that intent to code, tests, dependencies, refs, plans, and
verification records.

## What The Agent Gets

- source doc path and heading
- task ID and lifecycle status
- linked code and tests
- acceptance criteria
- plan steps
- verification evidence
- drift facts and warnings

## Why It Matters

Portable chat memory is weak. Repo-local source-backed memory is reviewable,
diffable, and available to the next agent.
