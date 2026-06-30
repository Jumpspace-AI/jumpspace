---
title: Overview
description: How Jumpspace skills teach coding agents to use repo-local intent memory.
---

Jumpspace skills are repo-local instructions for coding agents.

They tell the agent how to:

- run Jumpspace before editing code
- treat `ask` as evidence, not an oracle
- check scoped intents before editing likely paths
- use `work <id>` only for the advanced task workflow
- record step completion and verification evidence when task workflow is in use
- run audit, doctor, drift, and handoff before pausing
- fall back to code search when Jumpspace evidence is incomplete

## Install

```bash
npx @jumpspace/cli add-skill --all
```

Supported targets today:

- Codex: `--codex`
- Claude Code: `--claude`
- one supported agent: `--agent codex` or `--agent claude`
- all supported targets: `--all`

## Reference Vs Pipeline Skills

`jumpspace-workflow` is the reference skill: it is loaded into the agent's repo
context so the agent knows how to use Jumpspace concepts and commands.

Pipeline skills package narrower workflows:

- `jumpspace-bootstrap`: advanced task graph import from existing docs
- `jumpspace-work`: advanced implementation from an approved task packet
- `jumpspace-review`: review drift, changed files, links, CI packets, and PR evidence
- `jumpspace-intent-review`: locally review branch diffs against matched intents
- `jumpspace-handoff`: preserve source-backed state before pausing or switching agents

Install the full bundle with `add-skill --all`, or install one pipeline skill
plus the reference workflow:

```bash
npx @jumpspace/cli add-skill jumpspace-work --agent claude
npx @jumpspace/cli add-skill review --agent codex
npx @jumpspace/cli add-skill intent-review --agent codex
```

## Where Files Go

Codex:

- `AGENTS.md`
- `.codex/skills/jumpspace-workflow/SKILL.md`
- `.codex/skills/jumpspace-bootstrap/SKILL.md`
- `.codex/skills/jumpspace-work/SKILL.md`
- `.codex/skills/jumpspace-review/SKILL.md`
- `.codex/skills/jumpspace-intent-review/SKILL.md`
- `.codex/skills/jumpspace-handoff/SKILL.md`

Claude Code:

- `CLAUDE.md`
- `.claude/skills/jumpspace-workflow/SKILL.md`
- `.claude/skills/jumpspace-bootstrap/SKILL.md`
- `.claude/skills/jumpspace-work/SKILL.md`
- `.claude/skills/jumpspace-review/SKILL.md`
- `.claude/skills/jumpspace-intent-review/SKILL.md`
- `.claude/skills/jumpspace-handoff/SKILL.md`

Installation is idempotent and updates only Jumpspace-managed blocks.
