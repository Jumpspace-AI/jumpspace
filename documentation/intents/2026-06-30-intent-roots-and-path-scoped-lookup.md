---
id: intent-roots-and-path-scoped-lookup
status: active
scope: src/core/config.ts, src/core/types.ts, src/core/intents.ts, src/types/micromatch.d.ts, src/commands/intent.ts, src/cli.ts, package.json, package-lock.json, docs/specs/intent-memory-v1.md
---

# Intent lookup is path-scoped and defaults to documentation/intents

## Decision
Intent files are discovered from configurable repo-local globs, defaulting only to `documentation/intents/*.md`. The CLI lookup surface is path-scoped from the start (`jumpspace intent check --for <paths...>`), even if v1 can implement matching by reading all intent files internally.

## Why
The Claude dogfood skill already uses `documentation/intents/*.md`, so v1 should make that the single taught convention instead of splitting product memory across two plausible roots. A path-scoped command shape also avoids teaching agents the unsafe habit of reading every intent forever. Read-all matching is acceptable for the current small ledger, but the interface must be able to swap to an index once repos cross roughly 30 active intents without changing agent instructions.

## Alternatives rejected
- **Default to both `documentation/intents/*.md` and `docs/intents/*.md`.** More permissive, but keeps a half-pivoted product shape and makes new repos wonder which root is canonical.
- **Store intents under `docs/specs/**/*.md`.** Keeps all repo memory in the existing Jumpspace scan glob, but mixes durable decision records with task blocks and risks turning intents back into tasks.
- **Expose only `intent list` and let agents filter.** Simple to implement, but repeats the read-everything pattern that made task ledgers feel bloated at scale.

## When this intent will change
If dogfood shows a different single default root clearly wins, change the default and migration docs together. If active intent counts or latency make read-all matching expensive, add an index behind the same path-scoped command shape instead of changing agent behavior.
