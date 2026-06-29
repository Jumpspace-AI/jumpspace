---
title: Status Lifecycle
description: The task states Jumpspace uses to gate work and verification.
---

Common statuses:

- `draft`: early thinking
- `proposed`: ready for review
- `approved`: accepted source of truth for future implementation
- `partial`: work has started
- `implemented`: code exists and is linked
- `verified`: checks have passed through `jumpspace verify`
- `stale`: no longer trusted as current behavior

Update non-verified statuses with:

```bash
npx @jumpspace/cli status DOC-PROJECT-001 implemented
```

Earn verified status with:

```bash
npx @jumpspace/cli verify DOC-PROJECT-001 --check "npm test" --criteria AC-1
```
