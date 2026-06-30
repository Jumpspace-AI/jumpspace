---
id: intent-first-no-local-ui
status: active
scope: src/cli.ts, src/core/agentSkills.ts, src/templates/SKILL.md, src/templates/AGENTS.md, README.md, CHANGELOG.md, docs/specs/intent-memory-v1.md, docs/src/content/docs/reference/cli.md, docs/src/content/docs/start-here/agent-setup.md, docs/src/content/docs/agent-skills/overview.md, documentation/intents/2026-06-30-task-graph-commands-are-namespaced.md
---

# Jumpspace stays intent-first and does not carry a local browser UI

## Decision
Jumpspace's default product surface is repo-local intent memory through CLI commands and agent skills. The local browser UI is removed instead of carried as dormant code, and task graph workflows are namespaced and documented as advanced opt-in behavior rather than the primary onboarding path.

## Why
The pivot is only real if the codebase stops teaching the old model by default. A graph UI, first-graph bootstrap narrative, and task-first agent guidance make Jumpspace feel like a task system with intent bolted on. Removing the UI and demoting task/work/verify language keeps the product smaller, easier to explain, and better aligned with "what code cannot tell you."

## Alternatives rejected
- **Keep the UI in case it becomes useful later.** Git history already preserves the code; shipping dormant surface area makes the current product noisier.
- **Leave task graph onboarding as the main path.** It explains the old product well, but it causes new users and agents to over-produce task state when a small intent would do.
- **Namespace schemas but keep top-level task command aliases.** That would soften migration, but it would leave the first external release teaching two product models at once. The cleaner `0.2.0` boundary is to put task graph commands and task graph schemas under `task`.

## When this intent will change
If dogfood shows users need a visual review surface after the intent-first workflow is stable, rebuild it from current product needs rather than reviving the old task graph dashboard by default.
