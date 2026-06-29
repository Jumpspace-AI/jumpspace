---
title: Claude Code
description: Install and verify Jumpspace guidance for Claude Code.
---

## Install

```bash
npx @jumpspace/cli add-skill --claude
```

This creates or updates:

- `CLAUDE.md`
- `.claude/skills/jumpspace-workflow/SKILL.md`
- `.claude/skills/jumpspace-bootstrap/SKILL.md`
- `.claude/skills/jumpspace-work/SKILL.md`
- `.claude/skills/jumpspace-review/SKILL.md`
- `.claude/skills/jumpspace-handoff/SKILL.md`

To install one pipeline skill plus the reference workflow:

```bash
npx @jumpspace/cli add-skill jumpspace-work --agent claude
```

## Verify

```bash
npx @jumpspace/cli add-skill --claude --json
npx @jumpspace/cli doctor --json
```

The installer is safe to rerun. It updates Jumpspace-managed blocks without
overwriting user-authored content outside those markers.

## First Prompt

```text
Read CLAUDE.md and the Jumpspace workflow skill. Use Jumpspace to orient on the
repo's implementation memory before making changes.
```

For existing docs bootstrap:

```text
Use Jumpspace bootstrap context to inspect the docs, propose a small first graph,
validate it, and show me the proposal before applying.
```

## Removal

There is no automatic uninstall command today. Remove the Jumpspace-managed
blocks from `CLAUDE.md` and remove `.claude/skills/jumpspace-*` directories if
you want to uninstall manually.
