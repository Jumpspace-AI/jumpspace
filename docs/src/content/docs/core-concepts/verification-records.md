---
title: Verification Records
description: Structured proof that checks ran and criteria were covered.
---

Verification records are written by `jumpspace task verify`.

They capture:

- verification timestamp
- commit SHA
- commands run
- exit codes
- acceptance criteria covered
- evidence text

## Why Verified Is Protected

`verified` cannot be set directly:

```bash
npx @jumpspace/cli task status DOC-PROJECT-001 verified
```

That command is rejected. Use:

```bash
npx @jumpspace/cli task verify DOC-PROJECT-001 --check "npm test" --criteria AC-1
```

Failed checks do not write verification records or mark the task verified.
