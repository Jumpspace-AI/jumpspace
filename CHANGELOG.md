# Changelog

All notable changes to Jumpspace will be documented in this file.

Jumpspace follows semantic versioning. `0.x` releases are experimental and may
change command behavior, JSON contracts, and agent guidance as launch feedback
comes in.

## 0.2.0 - 2026-06-30

### Headline

Jumpspace pivots to repo-local intent memory as the default product surface.
Task graph workflows remain available as advanced opt-in commands.

### Added

- `intent` command family: `list`, `check`, `validate`, and `verify`.
- Durable intent Markdown format with scoped path matching through micromatch.
- Intent validation guardrails for missing decisions, missing rejected
  alternatives, duplicate IDs, supersession links, and branch-level intent
  volume.
- PR-level intent verification packets that do not mutate intent files.
- Agent guidance for intent review in Codex and Claude Code.

### Changed

- Task graph commands now live under the `task` namespace. For example,
  `jumpspace work <id>` becomes `jumpspace task work <id>`.
- Task graph JSON schema names now live under the `task.*` namespace. For
  example, `work` becomes `task.work`, and `bootstrap.propose` becomes
  `task.bootstrap.propose`.
- README, docs, templates, and generated agent guidance now lead with intent
  memory instead of task-block bootstrap.
- Release doctor checks exact package versions, so an existing package name no
  longer looks like a publish blocker for a new version.

### Removed

- Local browser UI from the task-graph era.
- Top-level task graph command aliases.

### Migration

- Replace top-level task commands with `jumpspace task ...`.
- Replace task schema names and artifact paths with `task.*` names.
- Keep using `intent` commands for durable decision memory and use `task`
  commands only for teams that intentionally opt into source-backed workflow
  state.

## 0.1.1 - 2026-06-29

### Changed

- Tightened CLI feedback defaults and ergonomics from launch feedback.
- Updated docs examples to use the scoped `@jumpspace/cli` npm package.

## 0.1.0 - 2026-06-29

### Added

- Repo-local task graph stored in Markdown task blocks.
- Agent-oriented commands for scan, search, context, related tasks, plans,
  execution packets, verification, drift, repair, handoff, and release
  diagnostics.
- Stable JSON schema catalog and TypeScript/Python SDK contract surfaces.
- Agent skill installation for Codex and Claude Code.
- AI-assisted bootstrap workflow for existing repositories.
- Astro Starlight documentation module with Netlify-ready static output.
- Jumpspace PR assistant GitHub Actions workflow installer.
