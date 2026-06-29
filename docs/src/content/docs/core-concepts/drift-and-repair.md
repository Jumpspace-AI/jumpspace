---
title: Drift And Repair
description: Detect linked-file drift and apply safe mechanical repairs.
---

Drift is the gap between task memory and the current repo state.

```bash
npx jumpspace drift --since main
```

Facts and warnings are separate. Facts include changed linked files, missing
links, and unmapped changed files. Warnings are recommendations.

## Repair

```bash
npx jumpspace repair --since main
npx jumpspace repair --since main --apply
```

Preview first. Repairs are intended for safe mechanical path changes, such as
Git renames. Deleted files should usually become explicit gaps for review.
