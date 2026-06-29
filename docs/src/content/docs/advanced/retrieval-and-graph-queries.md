---
title: Retrieval And Graph Queries
description: Find, ask, semantic search, graph expansion, and deterministic queries.
---

Jumpspace has two retrieval modes: evidence retrieval and graph queries.

Use retrieval when you need likely relevant tasks. Use graph queries when you need exact structural constraints.

## Find

```bash
npx @jumpspace/cli find approval
npx @jumpspace/cli find approval review --mode any
npx @jumpspace/cli find approval --module project-management --json
```

`find` defaults to `--mode all` so scripts keep strict matching. Use `--mode any` when recall matters more than precision.

## Ask

```bash
npx @jumpspace/cli ask "How does approval work?"
npx @jumpspace/cli ask "How does approval work?" --json
```

`ask` returns an evidence summary, not an authoritative answer. It should include task IDs, paths, retrieval sources, match reasons, matched terms, unanswered terms, coverage, graph expansion paths, connected tasks, and linked code/tests.

## Semantic Retrieval

Build the local semantic index:

```bash
npx @jumpspace/cli semantic build
npx @jumpspace/cli semantic status --json
npx @jumpspace/cli semantic search approval flow --json
npx @jumpspace/cli semantic eval --json
```

The default backend is deterministic and local. Optional LanceDB and ONNX/Transformers support can be used when local dependencies and models are available.

The differentiating idea is task-vector retrieval plus graph expansion: match the task, then expand across dependencies, refs, modules, spaces, and supersession chains.

## Deterministic Graph Queries

```bash
npx @jumpspace/cli query --depends-on-transitive PM-ROADMAP-001 --no-tests --json
npx @jumpspace/cli query --where module=project-management --where tests=none
npx @jumpspace/cli query --ref implements:JS-008 --json
```

Use graph queries for questions like:

- Which tasks depend on an ADR and have no tests?
- Which tasks in this module have gaps?
- Which verified tasks reference a decision?
- Which tasks are ready but blocked by missing dependencies?

## Link Suggestions

```bash
npx @jumpspace/cli link suggest DOC-EXAMPLE-001 --json
npx @jumpspace/cli link suggest DOC-EXAMPLE-001 --since main --json
npx @jumpspace/cli link update DOC-EXAMPLE-001 --code src/foo.ts --test src/foo.test.ts --dry-run --json
```

Without `--since` or `--path`, `link suggest` uses current working-tree
candidates. Changed-file status is context, not enough evidence by itself. Link
suggestions should rank candidates by task-intent terms found in paths,
basenames, identifiers, phrases, and bounded file content.

## Compact Mode

Use compact JSON for cheap first-pass orientation:

```bash
npx @jumpspace/cli find approval --json --compact
npx @jumpspace/cli ask "approval flow" --json --compact
npx @jumpspace/cli related DOC-EXAMPLE-001 --json --compact
```
