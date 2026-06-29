---
title: Cursor
description: Current manual guidance for using Jumpspace with Cursor.
---

Jumpspace does not ship a dedicated Cursor installer yet.

Use the manual path:

```bash
npx jumpspace add-skill --all
npx jumpspace scan
```

Then point Cursor at the repo guidance and docs:

- `AGENTS.md`, if present
- `skills/README.md`
- this docs section

## First Prompt

```text
Use Jumpspace as repo-local implementation memory. Run scan, find, ask, context,
or work as appropriate before editing. Treat ask output as evidence, not an
authoritative answer.
```

## Roadmap

A dedicated Cursor target may be added later. Until then, use manual guidance
and the CLI directly.
