---
title: Quickstart
description: Three copy-paste paths for new repos, existing docs, and agent setup.
---

This page gives you the shortest useful path. Use the
[CLI reference](/reference/cli/) for detailed options.

> Jumpspace is alpha software. Commands and metadata fields may change before a
> stable 1.0 release. Pin versions in CI and review changelogs before upgrading.

## Path 1: New Repo Or Clean Setup

```bash
npm install -D @jumpspace/cli
npx @jumpspace/cli init --auto
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli intent list
npx @jumpspace/cli intent validate --json
```

Add a small intent for a decision code cannot explain:

```md
---
id: no-pre-launch-feature-flags
status: active
scope: src/**/*.ts, src/**/*.tsx
---

# Do not gate new code paths behind runtime feature flags

## Decision
While the app is pre-launch, new features ship without runtime feature-flag
gates.

## Why
Feature flags add a second state dimension that the team does not need before
external launch.

## Alternatives rejected
- **Environment-variable gates.** They still create cleanup debt.
```

Save it under `documentation/intents/`, then inspect it:

```bash
npx @jumpspace/cli intent list
npx @jumpspace/cli intent check --for src/app/page.tsx
npx @jumpspace/cli intent validate --json
```

## Path 2: Existing Repo Intent Memory

Use this when the repo already has docs but no durable intent memory yet. Start
with one decision that code cannot explain.

```bash
npx @jumpspace/cli init --auto
npx @jumpspace/cli intent list --json
npx @jumpspace/cli intent check --for src/app/page.tsx --json
npx @jumpspace/cli intent validate --json
```

When a branch adds intent files, compare against a base ref so the 0-3
new-intent guardrail can warn before review gets noisy:

```bash
npx @jumpspace/cli intent validate --since origin/main --json
npx @jumpspace/cli intent verify --since origin/main --json
```

Use `bootstrap propose`, `bootstrap validate`, and `bootstrap apply` only when
you want the advanced task graph/workflow layer from existing Markdown docs.

## Path 3: Agent Setup

```bash
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli intent check --for src/app/page.tsx
npx @jumpspace/cli intent validate --json
```

Then ask your agent:

```text
Read the repo's Jumpspace guidance, then use Jumpspace to understand the
intent memory before changing code.
```

`intent check` returns scoped decisions, not a hidden agent memory dump. Treat
matches as binding context to read before editing, and propose new intents only
for decisions code cannot explain.

## Health Check

Run this whenever setup feels uncertain:

```bash
npx @jumpspace/cli intent validate --json
npx @jumpspace/cli release install-doctor --json
```

If the repo intentionally uses task blocks, also run:

```bash
npx @jumpspace/cli task doctor --json
npx @jumpspace/cli task audit --json
```
