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
npx jumpspace add-skill --codex
npx jumpspace add-skill --claude
npx jumpspace add-skill --all
npx jumpspace add-skill jumpspace-work --agent claude
```

Named pipeline skills are current install targets. Add new skills by extending
the shared skill definition list, documenting the command surface, and adding
unit plus CLI integration tests for idempotent managed-block behavior.
