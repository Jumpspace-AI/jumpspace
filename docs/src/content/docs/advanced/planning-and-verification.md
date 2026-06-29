---
title: Planning And Verification
description: Durable plans, next executable steps, and earned verification records.
---

Jumpspace separates implementation progress from verification.

A plan says what should happen next. A step completion records evidence that a step happened. Verification records prove that checks passed against acceptance criteria.

## Durable Plans

Review a plan:

```bash
npx @jumpspace/cli plan review DOC-EXAMPLE-001 --json
npx @jumpspace/cli plan show DOC-EXAMPLE-001
```

Save a plan:

```bash
npx @jumpspace/cli plan save DOC-EXAMPLE-001 --file plan.yml --json
```

Validate it:

```bash
npx @jumpspace/cli plan validate DOC-EXAMPLE-001 --json
```

Plan validation enforces unique step IDs, valid dependencies, acyclic dependencies, and evidence requirements for completed steps.

## Next Steps

```bash
npx @jumpspace/cli next DOC-EXAMPLE-001 --json
```

`next` only returns pending, unblocked steps. A blocked dependency means the step is not ready.

## Step Completion

```bash
npx @jumpspace/cli step complete DOC-EXAMPLE-001 implementation --evidence "Added approval service and tests."
```

A step cannot be completed while dependencies are incomplete, and completed steps must have evidence.

## Status

```bash
npx @jumpspace/cli status DOC-EXAMPLE-001 implemented
```

`verified` is protected. This is rejected:

```bash
npx @jumpspace/cli status DOC-EXAMPLE-001 verified
```

Use `verify` instead.

## Verification

```bash
npx @jumpspace/cli verify DOC-EXAMPLE-001 --check "npm test" --criteria AC-1 --evidence "Focused tests passed." --json
```

Verification runs checks itself and records:

- verification ID
- timestamp
- commit SHA
- command text
- exit codes
- acceptance criteria covered
- evidence text

Failed checks do not write a verification record and do not set the task to `verified`.

## Agent Start Packet

Use `work` when an agent should begin implementation:

```bash
npx @jumpspace/cli work DOC-EXAMPLE-001 --json
npx @jumpspace/cli work DOC-EXAMPLE-001 --since main --json
```

With `--since`, the packet also includes drift facts and warnings.
