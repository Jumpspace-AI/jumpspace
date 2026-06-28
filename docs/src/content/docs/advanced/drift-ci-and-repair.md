---
title: Drift, CI, And Repair
description: Detect task-memory drift, separate facts from warnings, and repair safe path changes.
---

Jumpspace can compare task memory against Git changes so stale implementation links are caught while the work is fresh.

## Changed Files

```bash
npx jumpspace changed --since main
npx jumpspace changed --since main --json
```

`changed` includes:

- committed changes since the ref
- staged changes
- unstaged changes
- untracked files
- renamed files with old and new paths
- deleted files with the deleted path

Duplicate paths are merged with all sources, such as `committed`, `staged`, `unstaged`, or `untracked`.

## Drift

```bash
npx jumpspace drift --since main --json
```

Drift separates facts from warnings.

Facts include:

- stale generated index
- linked code or tests changed
- linked docs changed
- missing linked files
- unmapped changed files

Warnings include recommendations such as "docs may need updating" or "tests may need updating."

## Local CI Packet

```bash
npx jumpspace ci --since main --json
```

The CI packet combines drift, repair suggestions, graph state, and link suggestions for local or PR automation.

## PR Comment

```bash
npx jumpspace pr comment --since main
npx jumpspace pr comment --since main --json
```

The PR assistant is review-only. It should explain factual drift, suggested links, and warnings without mutating source.

## Repair

Preview safe repairs:

```bash
npx jumpspace repair --since main --json
```

Apply safe repairs:

```bash
npx jumpspace repair --since main --apply
```

Repair is intended for mechanical path drift, such as Git renames. Deleted files should become gaps unless there is a confident replacement.

## Evaluate Link Ranking

```bash
npx jumpspace link eval --json
npx jumpspace link eval --file fixtures/link-eval.json --json
```

Use fixtures when a real repo exposes weak ranking. A good fixture proves that the same candidate pool can rank differently for different headings, or reject candidates when evidence is missing.
