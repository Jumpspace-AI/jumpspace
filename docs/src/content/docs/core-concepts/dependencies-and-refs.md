---
title: Dependencies And Refs
description: Model task order and graph relationships without turning docs into a tracker.
---

Use `depends_on` for execution order.

```yaml
depends_on:
  - DOC-AUTH-001
```

Use `refs` for structured relationships.

```yaml
refs:
  - type: related_to
    id: ADR-001
    note: Invite expiration follows the account security decision.
```

## Commands

```bash
npx @jumpspace/cli task related DOC-PROJECT-001
npx @jumpspace/cli task query --depends-on-transitive ADR-001 --no-tests --json
```

Dependencies must point at existing task IDs. Plan step dependencies must also
be valid and acyclic.
