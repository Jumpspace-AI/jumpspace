---
title: Task Blocks
description: The Markdown metadata block that makes Jumpspace source-backed.
---

A task block is a YAML-like `jumpspace` HTML comment under the Markdown heading
that owns the implementation intent.

```md
## Project invite flow

<!-- jumpspace
id: DOC-PROJECT-001
type: spec
status: approved
module: project-management
space: repo
code:
  - src/project/invitations.ts
tests:
  - tests/project-invitations.test.ts
acceptance_criteria:
  - id: AC-1
    description: A project admin can invite a teammate by email.
-->
```

## Required Fields

- `id`: stable task ID
- `type`: `spec`, `engineering`, `hotfix`, or `adr`
- `status`: lifecycle state

## Common Fields

- `module`
- `space`
- `keywords`
- `code`
- `tests`
- `depends_on`
- `refs`
- `acceptance_criteria`
- `plan`
- `verification_records`
- `gaps`

Run `jumpspace scan` after editing task blocks.
