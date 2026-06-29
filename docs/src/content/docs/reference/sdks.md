---
title: SDKs
description: TypeScript and Python contract helpers for tool builders.
---

> Jumpspace is alpha software. SDK helpers track the current JSON contracts, but
> exported types, schema names, and command result models may change before a
> stable 1.0 release. Pin package versions and review changelogs before
> upgrading.

For TypeScript:

```ts
import { assertOk, getSdkSchema, isJumpspaceErrorEnvelope } from "@jumpspace/cli/sdk";
```

For Python:

```py
from jumpspace_sdk import SCHEMA_NAMES, assert_ok, is_error_envelope
```

SDKs expose schema names, contract version, command result models, and error
helpers. They are tested against `jumpspace schema list --json` so contract
drift is visible.
