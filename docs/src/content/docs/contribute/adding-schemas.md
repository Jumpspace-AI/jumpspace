---
title: Adding Schemas
description: Keep command JSON, generated schema artifacts, and SDKs in sync.
---

Stable JSON commands should have schema coverage.

Checklist:

- add the schema definition in the schema catalog source
- regenerate schema artifacts
- update TypeScript SDK schema names and types
- update Python SDK schema names and models
- add or update tests

Run:

```bash
npm run generate:schemas
npm test
node dist/cli.js schema coverage --json
```

Agents should use `schema list` and `schema show` instead of guessing output
shapes.
