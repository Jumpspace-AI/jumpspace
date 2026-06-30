---
title: Intents
description: Durable repo-local decisions that code alone cannot explain.
---

An intent is a source-controlled Markdown record for a decision a future agent
should honor.

Use an intent for product constraints, architecture choices, rejected
alternatives, and other rationale that would be expensive or risky for a fresh
agent to rediscover from code alone.

## What Belongs In An Intent

- A current decision.
- Why the decision exists.
- Alternatives the team rejected.
- The code paths where the decision should be checked.

Do not create intents for patterns a fresh agent can infer by reading nearby
code. If one feature produces more than three new active intents, challenge the
capture before adding more durable memory.

## File Shape

By default, Jumpspace reads intents from `documentation/intents/*.md`.

```md
---
id: no-pre-launch-feature-flags
status: active
scope: src/**/*.ts, src/**/*.tsx
---

# Do not gate new code paths behind runtime feature flags

## Decision
New features ship without runtime feature-flag gates before launch.

## Why
Feature flags add a second state dimension the team does not need yet.

## Alternatives rejected
- **Environment-variable gates.** They still create cleanup debt.
```

Run:

```bash
npx @jumpspace/cli intent list
npx @jumpspace/cli intent validate --json
```

## Lifecycle

Use `active` for decisions that still bind future work. Use `superseded` when a
new intent replaces an old one, and cite the successor so agents do not follow
stale guidance.
