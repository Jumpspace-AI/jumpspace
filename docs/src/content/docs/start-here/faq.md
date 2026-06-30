---
title: FAQ And Objections
description: Practical answers to the concerns teams raise before adopting Jumpspace.
---

## Will This Cause Merge Conflicts?

It can, but the default intent files are small Markdown documents and usually
conflict less than large generated docs.

Mitigations:

- Keep intents small.
- Use one intent per durable decision.
- Keep task blocks small when using the advanced task graph.
- Let agents write through Jumpspace commands when possible.
- Use dry runs before applying bootstrap or repairs.
- Run `intent validate`, `intent verify`, and CI drift checks in pull requests.
- Prefer marker-managed updates over hand-editing large metadata blocks.

Roadmap ideas include richer relocation handling, branch-aware history, and
optional sidecar modes for teams that want fewer Markdown conflicts.

## What If My Teammates Do Not Use It?

They still get readable Markdown docs, source-backed decisions, and PR intent
checks when an agent or maintainer keeps the intent ledger updated.

Adoption can start with one developer, one repo, or one workflow. The intent
files remain plain text.

## Is This Just Git Commits?

No.

Git remembers what changed. Jumpspace remembers why a decision exists, which
paths it applies to, and which alternatives the team already rejected.

## Is This Just Vector Search?

No.

Semantic retrieval can help find context, but Jumpspace is source-backed intent
memory: durable decisions, scope matching, rejected alternatives, and PR-level
verification packets. Task lifecycle, plans, verification records, drift,
repair, graph relationships, and handoff remain available as the advanced task
graph layer.

## Is This Just An Issue Tracker?

No.

Issue trackers are good for coordination. Jumpspace lives in the repo and
focuses on implementation context that coding agents need while editing files.

## Does Ask Give Authoritative Answers?

No.

`jumpspace task ask` returns an evidence summary for repos using the advanced
task graph. It should show task IDs, paths, match reasons, coverage, unanswered
terms, and linked code/tests. Treat it as a map to inspect, not an oracle.

For default intent memory, prefer `jumpspace intent check --for <path>` before
editing scoped files.

## What Should Be Committed?

Commit intent files, source docs, task blocks you intentionally use, config,
schemas, templates, and CI files that the team should share. Commit the managed
`.gitignore` block from `init` when it is added.

Generated semantic indexes, dense-vector stores, runtime locks, and bootstrap
scratch files are ignored by default because they can be rebuilt.
