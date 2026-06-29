---
title: Bootstrap Existing Docs
description: Propose, validate, review, and apply task blocks from existing Markdown.
---

Bootstrap helps an agent or maintainer create the first source-backed graph
from docs that already exist.

## Discover

```bash
npx @jumpspace/cli bootstrap discover --json
```

Use the output to pick a focused set of docs.

## Export Context For An Agent

```bash
npx @jumpspace/cli bootstrap context README.md docs/**/*.md --json
```

This gives an agent heading lines, parent headings, excerpts, existing IDs, and
linked-file hints. It does not mutate files.

## Propose

```bash
npx @jumpspace/cli bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json
```

The proposal is a draft, not an approval.

## Validate

```bash
npx @jumpspace/cli bootstrap validate --file jumpspace-bootstrap.json
```

Validation rejects duplicate IDs, missing source evidence, unresolved
dependencies, and ambiguous heading references.

## Dry Run And Apply

```bash
npx @jumpspace/cli bootstrap apply --file jumpspace-bootstrap.json --dry-run
npx @jumpspace/cli bootstrap apply --file jumpspace-bootstrap.json
npx @jumpspace/cli scan
npx @jumpspace/cli doctor
```

Keep the first bootstrap small enough to review. A useful graph is better than a
large untrusted one.
