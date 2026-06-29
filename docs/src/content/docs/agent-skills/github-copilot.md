---
title: GitHub Copilot
description: Current manual guidance for using Jumpspace with GitHub Copilot.
---

Jumpspace does not ship a native GitHub Copilot installer today.

Use Jumpspace through the CLI and keep repo guidance in Markdown:

```bash
npx jumpspace init --auto
npx jumpspace add-skill --all
npx jumpspace scan
```

For pull requests, use:

```bash
npx jumpspace ci --since main --json
npx jumpspace pr comment --since main
```

`pr comment` renders a review-only comment. It does not post to GitHub by
itself.

## First Prompt

```text
Before suggesting code, inspect Jumpspace task memory and linked files. Use
Jumpspace evidence to explain which docs, code, and tests support the change.
```

## Roadmap

Native Copilot integration is a future improvement, not a current command.
