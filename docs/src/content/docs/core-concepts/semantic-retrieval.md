---
title: Semantic Retrieval
description: How local semantic search helps Jumpspace without replacing the task graph.
---

Semantic retrieval helps with conceptual queries that do not share exact terms
with the task text.

```bash
npx @jumpspace/cli semantic build
npx @jumpspace/cli semantic status --json
npx @jumpspace/cli semantic search "member onboarding" --json
```

The default backend is deterministic and local. Dense LanceDB/ONNX retrieval is
optional:

```bash
npx @jumpspace/cli semantic build --backend lancedb+onnx --model <local-model>
```

If optional dependencies are unavailable, Jumpspace records a degraded fallback
reason and uses the local task-vector index.

Semantic retrieval is useful, but it is not the product. The value is vector
matching plus graph expansion, linked code/tests, lifecycle, verification, and
drift.
