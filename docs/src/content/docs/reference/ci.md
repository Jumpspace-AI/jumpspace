---
title: CI
description: Local CI and PR review commands for drift and task-memory health.
---

Install the GitHub workflow:

```bash
npx @jumpspace/cli init --ci github --dry-run --json
npx @jumpspace/cli init --ci github
```

Run locally:

```bash
npx @jumpspace/cli ci --since main --json
npx @jumpspace/cli pr comment --since main
```

The PR comment command renders text. It does not post to GitHub by itself.

The CI packet includes audit, doctor, drift, repair opportunities, graph
queries, and task-block suggestions.
