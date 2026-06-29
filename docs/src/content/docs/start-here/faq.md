---
title: FAQ And Objections
description: Practical answers to the concerns teams raise before adopting Jumpspace.
---

## Will This Cause Merge Conflicts?

It can. Markdown task blocks are source-controlled, so two people editing the
same doc section can conflict.

Mitigations:

- Keep task blocks small.
- Use one task per durable heading.
- Let agents write through Jumpspace commands when possible.
- Use dry runs before applying bootstrap or repairs.
- Run `doctor`, `audit`, and CI drift checks in pull requests.
- Prefer marker-managed updates over hand-editing large metadata blocks.

Roadmap ideas include richer relocation handling, branch-aware history, and
optional sidecar modes for teams that want fewer Markdown conflicts.

## What If My Teammates Do Not Use It?

They still get readable Markdown docs, PR drift reports, task links, and
source-backed context when an agent or maintainer keeps the graph updated.

Adoption can start with one developer, one repo, or one workflow. The task
blocks remain plain text.

## Is This Just Git Commits?

No.

Git remembers what changed. Jumpspace remembers why it matters, what code and
tests are linked to that intent, which acceptance criteria verify it, and what
the next agent should do.

## Is This Just Vector Search?

No.

Semantic retrieval can help find context, but Jumpspace is source-backed
implementation memory: task lifecycle, plans, verification records, drift,
repair, graph relationships, and handoff.

## Is This Just An Issue Tracker?

No.

Issue trackers are good for coordination. Jumpspace lives in the repo and
focuses on implementation context that coding agents need while editing files.

## Does Ask Give Authoritative Answers?

No.

`jumpspace ask` returns an evidence summary. It should show task IDs, paths,
match reasons, coverage, unanswered terms, and linked code/tests. Treat it as a
map to inspect, not an oracle.

## What Should Be Committed?

Commit source docs, task blocks, config, schemas, templates, and CI files that
the team should share.

Generated indexes such as semantic stores can be ignored unless your team
deliberately wants to version them.
