---
id: intent-volume-guardrail-is-branch-level
status: active
scope: src/commands/intent.ts, src/cli.ts, src/core/schemas.ts, src/core/agentSkills.ts, src/templates/SKILL.md, src/templates/AGENTS.md, docs/specs/intent-memory-v1.md, README.md, docs/src/content/docs/reference/cli.md, docs/src/content/docs/start-here/quickstart.md
---

# Intent volume guardrail is branch-level and advisory

## Decision
Jumpspace warns when `intent validate --since <ref>` sees more than 3 new active intents on a branch. The warning is advisory and can be adjusted with `--max-new`; it is not a global cap on total repo intents and not a hard validation error.

## Why
The product guardrail is about feature-level over-capture, not mature repos accumulating useful memory over time. A branch/new-file check is the closest concrete proxy Jumpspace can enforce without inventing a heavyweight "feature" object. Making the warning non-blocking preserves rare cases where a feature genuinely needs more durable decisions while still forcing the agent to notice the smell before review gets noisy.

## Alternatives rejected
- **Global active-intent cap.** Punishes healthy long-lived repos and would make the product less useful as it succeeds.
- **Hard error above 3 new intents.** Enforces taste too aggressively and blocks legitimate migrations or import cleanups.
- **Docs-only self-check.** Keeps the CLI simple, but lets agents produce noisy intent ledgers without any tool feedback.

## When this intent will change
If Jumpspace later gains a first-class feature/proposal object, move the guardrail from branch-level new files to that explicit feature boundary. Keep the default north star at 0-3 unless dogfood shows a different threshold is consistently better.
