# Jumpspace

Implementation memory for AI coding agents.

Coding agents lose the thread between sessions, branches, and teammates.
Jumpspace lets your repo docs remember which code, tests, decisions, plans, and
verification records implement product intent.

> Jumpspace is alpha software. CLI commands, JSON schemas, task metadata fields,
> and generated agent guidance may change before a stable 1.0 release. Pin
> versions in CI and review changelogs before upgrading.

## Why Jumpspace?

Coding agents are getting better at changing code, but they still lose product
intent. Git remembers what changed, but not what human goal the change
satisfied. Issue trackers know planned work, but not always where that work
lives in code. Docs explain intent, but drift from implementation. Vector search
can find similar text, but it does not provide task lifecycle, acceptance
criteria, verification, or drift detection.

Jumpspace is repo-local implementation memory. It gives coding agents and
teammates a source-backed map between:

- product intent
- Markdown docs
- code links
- tests
- acceptance criteria
- durable plans
- verification records
- drift warnings
- handoff state

Git remembers what changed. Jumpspace remembers why it mattered, where it
lives, what verifies it, and what the next agent should do.

## 30-Second Demo

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli scan
npx @jumpspace/cli ask "What does this repo know?"
```

For an existing repo with Markdown docs but no Jumpspace task blocks yet:

```bash
npx @jumpspace/cli bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json
npx @jumpspace/cli bootstrap validate --file jumpspace-bootstrap.json
npx @jumpspace/cli bootstrap apply --file jumpspace-bootstrap.json --dry-run
```

Review the proposal, apply it, then ask an evidence question:

```bash
npx @jumpspace/cli bootstrap apply --file jumpspace-bootstrap.json
npx @jumpspace/cli scan
npx @jumpspace/cli ask "Where is this behavior implemented?"
```

## What It Does

- Turns Markdown docs into source-backed task memory.
- Links product intent to code and tests.
- Gives agents safe work packets through `jumpspace work <id>`.
- Preserves plans, acceptance criteria, and verification records.
- Detects drift when code changes without matching docs.
- Keeps memory local, reviewable, and source-controlled in the repo.

## Minimal Task Block

Add a `jumpspace` block under the Markdown heading that owns the intent:

```md
## Project invite flow

<!-- jumpspace
id: DOC-PROJECT-001
type: spec
status: approved
module: project-management
space: repo
keywords:
  - invite
  - members
code:
  - src/project/invitations.ts
tests:
  - tests/project-invitations.test.ts
acceptance_criteria:
  - id: AC-1
    description: A project admin can invite a teammate by email.
-->

Project admins can invite teammates by email and see whether each invite is
pending, accepted, or expired.
```

Then index and inspect it:

```bash
npx @jumpspace/cli scan
npx @jumpspace/cli context DOC-PROJECT-001
```

## Quick Paths

- [Quickstart](https://docs.jumpspace.ai/start-here/quickstart/)
- [Existing repo bootstrap](https://docs.jumpspace.ai/start-here/existing-repo-bootstrap/)
- [Agent setup](https://docs.jumpspace.ai/start-here/agent-setup/)
- [Ask questions with evidence](https://docs.jumpspace.ai/workflows/ask-questions-with-evidence/)
- [Start agent work](https://docs.jumpspace.ai/workflows/start-agent-work/)
- [Verify work](https://docs.jumpspace.ai/workflows/verify-work/)
- [Review PR drift](https://docs.jumpspace.ai/workflows/review-pr-drift/)
- [CLI reference](https://docs.jumpspace.ai/reference/cli/)

## Install

```bash
npm install -D @jumpspace/cli
```

The npm package is `@jumpspace/cli`; the installed command remains
`jumpspace`. Jumpspace writes source-controlled Markdown metadata and a
generated `.jumpspace/index.json` index inside your repo.

## Current Command Surface

The main commands are:

- `init`, `add-skill`, `scan`, `doctor`
- `bootstrap discover|context|propose|validate|apply`
- `find`, `ask`, `semantic`, `query`, `related`
- `plan`, `ready`, `work`, `execute`, `next`, `step`, `status`, `verify`
- `changed`, `drift`, `ci`, `pr comment`, `repair`
- `schema`, `last`, `history`, `handoff`, `release doctor`

Use `npx @jumpspace/cli --help` for exact options and the
[CLI reference](https://docs.jumpspace.ai/reference/cli/) for examples.

## Docs

The documentation site lives in `docs/` and is published at
[docs.jumpspace.ai](https://docs.jumpspace.ai/).

Run it locally:

```bash
npm --prefix docs install
npm --prefix docs run dev
```

## Status

Jumpspace v0 is for one repo, local Markdown docs, and small teams. It is not a
hosted knowledge graph, Jira replacement, or Confluence replacement.

The strongest path today is agent-assisted adoption: install the skills, let an
agent use Jumpspace to orient itself, and keep task blocks small enough for code
review.

## License and Trademarks

Jumpspace Core is licensed under the Apache License, Version 2.0. See `LICENSE`
and `NOTICE`.

The Jumpspace name, logo, and related brand assets are trademarks controlled by
Jumpspace AI. The Apache-2.0 license does not grant permission to use those
marks except as required for reasonable and customary use in describing the
origin of the software. See `TRADEMARKS.md`.
