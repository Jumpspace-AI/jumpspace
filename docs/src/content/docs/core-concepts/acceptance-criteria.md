---
title: Acceptance Criteria
description: Stable criteria IDs that verification records can cover.
---

Acceptance criteria make completion explicit.

```yaml
acceptance_criteria:
  - id: AC-1
    description: A project admin can invite a teammate by email.
  - id: AC-2
    description: Expired invites cannot be accepted.
```

Use stable IDs because `jumpspace verify` records which criteria were covered.

```bash
npx jumpspace verify DOC-PROJECT-001 --check "npm test" --criteria AC-1 AC-2
```

Verification fails if a provided criterion ID does not exist.
