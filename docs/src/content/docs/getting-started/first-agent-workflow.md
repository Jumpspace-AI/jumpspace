---
title: First Agent Workflow
description: A practical Jumpspace loop for pairing a human with a coding agent.
---

Jumpspace works best when the human approves intent in docs, then the agent executes against that approved source.

## 1. Find The Task

```bash
npx @jumpspace/cli task find "approval flow" --json --compact
npx @jumpspace/cli task context DOC-EXAMPLE-001 --json
```

Use compact results for cheap orientation, then pull full context for the task you actually plan to work on.

## 2. Review Or Save A Plan

Review the current plan:

```bash
npx @jumpspace/cli task plan review DOC-EXAMPLE-001 --json
npx @jumpspace/cli task plan show DOC-EXAMPLE-001
```

Save an approved plan:

```bash
npx @jumpspace/cli task plan save DOC-EXAMPLE-001 --file plan.yml --json
npx @jumpspace/cli task plan validate DOC-EXAMPLE-001 --json
```

A useful plan step has:

- a stable step ID
- an observable outcome
- dependencies
- linked source files
- linked tests
- executable checks
- evidence after completion

## 3. Ask For The Next Step

```bash
npx @jumpspace/cli task next DOC-EXAMPLE-001 --json
```

`next` returns pending steps whose dependencies are complete. It does not return blocked steps.

## 4. Start Work From A Packet

```bash
npx @jumpspace/cli task work DOC-EXAMPLE-001 --json
```

Use `work` when you want the full agent start packet. It gates on task approval, dependency state, audit health, and plan validity.

## 5. Complete A Step

After the implementation step is done, record evidence:

```bash
npx @jumpspace/cli task step complete DOC-EXAMPLE-001 design --evidence "Human approved the interaction states."
```

Step completion is not a substitute for verification. It records progress in the durable plan.

## 6. Verify The Task

```bash
npx @jumpspace/cli task verify DOC-EXAMPLE-001 --check "npm test" --criteria AC-1 --evidence "Focused test suite passed." --json
```

`verify` runs the checks itself, records exit codes, commit SHA, timestamp, criteria coverage, and evidence, and only sets `verified` when the checks pass and criteria IDs exist.

## 7. Hand Off

```bash
npx @jumpspace/cli task handoff --task DOC-EXAMPLE-001 --json
```

The handoff packet gives the next agent or human a concise state summary, recent mutations, health signals, and next useful commands.
