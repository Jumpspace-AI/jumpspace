---
id: intent-verifier-produces-pr-level-artifacts
status: active
scope: src/core/intents.ts, src/commands/intent.ts, src/core/schemas.ts, src/sdk/contracts.ts, sdk/python/jumpspace_sdk/contracts.py, docs/specs/intent-memory-v1.md
---

# Intent verification produces PR-level artifacts, not per-intent lifecycle state

## Decision
`jumpspace intent verify` may report which intents were checked against changed files and whether each result is `consistent`, `possible_violation`, `unknown`, or `not_applicable`. Those results are command output, CI artifacts, or PR comments. They must not mutate intent files and must not add acceptance criteria, plan steps, or verification records to individual intents.

## Why
The verifier is the headline loop for making intent memory useful in review, but storing verifier state on each intent would recreate the task-shaped product that this pivot is trying to escape. Intent files should remain durable decisions: what was decided, why, and what alternatives were rejected. Evidence that a particular PR was checked belongs to the PR run, where it can be regenerated or discarded.

## Alternatives rejected
- **Add `verification_records` to intent frontmatter.** Familiar from task blocks, but it turns intents into lifecycle-managed tasks and creates merge churn on every PR check.
- **Require per-intent acceptance criteria.** Makes verification appear objective, but most intents are constraints or rationale rather than testable product outcomes.
- **Skip verifier output entirely in v1.** Keeps files clean, but loses the main product loop that makes intent memory visible during code review.

## When this intent will change
If teams need durable audit evidence for compliance, add a separate append-only run log or CI artifact export. Do not attach run history to individual intent files without revisiting the product boundary.
