---
title: Start Agent Work
description: Give a coding agent the grounded packet it needs before editing.
---

Use `jumpspace work <id>` when a task is ready for implementation.

## 1. Find The Task

```bash
npx jumpspace scan
npx jumpspace find invitation workflow --json --compact
```

## 2. Review Readiness

```bash
npx jumpspace ready --json
npx jumpspace plan validate DOC-PROJECT-001 --json
npx jumpspace next DOC-PROJECT-001 --json
```

`ready` lists approved dependency-unblocked tasks. `next` returns pending
unblocked plan steps.

## 3. Start From A Work Packet

```bash
npx jumpspace work DOC-PROJECT-001 --json
```

The packet is designed for agents. It includes:

- intent and source doc path
- linked code and tests
- acceptance criteria
- durable plan state
- next executable steps
- verification records
- mutation history
- guardrails
- schema names

Add drift context when a Git baseline is available:

```bash
npx jumpspace work DOC-PROJECT-001 --since main --json
```

## 4. Complete Steps With Evidence

```bash
npx jumpspace step complete DOC-PROJECT-001 design --evidence "Human approved the implementation plan."
```

Jumpspace refuses to complete a blocked step or a step without evidence.

## 5. Hand Off

```bash
npx jumpspace handoff --task DOC-PROJECT-001 --json
```

Use handoff before switching agents, pausing work, or opening a PR.
