---
title: Future Improvements
description: Useful product ideas that are not documented as current commands.
---

This page records ideas that would improve first-run experience and agent
adoption. They are not current commands unless stated otherwise.

## Demo Command

Future shape:

```bash
npx jumpspace demo
```

Could generate a tiny sample repo/doc/task so users can see useful output
immediately.

## Guided Onboarding

Future shape:

```bash
npx jumpspace onboard
```

Could run discovery, suggest config, install skills, propose bootstrap, and
print next steps.

## Broader Skill Ecosystem

Current named skill installs cover Codex and Claude Code:

```bash
npx jumpspace add-skill jumpspace-work --agent claude
```

Future work could add dedicated native installers for Cursor, GitHub Copilot,
OpenCode, and other agent surfaces once their repo-local guidance conventions
are stable enough to update safely.

## MCP Or MCP-Lite Integration

A local MCP server could make Jumpspace feel native inside agent ecosystems
without requiring agents to shell out manually.

## Benchmark And Eval Page

Useful evals would measure whether agents find correct implementation context
faster, use fewer tokens, and make fewer stale assumptions when Jumpspace is
available.
