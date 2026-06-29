# Jumpspace Skills For Coding Agents

Jumpspace ships repo-local guidance that teaches AI coding agents how to use
implementation memory instead of relying on chat history.

## Current Installers

| Skill | Type | Use when | Install |
| --- | --- | --- | --- |
| `jumpspace-workflow` | Reference | You want agents to understand Jumpspace concepts, commands, safety rules, and command selection. | `npx @jumpspace/cli add-skill --all` |
| `jumpspace-bootstrap` | Pipeline | You want an agent to build the first graph from existing docs with human approval. | `npx @jumpspace/cli add-skill jumpspace-bootstrap --agent claude` |
| `jumpspace-work` | Pipeline | You want an agent to start from an approved task packet and record evidence. | `npx @jumpspace/cli add-skill jumpspace-work --agent codex` |
| `jumpspace-review` | Pipeline | You want an agent to review drift, changed files, link suggestions, and PR evidence. | `npx @jumpspace/cli add-skill jumpspace-review --agent claude` |
| `jumpspace-handoff` | Pipeline | You want an agent to preserve source-backed handoff state before pausing or switching agents. | `npx @jumpspace/cli add-skill jumpspace-handoff --agent codex` |
| Codex guidance | Reference | You use Codex in the repo. | `npx @jumpspace/cli add-skill --codex` |
| Claude Code guidance | Reference | You use Claude Code in the repo. | `npx @jumpspace/cli add-skill --claude` |

Use short aliases when you prefer them:

```bash
npx @jumpspace/cli add-skill work --agent claude
npx @jumpspace/cli add-skill review --agent codex
```

## What Gets Installed

`npx @jumpspace/cli add-skill --codex` creates or updates:

- `AGENTS.md`
- `.codex/skills/jumpspace-workflow/SKILL.md`
- `.codex/skills/jumpspace-bootstrap/SKILL.md`
- `.codex/skills/jumpspace-work/SKILL.md`
- `.codex/skills/jumpspace-review/SKILL.md`
- `.codex/skills/jumpspace-handoff/SKILL.md`

`npx @jumpspace/cli add-skill --claude` creates or updates:

- `CLAUDE.md`
- `.claude/skills/jumpspace-workflow/SKILL.md`
- `.claude/skills/jumpspace-bootstrap/SKILL.md`
- `.claude/skills/jumpspace-work/SKILL.md`
- `.claude/skills/jumpspace-review/SKILL.md`
- `.claude/skills/jumpspace-handoff/SKILL.md`

`npx @jumpspace/cli add-skill --all` installs every supported agent target.
Passing a skill name narrows the install to that pipeline skill plus the
reference workflow skill.

## Safety

Skill installation is additive, idempotent, and non-destructive. Jumpspace
creates missing files, appends managed blocks, or updates only clearly marked
Jumpspace-managed blocks.

Run with `--json` when another tool needs to inspect changed files:

```bash
npx @jumpspace/cli add-skill --all --json
```

## First Prompt

After installing guidance, ask the agent:

```text
Read the Jumpspace guidance for this repo. Use Jumpspace to understand existing
implementation memory before changing code, and fall back to code search when
the evidence is incomplete.
```

## Manual Inspection

The installed skill files are plain Markdown. Review them like any other repo
guidance before committing.
