---
title: JSON Contracts
description: Stable command schemas and SDK surfaces for agents and integrations.
---

Agents should not reverse-engineer command output by trial and error. Jumpspace publishes schemas for agent-facing JSON output.

## Standard Error Envelope

JSON failures use this shape:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "UNKNOWN_TASK",
      "message": "Task DOC-404 was not found.",
      "taskId": "DOC-404"
    }
  ]
}
```

Human-readable commands still print useful messages, but scripts should use `--json` and schema contracts.

## Discover Schemas

```bash
npx jumpspace schema list --json
npx jumpspace schema show work --json
npx jumpspace schema show plan.save --json
npx jumpspace schema show verify --json
npx jumpspace schema coverage --json
```

`schema coverage` checks declared JSON commands, the schema catalog, generated schema artifacts, and SDK schema names for drift.

## Generated Artifacts

The npm package includes:

- `schemas/catalog.json`
- `schemas/<name>.schema.json`

Use those when you need static contracts without shelling out to the CLI.

## TypeScript SDK

```ts
import { assertOk, getSdkSchema, isJumpspaceErrorEnvelope } from '@jumpspace/cli/sdk';

const workSchema = getSdkSchema('work');
```

The TypeScript SDK exposes schema names, contract version, command result aliases, and error helpers.

## Python SDK

```py
from jumpspace_sdk import SCHEMA_NAMES, assert_ok, is_error_envelope
```

The Python SDK is a small stdlib dataclass package under `sdk/python`. It mirrors the published schema names.

## When To Use JSON

Use `--json` for:

- agent orchestration
- CI checks
- PR comments
- scripts that parse task, plan, drift, or verification state
- schema-aware integrations

Use human output when a developer is reading the result directly.
