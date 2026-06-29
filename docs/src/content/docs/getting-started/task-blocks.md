---
title: Task Blocks
description: The Markdown metadata format that makes Jumpspace source-backed.
---

A task block is an HTML comment placed under the Markdown heading that describes a unit of behavior.

```md
## Project task approval flow

<!-- jumpspace
id: PM-TASK-001
type: spec
status: approved
module: project-management
space: module
keywords:
  - approval
  - review
code:
  - apps/web/components/TaskReviewPanel.tsx
tests:
  - tests/task-review-flow.spec.ts
depends_on:
  - PM-TASK-000
sources:
  - type: project-tracker
    id: PM-123
    url: https://pm.example.com/projects/roadmap/tasks/PM-123
acceptance_criteria:
  - id: AC-1
    description: Users can approve a project task before it moves to Done.
-->

Users can approve project tasks after reviewing owner, due date, and scope notes.
```

These docs are outside this repo's Jumpspace scan glob, so the examples above are documentation examples and not live tasks.

## Required Fields

Every task should have:

- `id`: stable, human-readable ID.
- `type`: usually `spec`, `engineering`, `bug`, `decision`, or `runbook`.
- `status`: current lifecycle state.
- `code`: implementation files that satisfy the behavior.
- `tests`: tests that protect it.

## Useful Optional Fields

- `module`: product or code area.
- `space`: repo, module, app, package, or team boundary.
- `keywords`: extra retrieval terms.
- `depends_on`: task IDs that must be complete first.
- `refs`: typed relationships to other tasks.
- `sources`: project tracker, GitHub, ADR, or other external references.
- `gaps`: known missing code, tests, docs, or decisions.
- `acceptance_criteria`: named criteria that `jumpspace verify` can cover.
- `verification_records`: earned verification evidence written by `jumpspace verify`.
- `plan`: durable ordered execution steps.

## Status Values

Use plain statuses that match your team language, such as:

- `proposed`
- `approved`
- `in_progress`
- `implemented`
- `blocked`
- `verified`

`verified` is protected. Use `jumpspace verify` to earn it instead of setting it directly with `jumpspace status`.

## Good Task Granularity

Make a task when there is a discrete behavior, decision, runbook, or implementation obligation. Avoid creating tasks only because a file is long.

Good task blocks usually answer:

- What behavior should exist?
- Where is it implemented?
- What tests prove it?
- What depends on it?
- What evidence shows it has been verified?

## Editing Safely

Run these after editing task blocks:

```bash
npx @jumpspace/cli scan
npx @jumpspace/cli audit --json
```

`scan` refreshes the index. `audit` catches broken task references, missing linked files, invalid plans, and stale semantic indexes.
