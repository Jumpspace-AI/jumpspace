---
title: Ask Questions With Evidence
description: Use ask, find, semantic retrieval, and context without treating retrieval as an oracle.
---

`jumpspace ask` returns an evidence summary, not an authoritative answer.

## Basic Flow

```bash
npx jumpspace scan
npx jumpspace ask "Where is project invitation implemented?"
```

The useful output is the evidence:

- task IDs
- source doc paths
- match reasons
- matched and unanswered terms
- coverage
- linked code and tests
- semantic retrieval status, if enabled

## Broader Recall

```bash
npx jumpspace find project invitation --mode any
```

`find` defaults to strict all-term matching. Use `--mode any` when orientation
matters more than precision.

## Semantic Retrieval

```bash
npx jumpspace semantic build
npx jumpspace semantic status --json
npx jumpspace ask "Where does the repo handle member onboarding?" --json
```

The default semantic backend is local and deterministic. Dense LanceDB/ONNX
retrieval is optional and falls back when dependencies are missing.

## Inspect The Source Task

```bash
npx jumpspace context DOC-PROJECT-001 --json
```

Use `context` when you need raw task metadata, plan state, links, and execution
readiness.

## Trust Rule

If `ask` has weak coverage or unanswered terms, inspect the cited files or fall
back to code search. Jumpspace should reduce guessing, not hide uncertainty.
