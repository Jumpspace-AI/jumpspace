---
title: Handoff Between Agents
description: Preserve work state without relying on chat history.
---

Agent chat history is not portable. Jumpspace handoff writes and summarizes
repo-local implementation state so another agent can resume.

## Before Handoff

Run the checks that match the work:

```bash
npx @jumpspace/cli task scan
npx @jumpspace/cli task audit --json
npx @jumpspace/cli task doctor --json
npx @jumpspace/cli task plan validate DOC-PROJECT-001 --json
npx @jumpspace/cli task handoff --task DOC-PROJECT-001 --json
```

If a Git baseline exists:

```bash
npx @jumpspace/cli task ci --since main --json
```

## What To Record

Record durable state in the task block, not only in chat:

- completed plan steps with evidence
- changed status, except `verified`
- verification records from `jumpspace task verify`
- new or repaired code/test links
- explicit gaps when evidence is missing

## Mutation History

```bash
npx @jumpspace/cli task last --json
npx @jumpspace/cli task history --task DOC-PROJECT-001 --json
```

Use history when the next agent needs to know what Jumpspace changed during the
session.

## First Prompt For The Next Agent

```text
Use Jumpspace to resume this task. Start with handoff and work packets, inspect
linked files, and do not rely on prior chat history as the source of truth.
```

The next agent should then run:

```bash
npx @jumpspace/cli task handoff --task DOC-PROJECT-001 --json
npx @jumpspace/cli task work DOC-PROJECT-001 --json
```
