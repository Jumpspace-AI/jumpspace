---
id: task-graph-commands-are-namespaced
status: active
scope: src/cli.ts, src/core/schemas.ts, src/sdk/contracts.ts, sdk/python/jumpspace_sdk/contracts.py, src/core/workPacket.ts, src/core/handoff.ts, src/core/prAssistant.ts, src/templates/SKILL.md, src/templates/AGENTS.md, README.md, docs/src/content/docs/reference/cli.md, docs/src/content/docs/reference/json-schemas.md, docs/src/content/docs/core-concepts/json-contracts.md
---

# Task graph commands live under the task namespace

## Decision
Advanced task graph workflows use the `jumpspace task ...` namespace, including task lifecycle, planning, retrieval, bootstrap, diagnostics, CI/PR packets, repair, history, handoff, and task schema IDs. The top-level CLI stays focused on setup, intent memory, schema/release inspection, and generic Git change detection.

## Why
External users should meet Jumpspace as repo-local intent memory, not as a task system with intents bolted on. Keeping old task commands as top-level peers makes the pivot feel half-done and encourages agents to reach for task state before intent context. A clear namespace keeps advanced task graph behavior available without making it the product's default mental model.

## Alternatives rejected
- **Keep top-level compatibility aliases.** This would soften the breaking change, but it would preserve the confusing command surface for the first external release.
- **Delete the task graph commands.** That would be cleaner, but the workflows are still useful for teams that explicitly opt into task blocks.
- **Document the demotion only.** Docs cannot compensate for a CLI help screen that still presents task graph commands as first-class defaults.

## When this intent will change
If the external product becomes task-graph-first again, the namespace can be revisited. Until then, new task graph commands and schema contracts should stay under `task`.
