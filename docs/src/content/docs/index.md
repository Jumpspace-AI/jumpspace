---
title: Jumpspace
description: Repo-local implementation memory for AI coding agents.
---

Jumpspace helps a repository remember why work exists, where the implementation lives, which tests protect it, and what an agent should do next.

It is not a hosted service and it is not a replacement for your source docs. It is a thin, source-controlled graph that connects Markdown intent to code, tests, plans, verification records, drift checks, and agent handoff packets.

## What You Can Do

- Create source-backed task blocks in Markdown.
- Scan those blocks into a repo-local index.
- Ask evidence questions without treating retrieval as an oracle.
- Give Codex, Claude Code, or another coding agent a grounded work packet.
- Bootstrap a graph from an existing messy repo.
- Track durable plans, next steps, and verification evidence.
- Detect code/doc drift in CI and propose repairs.
- Publish JSON contracts and SDK types for automation.

## Five-Minute Path

```bash
npm install -D jumpspace
npx jumpspace init --auto
npx jumpspace add-skill --codex
npx jumpspace add-skill --claude
npx jumpspace scan
npx jumpspace find approval
npx jumpspace ask "How does approval work?"
```

Once a task is approved and has a durable plan, hand the work to an agent:

```bash
npx jumpspace work DOC-EXAMPLE-001 --json
```

## How This Site Is Organized

Start with [Why Jumpspace?](/getting-started/why-jumpspace/) for the thesis, then [Getting Started](/getting-started/) for setup. If you are adding Jumpspace to an existing codebase, use [New Repo Use](/getting-started/new-repo/) for the clean onboarding path.

If you want Codex or Claude Code to run most of the workflow for you, read [Using With Agents](/agents/using-with-agents/). You can give the agent a plain-English request and let it use Jumpspace commands for discovery, bootstrap, planning, execution packets, verification, and handoff.

Then read [Task Blocks](/getting-started/task-blocks/) to understand the source format. The advanced guides cover bootstrap, planning, verification, retrieval, drift, CI, repair, and agent skills.

For scripting, use the [CLI Reference](/reference/cli/) and [JSON Contracts](/core-concepts/json-contracts/) pages before depending on a response shape.
