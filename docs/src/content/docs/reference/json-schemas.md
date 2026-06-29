---
title: JSON Schemas
description: Stable JSON contracts for agents and integrations.
---

Use schemas before scripting against command output.

> Jumpspace is alpha software. JSON schemas are published so agents and scripts
> can inspect the current contract, but schema names, fields, and command output
> shapes may change before a stable 1.0 release. Pin versions in CI and review
> changelogs before upgrading.

```bash
npx @jumpspace/cli schema list --json
npx @jumpspace/cli schema show work --json
npx @jumpspace/cli schema coverage --json
```

JSON failures use the standard envelope:

```json
{ "ok": false, "errors": [{ "code": "CODE", "message": "What happened" }] }
```

Generated schema artifacts are published under `schemas/`.

Useful contracts include:

- `find`
- `ask`
- `work`
- `plan.save`
- `step.complete`
- `verify`
- `changed`
- `drift`
- `ci`
- `pr.comment`
