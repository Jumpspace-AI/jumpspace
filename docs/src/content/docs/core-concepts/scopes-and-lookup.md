---
title: Scopes And Lookup
description: How Jumpspace matches active intents to paths an agent may edit.
---

Intent lookup is path-scoped. An agent gives Jumpspace one or more paths, and
Jumpspace returns the active intents whose `scope` patterns match those paths.

```bash
npx @jumpspace/cli intent check --for src/app/page.tsx --json
```

The agent should read the matching intents before editing those files. It does
not need to load every intent into context.

## Scope Values

Use a comma-separated string for simple scopes:

```yaml
scope: src/**/*.ts, src/**/*.tsx
```

Use a YAML array for richer micromatch patterns, including braces and negation:

```yaml
scope:
  - "src/**/*.{ts,tsx}"
  - "!src/**/*.test.ts"
```

## Match Bias

Scopes should be narrow enough to keep lookup useful. A repo-wide intent can be
valid, but it should represent a decision that genuinely applies everywhere.

When lookup returns no matches, agents should not invent intent. They can still
use ordinary code and docs, then propose a new intent only when the missing
decision is durable and code cannot explain it.
