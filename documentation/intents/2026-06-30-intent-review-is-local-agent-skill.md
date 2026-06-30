---
id: intent-review-is-local-agent-skill
status: active
scope: src/core/agentSkills.ts, src/core/agentSkills.test.ts, src/cli.ts, src/cli.test.ts, src/templates/SKILL.md, src/templates/AGENTS.md, docs/specs/intent-memory-v1.md, docs/src/content/docs/start-here/agent-setup.md, docs/src/content/docs/agent-skills/overview.md, docs/src/content/docs/agent-skills/codex.md, docs/src/content/docs/agent-skills/claude-code.md, docs/src/content/docs/contribute/adding-skills.md, docs/src/content/docs/reference/cli.md
---

# Intent-sensitive PR review routes to a local agent skill before cloud verification

## Decision
Jumpspace packages local intent review as a named agent skill (`jumpspace-intent-review`). CI or a PR comment may use deterministic intent matching to ask a human's local coding agent to inspect matched intents against branch diffs. The skill is read-only and produces local review text; it does not post to GitHub or call a hosted verifier by default.

## Why
This closes more of the "docs nobody reads" loop without requiring a Jumpspace API key, customer code upload, or LLM in CI. The local coding agent already has repo access and user-controlled model settings, so it is the lowest-friction privacy-first place to perform the semantic judgment. CI remains a tripwire that says "these intents may matter"; the local skill handles the careful review.

## Alternatives rejected
- **Hosted verifier first.** Gives the strongest demo, but adds cloud privacy, billing, caching, and provider operations before the basic loop is proven.
- **CI-only deterministic judgment.** Stays private, but can only flag scope overlap or explicit rules; it cannot reliably judge prose-vs-diff contradiction.
- **Fold this into the generic review skill only.** Avoids another skill name, but hides the most important intent-specific workflow behind broad branch-review guidance.

## When this intent will change
If dogfood shows local review is too manual or misses important violations, add a hosted or BYO-provider verifier as an optional upgrade. Keep the local skill as the privacy-first fallback even if cloud verification ships.
