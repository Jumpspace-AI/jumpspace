---
title: Skill Authoring
description: How to think about Jumpspace reference and pipeline skills.
---

Today Jumpspace installs a reference workflow skill and named pipeline skills
for supported agents.

Current named skills package narrower workflows:

| Skill | Use when |
| --- | --- |
| `jumpspace-bootstrap` | Converting existing docs into task memory. |
| `jumpspace-work` | Starting implementation from a ready task. |
| `jumpspace-review` | Reviewing drift and preparing PR output. |
| `jumpspace-handoff` | Switching agents or preserving session state. |

Install one named skill for one supported agent:

```bash
npx jumpspace add-skill jumpspace-work --agent claude
npx jumpspace add-skill bootstrap --agent codex
```

Named installs always include the reference `jumpspace-workflow` skill too.

## Authoring Principles

Good Jumpspace skills should:

- start from source-backed evidence
- ask for human approval before mutation
- avoid treating retrieval as an answer
- prefer JSON contracts for scripting
- record durable evidence before handoff
- tell agents when to fall back to code search

## Current Command To Install Guidance

```bash
npx jumpspace add-skill --all
```
