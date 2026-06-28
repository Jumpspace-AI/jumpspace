---
title: Why Jumpspace?
description: Understand the problem Jumpspace solves before adding it to a repo.
---

Modern coding agents are good at reading files, but they still need a reliable map of the work.

Most repos already have pieces of that map spread across specs, runbooks, architecture notes, issue threads, PRs, and code comments. Jumpspace turns the durable parts into a small source-controlled graph that an agent can read before it starts guessing.

Agents can have memory, but that memory usually belongs to one product, one account, one machine, or one conversation. It is not portable repo state. When another agent picks up the work, the feature intent often has to be rediscovered from scratch unless the repo itself carries it.

## The Problem

Without a repo-local memory layer, agents usually begin with broad search:

- grep for words that may or may not match the current feature name
- inspect files that look relevant from paths alone
- infer intent from code after the original design context has drifted away
- lose feature intent when work moves between tools, agents, machines, or sessions
- repeat the same orientation work in every session
- produce answers that sound confident even when evidence is thin

That works for tiny repos. It gets brittle when the important question is not "where is this word?" but "what behavior was approved, what code owns it, what tests protect it, and what changed since the last time someone checked?"

## The Jumpspace Idea

Jumpspace keeps the source of truth in Markdown, next to the docs humans already review.

A task block can link:

- the intent behind a feature or decision
- code files that implement it
- tests that protect it
- dependencies and related tasks
- acceptance criteria
- a durable plan
- verification records
- known gaps

The generated `.jumpspace/index.json` is just a fast local index. The durable graph lives in source-controlled docs.

## Why Not Just Grep?

Grep is still useful. Jumpspace does not replace it.

The difference is that Jumpspace gives agents structure before they read broadly:

- stable task IDs instead of heading-title guesses
- linked code and tests instead of path-name hunches
- dependency and reference edges instead of isolated text matches
- verification records instead of "I ran some checks earlier"
- drift and doctor output instead of stale docs going unnoticed

A good agent should start with Jumpspace, report what the graph says, then fall back to normal repo reading when the graph is missing, weak, or stale.

## Why Not Just Vector Search?

Semantic search helps when words do not match. Jumpspace can use optional local semantic retrieval, but the moat is the graph.

The useful answer is rarely a flat ranked list of documents. It is usually a connected packet:

- this task describes the behavior
- these files implement it
- these tests cover it
- this task depends on that decision
- this acceptance criterion was verified by these checks
- this changed file may have drifted from its task memory

Vectors can improve recall. The task graph makes the result actionable.

## Why Agents Like It

Jumpspace gives agents a repeatable loop:

```bash
jumpspace scan
jumpspace find "approval workflow" --json --compact
jumpspace context PM-TASK-001 --json
jumpspace work PM-TASK-001 --json
```

That loop lets the agent begin with approved intent, linked files, next steps, schemas, and guardrails before editing. After the change, the agent can record evidence and hand work back:

```bash
jumpspace step complete PM-TASK-001 implementation --evidence "Implemented approval state transitions and tests."
jumpspace verify PM-TASK-001 --check "npm test" --criteria AC-1 --json
jumpspace handoff --task PM-TASK-001 --json
```

## Why Humans Like It

Jumpspace keeps humans in the judgment loop without making them do every mechanical step.

Humans approve the docs, task graph, plans, ambiguous links, and verification criteria. Agents handle scan, context gathering, link suggestions, execution packets, checks, evidence records, drift reports, and handoffs.

That is the sweet spot: source-controlled intent, agent-readable structure, and honest fallback when the graph is not enough.

## When It Is Worth It

Jumpspace is most useful when:

- your repo has docs that should guide code changes
- agents often need to explain or modify existing behavior
- features span specs, source files, tests, and runbooks
- you want CI to catch doc/code drift
- you want handoffs to include evidence instead of vibes

It may be overkill for a one-file script or a throwaway prototype. For a repo that multiple humans or agents will keep revisiting, the graph starts paying rent quickly.
