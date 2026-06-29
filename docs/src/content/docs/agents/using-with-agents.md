---
title: Using With Agents
description: Let Codex, Claude Code, or another coding agent run the Jumpspace workflow from plain-English instructions.
---

Jumpspace is built so you can ask an agent for outcomes instead of memorizing the CLI.

The CLI gives the agent a reliable spine: discover the task, gather grounded context, inspect or save the plan, get the next unblocked step, make changes, record evidence, verify, and hand off.

## One-Time Setup

Install the repo-local guidance once:

```bash
npx @jumpspace/cli add-skill --codex
npx @jumpspace/cli add-skill --claude
```

After that, Jumpspace should be part of the agent's default repo workflow. You should not need to say "use Jumpspace" every time. The installed `AGENTS.md`, `CLAUDE.md`, or skill file tells the agent to start with Jumpspace for repo questions, feature work, branch review, bootstrap, and handoff.

You can still mention Jumpspace when you want to force the workflow, but normal requests should be outcome-focused.

## Good Agent Requests

For orientation:

```text
Explain how task approvals work in this repo. Give me evidence paths, task IDs, linked code/tests, and unanswered terms. Do not invent an answer.
```

For a new repo:

```text
Inspect this repo and propose the first task graph. Keep the graph small, cite source headings, and wait for approval before applying.
```

For implementation:

```text
Find the approved task, gather context, show me the plan, then execute the next unblocked step after I approve it.
```

For branch review:

```text
Review this branch for task-memory drift. Separate factual drift from recommendations.
```

For handoff:

```text
Summarize the task you just worked on, what is complete, what evidence was recorded, and what remains.
```

## What The Agent Should Do

The agent can translate your request into this loop:

```bash
npx @jumpspace/cli find "task approval" --json --compact
npx @jumpspace/cli context PM-TASK-001 --json
npx @jumpspace/cli plan show PM-TASK-001 --json
npx @jumpspace/cli next PM-TASK-001 --json
npx @jumpspace/cli work PM-TASK-001 --json
```

After coding:

```bash
npx @jumpspace/cli step complete PM-TASK-001 implementation --evidence "Implemented task approval states and tests."
npx @jumpspace/cli verify PM-TASK-001 --check "npm test" --criteria AC-1 --json
npx @jumpspace/cli scan
npx @jumpspace/cli audit --json
```

If the repo does not have Git available, `verify` may refuse to write a record because it cannot capture a commit SHA. That is good behavior. The agent should report the failed verification honestly instead of marking the task verified.

## Codex Pattern

Once `jumpspace add-skill --codex` has updated `AGENTS.md`, Codex should use Jumpspace without a special reminder. The managed block tells Codex to start with scan/find/context/related/audit, use `work` or `next` for approved implementation, record step evidence, and finish with scan/audit/handoff.

If Codex seems to skip the graph, ask it to check the installed `AGENTS.md` guidance and rerun the task from the Jumpspace packet.

Codex can still read files directly. Jumpspace is the starting map, not a blindfold.

## Claude Code Pattern

Once `jumpspace add-skill --claude` has updated `CLAUDE.md` and the Claude skill file, Claude Code should use Jumpspace before broad grep or file reads.

If Claude Code seems to skip the graph, ask it to check the installed Claude guidance. For bootstrap, the managed guidance should push it toward:

```text
Run bootstrap discover/context/propose/validate. Show me the dry run before applying task blocks.
```

## What Humans Still Approve

Agents can do most of the mechanical workflow, but humans should still approve:

- initial bootstrap proposals
- durable plans before large implementation
- ambiguous code/test links
- changes from `repair --apply`
- verification criteria that claim user-facing acceptance

The sweet spot is human judgment, agent execution.

## When To Fall Back

Ask the agent to fall back to normal repo reading when:

- `find` returns nothing relevant
- `ask` reports weak evidence
- linked files are missing
- the task has gaps
- audit reports broken references
- the question is about code that has not been documented yet

The best agent behavior is transparent: start from Jumpspace by default, report the evidence, then read the code when the graph is not enough.
