---
title: Source-Backed Memory
description: Why Jumpspace keeps intent and workflow memory in source-controlled files.
---

Source-backed memory means the agent can cite where the implementation context
came from.

Jumpspace does not ask you to trust hidden memory. It records durable intents in
Markdown, scopes them to code paths, and keeps optional task workflow state in
source-controlled docs when a team chooses to use that layer.

## What The Agent Gets

- intent IDs, decisions, rationale, and rejected alternatives
- scope patterns for the files the agent is about to edit
- source paths the agent can cite in its response
- PR-level intent verification packets
- optional task IDs, plans, verification evidence, and drift facts for teams
  using the advanced task graph

## Why It Matters

Portable chat memory is weak. Repo-local source-backed memory is reviewable,
diffable, and available to the next agent.
