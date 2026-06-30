---
title: Why Jumpspace?
description: Understand the problem Jumpspace solves before adding it to a repo.
---

Modern coding agents are good at reading files, but they still lose the durable
intent behind decisions.

Most repos already have pieces of that intent spread across specs, runbooks,
architecture notes, issue threads, PRs, and code comments. Jumpspace turns the
durable parts into repo-local intent memory an agent can check before it starts
guessing.

Agents can have memory, but that memory usually belongs to one product, one
account, one machine, or one conversation. It is not portable repo state. When
another agent picks up the work, decisions and rejected alternatives often have
to be rediscovered unless the repo itself carries them.

## The Problem

Without a repo-local memory layer, agents usually begin with broad search:

- grep for words that may or may not match the current feature name
- inspect files that look relevant from paths alone
- infer intent from code after the original design context has drifted away
- lose feature intent when work moves between tools, agents, machines, or sessions
- repeat the same orientation work in every session
- produce answers that sound confident even when evidence is thin

That works for tiny repos. It gets brittle when the important question is not
"where is this word?" but "which decision applies to this path, why did we make
it, and what alternatives should I avoid re-proposing?"

## The Jumpspace Idea

Jumpspace keeps the source of truth in Markdown, next to the docs humans already
review.

An intent records:

- the decision
- why it exists
- rejected alternatives
- the paths where it should be checked

The generated `.jumpspace/index.json` is just a fast local index for task graph
workflows. Durable intent memory lives in source-controlled docs.

Git remembers what changed. Jumpspace remembers the constraints future agents
should honor.

## Where Other Tools Fit

Jumpspace is not trying to replace the rest of the development stack.

Git is still the source of file history. Issue trackers are still useful for
coordination and discussion. TODO comments are still useful local reminders.
Docs are still where humans explain intent. Semantic retrieval is still useful
when vocabulary does not line up.

Jumpspace connects those durable pieces into intent memory that lives in the
repo. The point is not another place to remember facts. The point is a
source-backed decision packet an agent can use before editing.

## Why Not Just Grep?

Grep is still useful. Jumpspace does not replace it.

The difference is that Jumpspace gives agents binding decision context before
they read broadly:

- scoped intent matches instead of repo-wide context dumps
- decisions and rationale instead of path-name hunches
- rejected alternatives instead of repeated design churn
- validation warnings instead of noisy unchecked memory
- PR-level verification packets instead of hidden agent context

A good agent should start with Jumpspace, report what the graph says, then fall
back to normal repo reading when the graph is missing, weak, or stale.

## Why Not Just Vector Search?

Semantic search helps when words do not match. It can find similar text, but it
does not know which decisions are binding.

The useful answer is rarely a flat ranked list of documents. It is usually a
scoped packet:

- this active intent applies to the path
- this is the decision and why it exists
- these alternatives were rejected
- this branch added too many durable intents and needs review
- this PR may need a local agent or human to check consistency

Vectors can improve recall. Intent memory makes the result actionable.

## Why Agents Like It

Jumpspace gives agents a repeatable loop:

```bash
jumpspace intent check --for src/app/page.tsx --json
jumpspace intent validate --since origin/main --json
jumpspace intent verify --since origin/main --json
```

That loop lets the agent begin with scoped decisions, rationale, rejected
alternatives, and honest unknowns before editing.

If a repo intentionally uses the advanced task graph, agents can still run
`jumpspace task work`, `jumpspace task verify`, and `jumpspace task handoff`.

## Why Humans Like It

Jumpspace keeps humans in the judgment loop without making them do every
mechanical step.

Humans approve durable decisions and rejected alternatives. Agents handle scoped
lookup, validation, PR-level verification packets, and optional task graph
maintenance.

That is the sweet spot: source-controlled intent, agent-readable structure, and
honest fallback when the memory is not enough.

## When It Is Worth It

Jumpspace is most useful when:

- your repo has docs that should guide code changes
- agents often need to explain or modify existing behavior
- decisions and rejected alternatives keep getting rediscovered
- you want PRs to surface possible intent drift
- you want handoffs to include source-backed constraints instead of vibes

It may be overkill for a one-file script or a throwaway prototype. For a repo
that multiple humans or agents will keep revisiting, repo-local intent memory
starts paying rent quickly.
