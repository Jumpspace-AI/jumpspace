---
title: Plans
description: Durable ordered steps that agents can execute and update.
---

A durable plan belongs in the task block. It gives agents ordered work instead
of relying on a chat plan that disappears.

Plans include:

- task ID
- goal
- status
- ordered steps

Top-level plan `status` and each step `status` use the same values:
`pending`, `in_progress`, `complete`, or `blocked`.

Each step can include:

- stable step ID
- observable outcome
- status
- dependencies
- linked source files
- linked tests
- executable checks
- evidence

## Commands

```bash
npx @jumpspace/cli plan review DOC-PROJECT-001
npx @jumpspace/cli plan save DOC-PROJECT-001 --file plan.yml
npx @jumpspace/cli plan show DOC-PROJECT-001
npx @jumpspace/cli plan validate DOC-PROJECT-001
npx @jumpspace/cli next DOC-PROJECT-001
```

`next` returns only pending unblocked steps.
