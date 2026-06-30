---
title: Adding Skills
description: Add or improve repo-local agent guidance without overwriting user content.
---

Skill installers must be additive and non-destructive.

Rules:

- create missing files
- append or update clearly marked Jumpspace-managed blocks
- never overwrite user-authored content outside markers
- document what files are touched
- make reruns idempotent
- add tests for managed-block behavior

Current supported installer flags:

```bash
npx @jumpspace/cli add-skill --codex
npx @jumpspace/cli add-skill --claude
npx @jumpspace/cli add-skill --all
npx @jumpspace/cli add-skill jumpspace-work --agent claude
npx @jumpspace/cli add-skill intent-review --agent codex
```

Named pipeline skills are current install targets. Add new skills by extending
the shared skill definition list, documenting the command surface, and adding
unit plus CLI integration tests for idempotent managed-block behavior.
