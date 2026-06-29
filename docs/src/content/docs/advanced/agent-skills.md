---
title: Agent Skills
description: Add repo-local Jumpspace guidance for Codex, Claude Code, and other coding agents.
---

Jumpspace is most useful when agents know to use it first, then fall back to code reading when needed.

## Install Skills

```bash
npx @jumpspace/cli add-skill --codex
npx @jumpspace/cli add-skill --claude
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli add-skill jumpspace-work --agent claude
```

The installer is additive and non-destructive. It creates missing files or updates clearly marked Jumpspace-managed blocks. It should not overwrite user-authored guidance outside those markers.
Named installs add the reference workflow skill plus the selected pipeline skill.

## What The Skill Tells Agents

The generated guidance tells agents to:

- run Jumpspace discovery before broad repository reads
- treat `ask` as evidence, not authority
- use JSON schemas before scripting against command output
- use `work` for approved implementation
- use `next` for plan steps
- record step evidence
- use `verify` to earn verified state
- run scan, audit, and doctor after metadata mutations
- fall back to `rg` and direct code reads when Jumpspace evidence is missing

## Useful Agent Commands

```bash
npx @jumpspace/cli find "approval flow" --json --compact
npx @jumpspace/cli context DOC-EXAMPLE-001 --json
npx @jumpspace/cli work DOC-EXAMPLE-001 --json
npx @jumpspace/cli next DOC-EXAMPLE-001 --json
npx @jumpspace/cli handoff --task DOC-EXAMPLE-001 --json
npx @jumpspace/cli last --json
npx @jumpspace/cli history --json
```

## Check The Active Install

When an agent seems to be running an old CLI, run:

```bash
npx @jumpspace/cli release install-doctor --json
```

This reports the invoked binary, the first `jumpspace` found on `PATH`, package roots, versions, schema counts, workspace comparisons, stale-install warnings, and repair commands.

## Human Pattern

For a small team, the ideal pattern is:

1. The human writes or approves the task block.
2. The agent uses Jumpspace to gather context.
3. The human approves the plan.
4. The agent implements the next step.
5. Jumpspace records evidence and verification.
6. CI checks drift before merge.
