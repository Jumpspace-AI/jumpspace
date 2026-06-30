---
title: OpenCode
description: Current manual guidance for using Jumpspace with OpenCode.
---

Jumpspace does not ship a dedicated OpenCode installer today.

Use the manual path:

```bash
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli task scan
```

Then configure OpenCode to read the repo guidance files that exist in your
checkout.

## First Prompt

```text
Use Jumpspace to gather source-backed implementation context before changing
code. Start from work packets when a task ID is available.
```

## Verification

Ask the agent to finish with:

```bash
npx @jumpspace/cli task audit --json
npx @jumpspace/cli task doctor --json
npx @jumpspace/cli task handoff --json
```

## Roadmap

A dedicated OpenCode target may be added later.
