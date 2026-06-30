---
title: Cursor
description: Current manual guidance for using Jumpspace with Cursor.
---

Jumpspace does not ship a dedicated Cursor installer yet.

Use the manual path:

```bash
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli intent list
```

Then point Cursor at the repo guidance and docs:

- `AGENTS.md`, if present
- `skills/README.md`
- this docs section

## First Prompt

```text
Use Jumpspace as repo-local intent memory. Run intent check for files you may
edit, read matching decisions and rejected alternatives, and treat task ask
output as evidence only when this repo intentionally uses the advanced task
graph.
```

## Roadmap

A dedicated Cursor target may be added later. Until then, use manual guidance
and the CLI directly.
