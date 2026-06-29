---
title: Review PR Drift
description: Compare a branch against a Git ref and separate facts from recommendations.
---

Use this workflow before opening or reviewing a PR.

## Changed Files

```bash
npx jumpspace changed --since main
```

`changed` includes committed changes since the ref, staged changes, unstaged
changes, untracked files, renames, and deletes.

## Drift

```bash
npx jumpspace drift --since main
```

Drift output separates factual drift from heuristic warnings.

Facts include things like:

- linked code changed
- linked tests changed
- linked docs changed
- linked files are missing
- changed files are unmapped

Warnings include recommendations such as docs or tests possibly needing updates.

## Local CI Packet

```bash
npx jumpspace ci --since main --json
```

The CI packet refreshes the index and combines audit, doctor, drift, repair
opportunities, graph queries, and task-block suggestions.

## PR Assistant Comment

```bash
npx jumpspace pr comment --since main
```

This renders a review-only comment. It does not post to GitHub. A human or
wrapper should review and post it.

## Safe Repairs

```bash
npx jumpspace repair --since main
npx jumpspace repair --since main --apply
```

Preview first. Apply only mechanical path repairs and explicit gaps that you
accept.
