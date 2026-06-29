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
- `.codex/skills/jumpspace-handoff/SKILL.md`

To install one pipeline skill plus the reference workflow:

```bash
npx @jumpspace/cli add-skill jumpspace-work --agent codex
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
Use the repo's Jumpspace guidance. Start with scan/find/context or work packets
before editing code, and record evidence with Jumpspace when the task changes.
```

## Safe Reruns

The installer is additive and idempotent. It creates missing files or updates
clearly marked Jumpspace-managed blocks.

## Manual Removal

There is no automatic uninstall command today. Remove the Jumpspace-managed
blocks from `AGENTS.md` and remove `.codex/skills/jumpspace-*` directories if
you want to uninstall manually.
