---
title: Codex
description: Install and verify Jumpspace guidance for Codex.
---

## Install

```bash
npx @jumpspace/cli add-skill --codex
```

This creates or updates:

- `AGENTS.md`
- `.codex/skills/jumpspace-workflow/SKILL.md`
- `.codex/skills/jumpspace-bootstrap/SKILL.md`
- `.codex/skills/jumpspace-work/SKILL.md`
- `.codex/skills/jumpspace-review/SKILL.md`
- `.codex/skills/jumpspace-intent-review/SKILL.md`
- `.codex/skills/jumpspace-handoff/SKILL.md`

To install one pipeline skill plus the reference workflow:

```bash
npx @jumpspace/cli add-skill jumpspace-work --agent codex
npx @jumpspace/cli add-skill intent-review --agent codex
```

## Verify

```bash
npx @jumpspace/cli add-skill --codex --json
npx @jumpspace/cli release install-doctor --json
```

`release install-doctor` is useful when Codex appears to be running an older
linked Jumpspace build than the current checkout.

## First Prompt

```text
Use the repo's Jumpspace guidance. Check matching intents before editing likely
paths, then use task packets only if this repo has opted into the advanced task
workflow.
```

For PR comments that mention matched intents:

```text
Use the jumpspace-intent-review skill to review this branch against the matched
intents. Report possible violations only with quoted intent and diff evidence.
```

## Safe Reruns

The installer is additive and idempotent. It creates missing files or updates
clearly marked Jumpspace-managed blocks.

## Manual Removal

There is no automatic uninstall command today. Remove the Jumpspace-managed
blocks from `AGENTS.md` and remove `.codex/skills/jumpspace-*` directories if
you want to uninstall manually.
