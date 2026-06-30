---
title: Adding Commands
description: Command implementation checklist for contributors.
---

When adding a command:

- follow the existing `src/commands/*` pattern
- put reusable behavior in `src/core/*`
- add JSON output when agents or CI will consume it
- return structured errors for JSON mode
- add CLI integration coverage where behavior crosses command boundaries
- update `docs/src/content/docs/reference/cli.md`
- update schemas and SDK contracts if JSON output is stable

After implementation:

```bash
npm test
npm run build
node dist/cli.js schema coverage --json
node dist/cli.js task audit --json
```
