---
title: Verify Work
description: Earn verified status with checks, acceptance criteria, commit SHA, and evidence.
---

`verified` is protected. Do not use `status <id> verified`; Jumpspace rejects it.
Verified status must be earned with `jumpspace task verify`.

## Successful Verification

```bash
npx @jumpspace/cli task verify DOC-PROJECT-001 \
  --check "npm test" \
  --criteria AC-1 \
  --evidence "Focused invitation tests passed."
```

Verification records include:

- timestamp
- commit SHA
- checks run
- exit codes
- acceptance criteria covered
- evidence

The task status changes to `verified` only when all checks pass and every
provided criterion ID exists.

## Failed Checks

Failed checks do not write a verification record and do not mutate the task to
`verified`.

Use normal statuses while work is in progress:

```bash
npx @jumpspace/cli task status DOC-PROJECT-001 partial
npx @jumpspace/cli task status DOC-PROJECT-001 implemented
```

## Review Verification State

```bash
npx @jumpspace/cli task context DOC-PROJECT-001 --json
npx @jumpspace/cli task audit --json
```

`audit` detects invalid completed-step state and invalid verification metadata.
