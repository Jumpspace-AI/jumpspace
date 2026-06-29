# Jumpspace v0

Jumpspace uses Jumpspace to build Jumpspace.

## Markdown task block parser

<!-- jumpspace
id: JS-001
type: spec
status: implemented
code:
  - src/core/parseMarkdown.ts
tests:
  - src/core/parseMarkdown.test.ts
depends_on: []
-->

Jumpspace parses Markdown files for HTML comment blocks beginning with `jumpspace`. Each block contains YAML metadata and applies to the nearest preceding Markdown heading. The task body starts after the comment and continues until the next heading of the same or higher level.

## Repo-local index generation

<!-- jumpspace
id: JS-002
type: spec
status: implemented
keywords:
  - ingest
  - ingestion
code:
  - src/commands/scan.ts
  - src/core/indexTasks.ts
tests:
  - src/core/indexTasks.test.ts
depends_on:
  - JS-001
-->

The `jumpspace scan` command creates a repo-local `.jumpspace/index.json` file from Markdown task blocks.

## Task list command

<!-- jumpspace
id: JS-003
type: spec
status: implemented
code:
  - src/commands/list.ts
  - src/core/filterTasks.ts
tests:
  - src/commands/list.test.ts
depends_on:
  - JS-002
-->

The `jumpspace list` command displays indexed tasks in a readable table or JSON and supports filtering by status, type, module, and space.

## Task discovery commands

<!-- jumpspace
id: JS-009
type: spec
status: implemented
module: core-cli
space: repo
code:
  - src/commands/find.ts
  - src/commands/related.ts
  - src/core/searchTasks.ts
  - src/core/taskRelations.ts
tests:
  - src/core/searchTasks.test.ts
  - src/core/taskRelations.test.ts
depends_on:
  - JS-002
  - JS-003
-->

The `jumpspace find <query>` command searches indexed task IDs, titles, specs, modules, keywords, linked files, dependencies, refs, sources, and external metadata. The `jumpspace related <id>` command shows dependency and structured-reference relationships for a task. Both commands support machine-readable JSON output.

## Planning and execution workflow

<!-- jumpspace
id: JS-010
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - orchestration
  - approval
  - execution
  - agent handoff
code:
  - src/commands/plan.ts
  - src/commands/ready.ts
  - src/commands/execute.ts
  - src/commands/next.ts
  - src/commands/step.ts
  - src/core/execution.ts
  - src/core/plans.ts
  - src/core/refreshIndex.ts
tests:
  - src/core/execution.test.ts
  - src/core/plans.test.ts
  - src/cli.test.ts
depends_on:
  - JS-002
  - JS-003
  - JS-004
  - JS-005
  - JS-008
refs:
  - type: related_to
    id: JS-005
    note: Execution packets tell agents to run scan and audit before finishing.
plan:
  task_id: JS-010
  goal: Implement durable task planning with ordered steps, evidence, next-step selection, context exposure, and audit validation.
  status: complete
  steps:
    - id: orient
      outcome: Relevant Jumpspace tasks and linked files are identified before implementation.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
      tests: []
      checks:
        - node dist/cli.js --help
        - node dist/cli.js scan
        - node dist/cli.js list
        - node dist/cli.js audit --json
        - node dist/cli.js context JS-010 --json
      evidence:
        - "Used Jumpspace CLI for orientation: --help, scan, list, audit --json, find, related JS-010 --json, and context JS-010/JS-008/JS-005 --json."
    - id: implement
      outcome: Durable plan schema, persistence, validation, next-step selection, and step completion commands exist.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/types.ts
        - src/core/parseMarkdown.ts
        - src/core/plans.ts
        - src/core/validateTasks.ts
        - src/core/renderContext.ts
        - src/core/refreshIndex.ts
        - src/commands/plan.ts
        - src/commands/next.ts
        - src/commands/step.ts
        - src/commands/context.ts
        - src/cli.ts
      tests:
        - src/core/plans.test.ts
        - src/core/parseMarkdown.test.ts
        - src/core/validateTasks.test.ts
        - src/core/renderContext.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - npm run build
      evidence:
        - Implemented durable plan schema, parser/index support, plan save/show/validate, next, step complete, context JSON plan/execution state, and audit plan validation.
    - id: docs
      outcome: Documentation and agent templates describe the durable planning workflow.
      status: complete
      depends_on:
        - implement
      source_files:
        - docs/specs/jumpspace-v0.md
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests: []
      checks:
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - Updated docs/specs/jumpspace-v0.md, README.md, and AGENTS/SKILL templates to describe durable planning commands and the docs-approval-execution workflow.
    - id: verify
      outcome: Build, tests, Jumpspace scan, context, plan commands, next-step selection, and audit are verified.
      status: complete
      depends_on:
        - docs
      source_files:
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/plans.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js context JS-010 --json
        - node dist/cli.js plan show JS-010
        - node dist/cli.js plan validate JS-010 --json
        - node dist/cli.js next JS-010 --json
        - node dist/cli.js audit --json
      evidence:
        - Verified npm test (12 files, 44 tests), npm run build, node dist/cli.js scan, context JS-010 --json, plan show JS-010, plan validate JS-010 --json, next JS-010 --json, and audit --json all passed.
-->

The `jumpspace plan review <id>` command prints a human approval packet for a documented task. The `jumpspace plan save <id> --file <plan-file>` command persists a durable ordered plan into the source Markdown task block. The `jumpspace plan show <id>` and `jumpspace plan validate <id>` commands read and validate persisted plans. The `jumpspace next <id>` command returns pending unblocked plan steps. The `jumpspace step complete <task-id> <step-id> --evidence <evidence>` command records completion evidence for a step. The `jumpspace ready` command lists approved or partial tasks whose dependencies are implemented or verified. The `jumpspace execute <id>` command prints an agent execution packet and blocks unless the task is approved or partial and its dependencies are complete, unless `--force` is used.

## Agent context packet

<!-- jumpspace
id: JS-004
type: spec
status: implemented
module: core-cli
space: repo
code:
  - src/commands/context.ts
  - src/core/renderContext.ts
tests:
  - src/core/renderContext.test.ts
depends_on:
  - JS-002
refs:
  - type: related_to
    id: JS-005
    note: Context output should tell agents to run audit before finishing.
-->

The `jumpspace context <id>` command prints an agent-ready implementation packet for the requested task. JSON context includes the associated durable plan and current execution state.

## Audit command

<!-- jumpspace
id: JS-005
type: spec
status: implemented
code:
  - src/commands/audit.ts
  - src/core/validateTasks.ts
  - src/core/plans.ts
tests:
  - src/commands/audit.test.ts
  - src/core/plans.test.ts
  - src/core/validateTasks.test.ts
depends_on:
  - JS-002
-->

The `jumpspace audit` command validates the repo-local implementation memory graph, task-plan references, plan dependency cycles, completed-step evidence, stale generated indexes, supports JSON output, and exits non-zero on blocking errors.

## Future-proof task schema

<!-- jumpspace
id: JS-008
type: spec
status: implemented
module: core-schema
space: repo
code:
  - src/core/types.ts
  - src/core/parseMarkdown.ts
  - src/core/validateTasks.ts
tests:
  - src/core/parseMarkdown.test.ts
  - src/core/validateTasks.test.ts
depends_on:
  - JS-001
-->

Jumpspace task blocks support optional `module`, `space`, `keywords`, durable `plan`, `acceptance_criteria`, `verification_records`, and structured `refs` fields so future versions can support module context, global docs, product-vocabulary search, ordered execution plans, earned verification, and richer graph relationships while preserving the simple v0 workflow.

## Init command and templates

<!-- jumpspace
id: JS-006
type: spec
status: implemented
code:
  - src/commands/init.ts
  - src/templates/example-spec.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/templates/pull_request_template.md
  - src/templates/jumpspace.yml
tests:
  - src/commands/init.test.ts
depends_on: []
-->

The `jumpspace init` command creates starter config, docs, agent instructions, and GitHub review templates without overwriting existing files unless `--force` is provided. `jumpspace init --agent codex` updates only Jumpspace-managed repo-local guidance blocks and preserves user-authored content outside those markers.

## Documentation and quickstart

<!-- jumpspace
id: JS-007
type: engineering
status: implemented
code:
  - README.md
tests: []
depends_on:
  - JS-001
  - JS-002
  - JS-003
  - JS-004
  - JS-005
  - JS-008
  - JS-006
  - JS-009
  - JS-010
-->

The README explains what Jumpspace is, how to install it, how to initialize a repo, how to create a task block, how to discover task context, how to run the plan/approval/execution workflow, and how to use coding agents with Jumpspace.

## Agent trust loop

<!-- jumpspace
id: JS-011
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - verification
  - drift
  - ask
  - codex
code:
  - src/cli.ts
  - src/commands/ask.ts
  - src/commands/audit.ts
  - src/commands/changed.ts
  - src/commands/drift.ts
  - src/commands/execute.ts
  - src/commands/find.ts
  - src/commands/init.ts
  - src/commands/next.ts
  - src/commands/plan.ts
  - src/commands/status.ts
  - src/commands/step.ts
  - src/commands/verify.ts
  - src/core/ask.ts
  - src/core/atomicWrite.ts
  - src/core/changed.ts
  - src/core/config.ts
  - src/core/drift.ts
  - src/core/errors.ts
  - src/core/execution.ts
  - src/core/managedBlocks.ts
  - src/core/metadata.ts
  - src/core/parseMarkdown.ts
  - src/core/renderContext.ts
  - src/core/searchTasks.ts
  - src/core/types.ts
  - src/core/validateTasks.ts
  - src/core/verification.ts
tests:
  - src/cli.test.ts
  - src/commands/init.test.ts
  - src/core/ask.test.ts
  - src/core/changed.test.ts
  - src/core/drift.test.ts
  - src/core/managedBlocks.test.ts
  - src/core/metadata.test.ts
  - src/core/parseMarkdown.test.ts
  - src/core/renderContext.test.ts
  - src/core/searchTasks.test.ts
  - src/core/validateTasks.test.ts
  - src/core/verification.test.ts
depends_on:
  - JS-004
  - JS-005
  - JS-006
  - JS-008
  - JS-009
  - JS-010
refs:
  - type: related_to
    id: JS-010
    note: Trust-loop commands extend durable plans with verification evidence.
plan:
  task_id: JS-011
  goal: "Implement the agent trust loop: standardized JSON errors, earned verification, safer metadata mutation, evidence ask, changed/drift, and Codex managed guidance."
  status: complete
  steps:
    - id: orient
      outcome: Existing Jumpspace commands, schemas, specs, and tests are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
        - src/cli.ts
        - src/core/types.ts
        - src/core/plans.ts
        - src/core/searchTasks.ts
        - src/commands/init.ts
      tests:
        - src/cli.test.ts
        - src/core/searchTasks.test.ts
        - src/commands/init.test.ts
      checks:
        - node dist/cli.js --help
        - node dist/cli.js list
        - node dist/cli.js audit --json
      evidence:
        - "Used Jumpspace CLI to orient: --help, scan, list, find, context JS-011 --json, plan save/validate, next JS-011 --json, and audit --json. Existing warnings are expected for files planned but not yet created."
    - id: trust-metadata
      outcome: Metadata mutations are atomic, JSON error failures are standardized, status cannot set verified, and verify writes structured records only after passing checks.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/cli.ts
        - src/commands/status.ts
        - src/commands/verify.ts
        - src/core/errors.ts
        - src/core/metadata.ts
        - src/core/types.ts
        - src/core/verification.ts
      tests:
        - src/cli.test.ts
        - src/core/metadata.test.ts
        - src/core/verification.test.ts
      checks:
        - npm test
      evidence:
        - Implemented shared JSON error envelopes, atomic metadata/index/template writes, protected status verified, verify command with commit/timestamp/check exit codes/criteria/evidence, verification schema parsing, context/execution packet verification fields, and audit validation for verified records. Verified with npm test (18 files, 60 tests) and npm run build.
    - id: retrieval-drift
      outcome: find --mode any, ask evidence summaries, changed, and drift commands work with structured JSON.
      status: complete
      depends_on:
        - trust-metadata
      source_files:
        - src/cli.ts
        - src/commands/ask.ts
        - src/commands/changed.ts
        - src/commands/drift.ts
        - src/core/ask.ts
        - src/core/changed.ts
        - src/core/drift.ts
        - src/core/searchTasks.ts
      tests:
        - src/cli.test.ts
        - src/core/ask.test.ts
        - src/core/changed.test.ts
        - src/core/drift.test.ts
        - src/core/searchTasks.test.ts
      checks:
        - npm test
      evidence:
        - Implemented find --mode all|any with strict default preservation, ask evidence summaries with coverage/unanswered terms, changed --since Git source aggregation, and drift facts/warnings separation. Verified with npm test (18 files, 60 tests), npm run build, node dist/cli.js find trust loop --mode any --json, and node dist/cli.js ask 'How does Jumpspace earn verified status' --json.
    - id: codex-docs
      outcome: init --agent codex is idempotent and non-destructive, and docs/templates describe the trust loop.
      status: complete
      depends_on:
        - retrieval-drift
      source_files:
        - src/commands/init.ts
        - src/core/managedBlocks.ts
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests:
        - src/commands/init.test.ts
        - src/core/managedBlocks.test.ts
      checks:
        - npm test
      evidence:
        - Implemented init --agent codex with managed-block upsert semantics and atomic writes; updated README, docs/specs/jumpspace-v0.md, AGENTS and SKILL templates for verify/status/ask/changed/drift. Verified with npm test (18 files, 60 tests), npm run build, node dist/cli.js plan validate JS-011 --json, and node dist/cli.js audit --json.
    - id: final-verify
      outcome: Build, tests, scan, audit, and representative CLI commands pass; verification limitations are recorded truthfully.
      status: complete
      depends_on:
        - codex-docs
      source_files:
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - "Final verification completed: npm test passed (18 files, 60 tests), npm run build passed, node dist/cli.js scan indexed 11 tasks, node dist/cli.js audit --json returned ok true with no issues, plan show/context/plan validate JS-011 succeeded, status JS-011 verified was rejected with PROTECTED_VERIFIED_STATUS, and verify/changed/drift returned structured JSON errors because /Users/christopherrote/jumpspace is not a Git repository and no commit SHA is available."
acceptance_criteria:
  - id: AC-1
    description: JSON command failures use a stable ok/errors envelope, status cannot set verified, and verify records commit, timestamp, checks, criteria, and evidence only after passing checks.
  - id: AC-2
    description: find keeps strict all-term matching by default, find --mode any works, and ask returns an evidence summary with paths, task IDs, match reasons, coverage, and unanswered terms.
  - id: AC-3
    description: changed --since reports committed, staged, unstaged, untracked, renamed, and deleted files, and drift --since separates factual drift from heuristic warnings.
  - id: AC-4
    description: Mutation writes use atomic replacement, and init --agent codex is idempotent and non-destructive outside Jumpspace-managed markers.
  - id: AC-5
    description: Documentation, templates, unit tests, CLI integration tests, scan, audit, and build cover the trust-loop workflow.
-->

Jumpspace should help coding agents answer questions from repo-local evidence, detect drift between code and task memory, and earn verified status through structured checks rather than manual status edits. JSON failures use one stable `ok: false` and `errors` envelope. Mutation commands update source Markdown and generated metadata with atomic replacement. `status <id> verified` is rejected; `verify <id>` runs checks, records commit/timestamp/check exit codes/acceptance coverage, and then sets `verified`. `find` keeps strict all-term matching by default and adds `--mode any`; `ask` uses forgiving retrieval to summarize evidence instead of inventing an answer. `changed --since <ref>` reports committed, staged, unstaged, untracked, renamed, and deleted files since the supplied ref. `drift --since <ref>` separates factual drift from heuristic recommendations. `init --agent codex` updates only Jumpspace-managed repo-local guidance blocks.

## Hybrid semantic retrieval

<!-- jumpspace
id: JS-012
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - semantic search
  - embeddings
  - lancedb
  - onnx
  - hybrid retrieval
code:
  - src/cli.ts
  - src/commands/ask.ts
  - src/commands/semantic.ts
  - src/commands/audit.ts
  - src/core/ask.ts
  - src/core/semanticIndex.ts
  - src/core/doctor.ts
  - src/core/schemas.ts
  - src/core/types.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - sdk/python/jumpspace_sdk/__init__.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - .gitignore
tests:
  - src/core/semanticIndex.test.ts
  - src/core/ask.test.ts
  - src/core/searchTasks.test.ts
  - src/core/doctor.test.ts
  - src/core/agentSkills.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
gaps: []
depends_on:
  - JS-009
  - JS-011
refs:
  - type: related_to
    id: JS-009
    note: Semantic retrieval should extend discovery without replacing deterministic lexical search.
  - type: related_to
    id: JS-011
    note: Ask should use hybrid retrieval while still returning evidence summaries instead of authoritative answers.
plan:
  task_id: JS-012
  goal: Add optional local hybrid retrieval for agent questions while preserving deterministic lexical find behavior.
  status: complete
  steps:
    - id: orient
      outcome: Existing lexical find, ask evidence summaries, schemas, audit, doctor, and CLI wiring are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/core/searchTasks.ts
        - src/core/ask.ts
        - src/commands/find.ts
        - src/commands/ask.ts
        - src/core/schemas.ts
        - src/commands/audit.ts
        - src/core/doctor.ts
      tests:
        - src/core/searchTasks.test.ts
        - src/core/ask.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-012 --json
        - node dist/cli.js context JS-024 --json
        - node dist/cli.js audit --json
      evidence:
        - "Orientation complete: JS-012 depends only on implemented JS-009 and JS-011; JS-024 depends on JS-012, so hybrid retrieval is the correct next slice. Existing find defaults to strict all-term lexical matching, ask uses find mode any, and audit/doctor do not yet know about semantic artifacts."
    - id: semantic-core
      outcome: A generated local task-vector index can be built, read, searched, and checked for staleness without hosted services or required embedding dependencies.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/semanticIndex.ts
        - src/core/config.ts
        - src/core/types.ts
        - src/commands/audit.ts
        - src/core/doctor.ts
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/doctor.test.ts
      checks:
        - npm test -- src/core/semanticIndex.test.ts src/core/doctor.test.ts
      evidence:
        - Implemented src/core/semanticIndex.ts with generated local task-vector artifacts, optional LanceDB/ONNX dependency detection, source-index hashing, read/write/search/status helpers, and non-blocking audit warnings for missing, invalid, or stale semantic indexes. Updated config typing plus audit and doctor suggestion plumbing. Verified npm test -- src/core/semanticIndex.test.ts src/core/doctor.test.ts passed (8 tests) and npm run build passed.
    - id: semantic-cli
      outcome: CLI commands build, inspect, and search the semantic index with human and JSON output plus published schemas.
      status: complete
      depends_on:
        - semantic-core
      source_files:
        - src/cli.ts
        - src/commands/semantic.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test -- src/cli.test.ts src/sdk/contracts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js schema show semantic.build --json
      evidence:
        - Implemented jumpspace semantic build/status/search with JSON and human output, config enablement, atomic semantic-index writes, mutation summaries, schema contracts semantic.build/status/search, and TS/Python SDK schema-name updates. Verified npm test -- src/cli.test.ts src/sdk/contracts.test.ts src/core/semanticIndex.test.ts passed (23 tests), npm run build passed, python3 -m unittest discover -s sdk/python/tests passed, schema show semantic.build --json passed, semantic build --json built 25 documents, semantic status --json reported ready true, and semantic search 'agent evidence retrieval' --json returned JS-012 as the top result.
    - id: hybrid-ask
      outcome: Ask uses hybrid lexical plus semantic retrieval when a valid semantic index exists, while find keeps its strict lexical default.
      status: complete
      depends_on:
        - semantic-cli
      source_files:
        - src/core/ask.ts
        - src/commands/ask.ts
        - src/core/searchTasks.ts
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/ask.test.ts
        - src/core/searchTasks.test.ts
        - src/core/agentSkills.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/ask.test.ts src/core/searchTasks.test.ts src/core/agentSkills.test.ts src/cli.test.ts
        - node dist/cli.js semantic build --json
        - node dist/cli.js ask "conceptual semantic retrieval evidence" --json
      evidence:
        - "Implemented hybrid ask summaries: ask now reads semantic index status, uses lexical plus semantic retrieval when the generated index is ready, reports retrieval mode/source/scores/semantic terms/coverage/unanswered terms, and falls back to lexical while surfacing semantic readiness issues. Updated README, generated agent templates, and generated skill guidance. Verified npm test -- src/core/ask.test.ts src/core/searchTasks.test.ts src/core/agentSkills.test.ts src/cli.test.ts passed (26 tests), npm run build passed, node dist/cli.js ask 'conceptual semantic retrieval evidence' --json returned retrieval_mode hybrid with JS-012 top evidence, and find still returned strict all-term lexical results."
    - id: final-verify
      outcome: Full tests, build, scan, audit, doctor, semantic CLI smoke commands, ask hybrid smoke, and plan validation pass.
      status: complete
      depends_on:
        - hybrid-ask
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/ask.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js semantic status --json
        - node dist/cli.js semantic search "agent evidence retrieval" --json
        - node dist/cli.js ask "How does hybrid retrieval find conceptual evidence?" --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-012 --json
      evidence:
        - "Final verification passed: npm test (33 files, 116 tests), npm run build, python3 -m unittest discover -s sdk/python/tests (3 tests), node dist/cli.js scan indexed 25 tasks, node dist/cli.js semantic build --json built 25 documents from the fresh index, semantic status --json returned ready true and stale false, semantic search 'agent evidence retrieval' --json returned JS-012 first, ask 'How does hybrid retrieval find conceptual evidence?' --json returned retrieval_mode hybrid with semantic ready true and JS-012 first, audit --json returned ok true, doctor --json returned ok true, plan validate JS-012 --json returned ok true, and next JS-012 --json showed final-verify as the last pending step before completion."
acceptance_criteria:
  - id: AC-1
    description: Lexical find remains the default deterministic retrieval path and existing scripts are not broken.
  - id: AC-2
    description: An optional local semantic index can be built from Jumpspace task metadata, specs, and linked documentation using ONNX embeddings and LanceDB or an equivalent local vector store.
  - id: AC-3
    description: Ask uses hybrid retrieval to merge lexical and semantic evidence, reports retrieval source, match reasons, scores, paths, task IDs, coverage, and unanswered terms.
  - id: AC-4
    description: Audit detects stale or missing semantic index artifacts separately from blocking task metadata errors.
  - id: AC-5
    description: The feature introduces no hosted service dependency and degrades gracefully when optional embedding dependencies are unavailable.
-->

Jumpspace should support optional local hybrid retrieval so agents can find conceptually related task evidence even when the question uses different words than the docs. The existing lexical `find` behavior should remain the default for deterministic scripts. A semantic index should be explicitly enabled, stored under `.jumpspace`, and treated as generated data. `ask` should prefer hybrid retrieval when the semantic index is available, but still return an evidence summary with citations, paths, task IDs, match reasons, coverage, and unanswered terms. The first implementation should evaluate LanceDB plus ONNX embeddings as the local vector backend, while keeping the dependency optional and auditable.

## AI-assisted graph bootstrap

<!-- jumpspace
id: JS-013
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - ingest
  - bootstrap
  - knowledge graph
  - markdown
  - ai agent
  - proposal
  - skill
code:
  - src/cli.ts
  - src/commands/bootstrap.ts
  - src/core/bootstrap.ts
  - src/core/bootstrapProposal.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - README.md
tests:
  - src/cli.test.ts
  - src/commands/bootstrap.test.ts
  - src/core/bootstrap.test.ts
  - src/core/bootstrapProposal.test.ts
depends_on:
  - JS-001
  - JS-002
  - JS-006
  - JS-008
  - JS-011
refs:
  - type: related_to
    id: JS-002
    note: Bootstrap apply should create source Markdown task blocks that scan can index.
  - type: related_to
    id: JS-006
    note: Agent bootstrap guidance should be packaged through repo-local templates and managed guidance.
  - type: related_to
    id: JS-011
    note: Bootstrap output should preserve evidence-first behavior and avoid invented implementation claims.
  - type: related_to
    id: JS-012
    note: Semantic retrieval may improve candidate clustering, but agent-assisted bootstrap should remain useful without embeddings.
plan:
  task_id: JS-013
  goal: Implement AI-assisted graph bootstrap so an agent can turn an existing repo's docs into a cited Jumpspace proposal and apply it after human approval.
  status: complete
  steps:
    - id: orient
      outcome: Existing parser, index, schema, mutation, CLI, audit, ask, init template, and agent guidance patterns are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
        - src/cli.ts
        - src/core/parseMarkdown.ts
        - src/core/indexTasks.ts
        - src/core/types.ts
        - src/core/metadata.ts
        - src/core/atomicWrite.ts
        - src/core/validateTasks.ts
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests:
        - src/core/parseMarkdown.test.ts
        - src/core/indexTasks.test.ts
        - src/core/metadata.test.ts
        - src/core/validateTasks.test.ts
        - src/commands/init.test.ts
      checks:
        - node dist/cli.js context JS-013 --json
        - node dist/cli.js related JS-013 --json
        - node dist/cli.js audit --json
      evidence:
        - Mapped parser, index, metadata, config, CLI, audit, template, and managed-block patterns with Jumpspace context and repo reads.
    - id: context-export
      outcome: The CLI exposes jumpspace bootstrap context with JSON containing source document excerpts, headings, existing task IDs, linked file hints, and unanswered evidence gaps for an AI agent to reason over.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/cli.ts
        - src/commands/bootstrap.ts
        - src/core/bootstrap.ts
        - src/core/types.ts
        - src/core/parseMarkdown.ts
        - src/core/searchTasks.ts
      tests:
        - src/cli.test.ts
        - src/commands/bootstrap.test.ts
        - src/core/bootstrap.test.ts
      checks:
        - npm test
      evidence:
        - Implemented bootstrap context export with Markdown heading discovery, excerpts, suggested IDs, existing task awareness, linked-file hints, schema instructions, and JSON/human output.
    - id: proposal-schema
      outcome: A typed proposal schema and validator accept agent-generated graph proposals with task blocks, source citations, confidence, relationship evidence, skipped headings, and explicit gaps.
      status: complete
      depends_on:
        - context-export
      source_files:
        - src/core/bootstrapProposal.ts
        - src/core/bootstrap.ts
        - src/core/types.ts
        - src/core/validateTasks.ts
      tests:
        - src/core/bootstrapProposal.test.ts
        - src/core/bootstrap.test.ts
      checks:
        - npm test
      evidence:
        - Implemented bootstrap proposal schema, parse errors, duplicate-ID detection, source-heading validation, dependency/ref checks, and evidenced code/test link validation.
    - id: agent-skill
      outcome: Repo-local Codex and agent guidance teaches an AI to run bootstrap context, reason over documents, produce proposal JSON, ask for approval, and avoid invented code or test links.
      status: complete
      depends_on:
        - proposal-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests:
        - src/commands/init.test.ts
        - src/core/managedBlocks.test.ts
      checks:
        - npm test
      evidence:
        - Updated README and agent templates so Claude/Codex skills know to run bootstrap context, validate proposals, ask for approval, and apply only approved proposal files.
    - id: apply-mode
      outcome: The CLI exposes jumpspace bootstrap validate and jumpspace bootstrap apply so approved proposal JSON can be checked and then atomically inserted or updated as source Markdown task blocks.
      status: complete
      depends_on:
        - agent-skill
      source_files:
        - src/cli.ts
        - src/commands/bootstrap.ts
        - src/core/bootstrap.ts
        - src/core/bootstrapProposal.ts
        - src/core/metadata.ts
        - src/core/atomicWrite.ts
      tests:
        - src/cli.test.ts
        - src/commands/bootstrap.test.ts
        - src/core/bootstrapProposal.test.ts
        - src/core/bootstrap.test.ts
      checks:
        - npm test
      evidence:
        - Implemented bootstrap validate/apply CLI commands, atomic Markdown task-block insertion, applied-path config updates, index refresh, and structured JSON failures.
    - id: graph-validation
      outcome: Applied bootstrap output can be scanned, audited, found, asked about, and inspected as normal source-backed Jumpspace graph data.
      status: complete
      depends_on:
        - apply-mode
      source_files:
        - src/commands/scan.ts
        - src/commands/audit.ts
        - src/commands/ask.ts
        - src/core/indexTasks.ts
        - src/core/validateTasks.ts
      tests:
        - src/cli.test.ts
        - src/commands/audit.test.ts
        - src/core/ask.test.ts
        - src/core/indexTasks.test.ts
        - src/core/validateTasks.test.ts
      checks:
        - npm test
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - "Verified applied bootstrap output in a temp repo: scan indexed the generated README task, context DOC-PASSWORD returned the source-backed graph entry, and audit returned ok true."
    - id: docs
      outcome: README, templates, and the JS-013 spec explain the human approval loop, agent responsibilities, proposal schema, context/apply commands, and post-bootstrap scan/audit/ask workflow.
      status: complete
      depends_on:
        - graph-validation
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests: []
      checks:
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - Updated README, AGENTS template, SKILL template, and JS-013 spec with bootstrap context, validate, apply, JSON workflow, and human approval guidance.
    - id: final-verify
      outcome: Unit tests, CLI integration tests, build, scan, audit, and representative context/validate/apply examples pass with truthful evidence recorded.
      status: complete
      depends_on:
        - docs
      source_files:
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/bootstrap.test.ts
        - src/commands/bootstrap.test.ts
        - src/core/bootstrapProposal.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - "Final verification passed: npm test passed with 22 files and 70 tests, npm run build passed, node dist/cli.js scan indexed 14 tasks, plan validate JS-013 returned ok true, audit --json returned ok true, and temp-repo bootstrap context/validate/apply/scan/context/audit smoke test passed."
acceptance_criteria:
  - id: AC-1
    description: A context export command analyzes existing Markdown files and existing Jumpspace graph data without mutating files.
  - id: AC-2
    description: Agent-facing guidance or a packaged skill gives an AI the workflow and proposal schema needed to generate a first graph from exported context.
  - id: AC-3
    description: Proposal JSON explains selected and skipped headings with source path, heading, proposed task ID, confidence, citations, relationship evidence, and unanswered gaps.
  - id: AC-4
    description: Apply mode writes only approved and validated proposal data, uses stable generated IDs, marks new tasks draft or proposed, and never fabricates code or test links.
  - id: AC-5
    description: Generated refs and depends_on entries are added only when supported by explicit document evidence or existing Jumpspace IDs.
  - id: AC-6
    description: After apply mode, jumpspace scan, ask, context, and audit can use the resulting source-backed knowledge graph without special generated sidecars.
-->

Jumpspace helps an AI agent take an existing repository and build the first source-backed graph from the docs already present. The CLI provides deterministic rails rather than pretending to reason by itself: `jumpspace bootstrap discover --json` reports recommended doc globs, detected files, profile hints, and ignored generated paths for messy repos; `jumpspace bootstrap context <paths...> --json` exports document headings, source line/level/parent identity, excerpts, existing task IDs, scoped file hints, and evidence gaps; an agent skill or goal uses that packet to produce cited proposal JSON; `jumpspace bootstrap validate --file <proposal-file> --json` checks the proposal; `jumpspace bootstrap apply --file <proposal-file> --dry-run --json` previews approved mutations; and `jumpspace bootstrap apply --file <proposal-file>` atomically writes approved task blocks into source Markdown. Apply mode also adds applied Markdown paths to `.jumpspace/config.json` when needed so future `scan`, `find`, `ask`, `context`, and `audit` commands can use the resulting graph. The proposal must carry citations, confidence, skipped-heading reasons, relationship evidence, and unanswered gaps. Human approval remains the mutation boundary.

## Agent skill installer

<!-- jumpspace
id: JS-014
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - add-skill
  - codex
  - claude
  - agent skill
  - installer
code:
  - src/cli.ts
  - src/commands/addSkill.ts
  - src/commands/init.ts
  - src/core/agentSkills.ts
  - src/core/managedBlocks.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/core/agentSkills.test.ts
  - src/commands/init.test.ts
  - src/core/managedBlocks.test.ts
depends_on:
  - JS-006
  - JS-011
refs:
  - type: related_to
    id: JS-013
    note: Bootstrap workflows should be installed into agent skill definitions so an AI can build the first graph for an existing repo.
acceptance_criteria:
  - id: AC-1
    description: The CLI exposes jumpspace add-skill with --codex, --claude, --agent, --all, optional named skills, and --json options.
  - id: AC-2
    description: Codex installation appends managed guidance to AGENTS.md, @-mentions repo-local .codex/skills/Jumpspace skill files, and preserves existing user-authored skill content.
  - id: AC-3
    description: Claude installation appends managed guidance to CLAUDE.md, @-mentions repo-local .claude/skills/Jumpspace skill files, and preserves existing user-authored skill content.
  - id: AC-4
    description: Re-running the installer is idempotent; existing files receive an appended managed block or an in-place managed-block update, never a clean overwrite.
  - id: AC-5
    description: Missing agent selection returns a structured JSON error when --json is used.
-->

Jumpspace should make it easy to add repo-local agent skill definitions to an existing project after Jumpspace is installed. `jumpspace add-skill --codex` appends Codex guidance to `AGENTS.md`, @-mentions `.codex/skills/jumpspace-workflow/SKILL.md` plus the supported pipeline skills, and creates or appends to those skill files. `jumpspace add-skill --claude` appends Claude guidance to `CLAUDE.md`, @-mentions `.claude/skills/jumpspace-workflow/SKILL.md` plus the supported pipeline skills, and creates or appends to those skill files. `jumpspace add-skill --all` installs every supported target. `jumpspace add-skill <skill> --agent <codex|claude>` installs one named pipeline skill plus the reference workflow skill. The installer is additive, idempotent, and non-destructive: it creates missing files, appends managed blocks to existing files, and updates only existing Jumpspace-managed blocks.

## Agent-grade contracts and bootstrap safety

<!-- jumpspace
id: JS-015
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - json schema
  - agent contract
  - bootstrap
  - heading identity
  - dry run
code:
  - src/cli.ts
  - src/commands/bootstrap.ts
  - src/commands/schema.ts
  - src/core/bootstrap.ts
  - src/core/bootstrapProposal.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/commands/bootstrap.test.ts
  - src/core/bootstrap.test.ts
  - src/core/bootstrapProposal.test.ts
depends_on:
  - JS-008
  - JS-011
  - JS-013
  - JS-014
refs:
  - type: related_to
    id: JS-011
    note: Agent trust depends on stable JSON contracts and explicit failure modes.
  - type: related_to
    id: JS-013
    note: Bootstrap apply must not mutate the wrong heading when source documents reuse titles.
plan:
  task_id: JS-015
  goal: Harden Jumpspace for agent use by publishing machine-readable JSON contracts and making bootstrap source writes unambiguous, previewable, and documented.
  status: complete
  steps:
    - id: orient
      outcome: Current command JSON shapes, bootstrap heading matching, proposal schema, docs, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
        - src/cli.ts
        - src/commands/bootstrap.ts
        - src/core/bootstrap.ts
        - src/core/bootstrapProposal.ts
      tests:
        - src/core/bootstrap.test.ts
        - src/core/bootstrapProposal.test.ts
        - src/commands/bootstrap.test.ts
      checks:
        - node dist/cli.js --help
        - node dist/cli.js context JS-015 --json
        - node dist/cli.js audit --json
      evidence:
        - "Orientation complete: used Jumpspace scan/context/next/plan validate/audit to map JS-015. Audit is ok true with expected missing-file warnings for planned new schema command files src/commands/schema.ts and src/core/schemas.ts."
    - id: schema-contracts
      outcome: The CLI exposes documented JSON schemas for command success and error envelopes so agents do not guess output shapes.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/cli.ts
        - src/commands/schema.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js schema list --json
      evidence:
        - "Implemented schema registry and CLI: node dist/cli.js schema list --json returned ok true with contract_version 1 and named schemas, schema show bootstrap.apply --json returned the dry-run/apply contract, schema show missing --json returned ok false UNKNOWN_SCHEMA. Focused tests passed: npm test -- src/core/bootstrap.test.ts src/core/bootstrapProposal.test.ts src/commands/bootstrap.test.ts src/cli.test.ts (4 files, 16 tests). npm run build passed."
    - id: bootstrap-safety
      outcome: Bootstrap context, validation, and apply identify source headings by path, line, level, and parent chain; ambiguous title-only proposals are rejected; apply supports dry-run previews.
      status: complete
      depends_on:
        - schema-contracts
      source_files:
        - src/commands/bootstrap.ts
        - src/core/bootstrap.ts
        - src/core/bootstrapProposal.ts
      tests:
        - src/core/bootstrap.test.ts
        - src/core/bootstrapProposal.test.ts
        - src/commands/bootstrap.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js bootstrap apply --help
      evidence:
        - "Implemented bootstrap source identity and preview safety: context headings now include source_key, line, level, parent_headings, scoped own/descendant file hints, source line details, and suggested IDs hash path+line+level+heading. Proposal source accepts optional line/level/parent_headings. Validation rejects ambiguous title-only headings and duplicate source targets. apply supports --dry-run with would_insert actions and no file/config/index mutation. Focused tests passed and node dist/cli.js bootstrap apply --help shows --dry-run."
    - id: docs-agent-guidance
      outcome: README, templates, and spec text teach agents about schema lookup, bootstrap dry-run, heading ambiguity, and evidence-only ask behavior.
      status: complete
      depends_on:
        - bootstrap-safety
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests: []
      checks:
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - Updated README, JS-013 spec text, AGENTS template, and SKILL template to document schema list/show, standard JSON errors, bootstrap source line/level/parent disambiguation, dry-run preview before apply, and ask as evidence summary. node dist/cli.js scan indexed 15 tasks and sequential node dist/cli.js audit --json returned ok true with no issues.
    - id: final-verify
      outcome: Tests, build, scan, audit, schema examples, bootstrap dry-run, and plan validation pass, with limitations recorded truthfully.
      status: complete
      depends_on:
        - docs-agent-guidance
      source_files:
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/bootstrap.test.ts
        - src/commands/bootstrap.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js plan validate JS-015 --json
      evidence:
        - "Final verification passed: npm test passed (22 files, 73 tests), npm run build passed, node dist/cli.js scan indexed 15 tasks, node dist/cli.js audit --json returned ok true with no issues, node dist/cli.js plan validate JS-015 --json returned ok true, node dist/cli.js schema show find --json returned the find output contract, and a temp-repo node dist/cli.js bootstrap apply --dry-run --json smoke returned ok true, dry_run true, action would_insert, line 3, mutated false. Jumpspace verify was not run because /Users/christopherrote/jumpspace is not a Git repository, so commit SHA capture is unavailable in this workspace."
acceptance_criteria:
  - id: AC-1
    description: Agents can discover stable JSON output schemas and the standard ok/errors failure envelope from the CLI.
  - id: AC-2
    description: Bootstrap context includes source identity fields that disambiguate duplicate heading titles and suggested IDs do not collide for repeated headings.
  - id: AC-3
    description: Bootstrap validation rejects ambiguous title-only source selectors when a document contains duplicate headings.
  - id: AC-4
    description: Bootstrap apply supports a dry-run preview that reports intended insertions without mutating files.
  - id: AC-5
    description: Agent guidance documents schema lookup, dry-run usage, heading disambiguation, and bootstrap failure modes.
-->

Jumpspace should expose contracts that coding agents can rely on without reading the source. Machine-readable commands need documented JSON schemas and the stable error envelope should be discoverable from the CLI. Bootstrap proposals should identify source headings with enough structure to survive duplicate titles: path, heading, line, level, and parent heading chain. Title-only proposals remain accepted only when they are unambiguous; otherwise validation must reject them before apply. Bootstrap apply should also support a dry-run preview so agents and humans can inspect planned Markdown mutations before writing.

## Repo auto-discovery

<!-- jumpspace
id: JS-016
type: spec
status: implemented
module: core-cli
space: repo
keywords:
  - init auto
  - bootstrap discover
  - repo discovery
  - documentation
  - messy repo
code:
  - src/cli.ts
  - src/commands/bootstrap.ts
  - src/commands/init.ts
  - src/core/bootstrap.ts
  - src/core/discovery.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/commands/bootstrap.test.ts
  - src/commands/init.test.ts
  - src/core/discovery.test.ts
depends_on:
  - JS-006
  - JS-013
  - JS-015
refs:
  - type: related_to
    id: JS-013
    note: Bootstrap should discover real repo documentation roots before exporting graph context.
  - type: related_to
    id: JS-015
    note: Discovery output must have a stable JSON schema for agents.
plan:
  task_id: JS-016
  goal: Make first-run bootstrap work on messy real repos by detecting common doc roots, recommending config globs, and excluding generated/noisy paths.
  status: complete
  steps:
    - id: orient
      outcome: Existing init, config, bootstrap, schema, and tests are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/commands/init.ts
        - src/commands/bootstrap.ts
        - src/core/bootstrap.ts
        - src/core/config.ts
        - src/core/schemas.ts
      tests:
        - src/commands/init.test.ts
        - src/commands/bootstrap.test.ts
        - src/core/bootstrap.test.ts
      checks:
        - node dist/cli.js find auto discovery bootstrap init --mode any --json
        - node dist/cli.js audit --json
      evidence:
        - "Orientation complete: used Jumpspace scan/context/next/plan validate/audit plus repo reads of init/config/bootstrap/schema/tests. Audit is ok true with expected warnings for planned new files src/core/discovery.ts and src/core/discovery.test.ts."
    - id: discovery-core
      outcome: A shared discovery module detects common Markdown doc roots, exact top-level docs, repo profile hints, ignored paths, counts, and samples.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/discovery.ts
        - src/core/bootstrap.ts
      tests:
        - src/core/discovery.test.ts
        - src/core/bootstrap.test.ts
      checks:
        - npm test
      evidence:
        - "Implemented src/core/discovery.ts with common doc-root rules, profile hints, recommended globs, samples, and shared generated/noisy ignore patterns. Bootstrap context now reuses the discovery ignore list. Focused verification passed: npm test -- src/core/discovery.test.ts src/core/bootstrap.test.ts (2 files, 6 tests) and npm run build passed."
    - id: cli-wiring
      outcome: The CLI exposes bootstrap discover and init --auto using discovery output without changing existing defaults unless the flag is used.
      status: complete
      depends_on:
        - discovery-core
      source_files:
        - src/cli.ts
        - src/commands/bootstrap.ts
        - src/commands/init.ts
      tests:
        - src/cli.test.ts
        - src/commands/bootstrap.test.ts
        - src/commands/init.test.ts
      checks:
        - npm test
        - npm run build
      evidence:
        - "Implemented CLI wiring for node dist/cli.js bootstrap discover and init --auto. Existing plain init default is preserved unless --auto is passed. Focused tests passed: npm test -- src/core/discovery.test.ts src/commands/bootstrap.test.ts src/commands/init.test.ts src/cli.test.ts (4 files, 18 tests). npm run build passed. Built CLI smoke showed bootstrap discover --json recommending README.md and docs/**/*.md in this repo, init --help shows --auto, and bootstrap --help shows discover."
    - id: schemas-docs
      outcome: Schemas, README, spec text, and agent templates document discovery, init --auto, recommended globs, and generated path exclusions.
      status: complete
      depends_on:
        - cli-wiring
      source_files:
        - src/core/schemas.ts
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests:
        - src/cli.test.ts
      checks:
        - node dist/cli.js schema show bootstrap.discover --json
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - "Updated bootstrap.discover schema contract, README command docs, JS-013/JS-016 spec text, and generated agent templates to document discovery, init --auto, recommended globs, and noisy/generated path exclusions. Focused tests passed: npm test -- src/core/discovery.test.ts src/commands/bootstrap.test.ts src/commands/init.test.ts src/cli.test.ts (4 files, 18 tests). npm run build passed. node dist/cli.js schema show bootstrap.discover --json returned ok true with required discovery fields. node dist/cli.js scan indexed 16 tasks and audit --json returned ok true with no issues."
    - id: final-verify
      outcome: Full tests, build, scan, audit, discover smoke, init --auto smoke, and plan validation pass with truthful limitations recorded.
      status: complete
      depends_on:
        - schemas-docs
      source_files:
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/discovery.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js plan validate JS-016 --json
      evidence:
        - "Final verification passed: npm test passed with 23 files and 78 tests; npm run build passed; node dist/cli.js bootstrap discover --json returned ok true with recommended_docs README.md and docs/**/*.md plus ignored generated/noisy paths; temp-repo init --auto smoke wrote README.md, documentation/**/*.md, and apps/**/README.md without node_modules; node dist/cli.js plan validate JS-016 --json returned ok true; node dist/cli.js scan indexed 16 tasks; node dist/cli.js next JS-016 --json showed only final-verify pending before completion; node dist/cli.js audit --json returned ok true with no issues. Jumpspace verify was not run because /Users/christopherrote/jumpspace is not a Git repository, so commit SHA capture is unavailable in this workspace."
acceptance_criteria:
  - id: AC-1
    description: bootstrap discover reports recommended doc globs, detected files, profile hints, and ignored noisy paths with JSON output.
  - id: AC-2
    description: init --auto uses discovery to write a starter config that includes existing common doc roots without changing default init behavior.
  - id: AC-3
    description: Discovery recognizes README.md, PRODUCT.md, docs/**, documentation/**, apps/**/README.md, packages/**/README.md, infrastructure/**, skills/**, adr/adrs/**, and architecture/** where present.
  - id: AC-4
    description: Discovery ignores generated or noisy paths such as node_modules, dist, .git, .next, coverage, and .claude/worktrees.
  - id: AC-5
    description: Agent guidance and schemas explain how to use discover/init --auto before bootstrap context in messy repos.
-->

Jumpspace should make the first minute in an existing repository useful without requiring agents to know the repo's documentation layout ahead of time. `jumpspace bootstrap discover` should inspect common Markdown documentation locations, report what it found and why, and recommend config globs for `scan` and `bootstrap context`. `jumpspace init --auto` should use the same discovery output to create a better starter `.jumpspace/config.json` when the user opts in, while preserving the current default `docs/**/*.md` behavior for plain `init`.

## Indispensable Jumpspace roadmap

The next phase should make Jumpspace feel like repo memory that maintains itself. Humans should approve intent and repairs, agents should read a stable work packet, and CI should keep the graph fresh.

### Agent start packet

<!-- jumpspace
id: JS-017
type: spec
status: implemented
module: agent-workflow
space: repo
keywords:
  - work packet
  - agent start
  - execution packet
  - context
  - one command
code:
  - src/cli.ts
  - src/commands/work.ts
  - src/core/workPacket.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/core/workPacket.test.ts
depends_on:
  - JS-004
  - JS-010
  - JS-011
  - JS-015
refs:
  - type: related_to
    id: JS-010
    note: The work packet should combine durable planning, next-step selection, and execution gates.
  - type: related_to
    id: JS-011
    note: The work packet should include verification, drift, and evidence guidance.
plan:
  task_id: JS-017
  goal: Implement a single agent start packet command that composes task intent, planning, execution readiness, next steps, verification state, optional drift, schemas, and guardrails.
  status: complete
  steps:
    - id: orient
      outcome: Current context, execute, next, drift, schema, CLI, and test patterns are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/cli.ts
        - src/commands/context.ts
        - src/commands/execute.ts
        - src/commands/next.ts
        - src/commands/drift.ts
        - src/core/execution.ts
        - src/core/plans.ts
        - src/core/drift.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-017 --json
        - node dist/cli.js related JS-017 --json
        - node dist/cli.js audit --json
      evidence:
        - "Orientation complete: used Jumpspace scan/context/related/audit plus repo reads of CLI, execution, context, next, drift, schema, plan, and test patterns. JS-017 is approved with a valid plan. Audit is ok true with expected warnings for planned new files src/commands/work.ts, src/core/workPacket.ts, and src/core/workPacket.test.ts."
    - id: core-packet
      outcome: A shared work packet builder returns stable JSON fields for task, plan, execution, next steps, acceptance criteria, verification records, dependencies, refs, schemas, guardrails, and optional drift.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/workPacket.ts
        - src/core/plans.ts
        - src/core/execution.ts
        - src/core/drift.ts
      tests:
        - src/core/workPacket.test.ts
      checks:
        - npm test -- src/core/workPacket.test.ts
      evidence:
        - Added src/core/workPacket.ts and src/core/workPacket.test.ts; npm test -- src/core/workPacket.test.ts passed.
    - id: cli-schema
      outcome: The CLI exposes jumpspace work <id> with --json and optional --since, and schema show work documents the packet contract.
      status: complete
      depends_on:
        - core-packet
      source_files:
        - src/cli.ts
        - src/commands/work.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
      checks:
        - npm test -- src/core/workPacket.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js schema show work --json
      evidence:
        - Implemented src/commands/work.ts, wired jumpspace work <id> [--since] --json in src/cli.ts, added work/drift schemas in src/core/schemas.ts, added CLI tests for JSON/human/error/drift output. Verified npm test -- src/core/workPacket.test.ts src/cli.test.ts passed, npm run build passed, node dist/cli.js schema show work --json passed, node dist/cli.js work JS-017 --json passed, and node dist/cli.js audit --json returned ok true.
    - id: docs-guidance
      outcome: README, spec text, and agent templates teach agents to start with jumpspace work and explain optional drift refs.
      status: complete
      depends_on:
        - cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
      tests:
        - src/commands/init.test.ts
      checks:
        - npm test -- src/commands/init.test.ts
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - Updated README.md, docs/specs/jumpspace-v0.md, src/templates/AGENTS.md, and src/templates/SKILL.md to make jumpspace work <id> --json the preferred implementation start packet, document --since drift inclusion, and point schema users to schema show work --json. Verified npm test -- src/commands/init.test.ts passed, node dist/cli.js scan indexed 24 tasks, and node dist/cli.js audit --json returned ok true.
    - id: final-verify
      outcome: Full tests, build, scan, audit, work packet smoke, schema smoke, and plan validation pass with truthful limitations recorded.
      status: complete
      depends_on:
        - docs-guidance
      source_files:
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/workPacket.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js work JS-017 --json
        - node dist/cli.js schema show work --json
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js plan validate JS-017 --json
      evidence:
        - "Final verification passed: npm test passed (24 files, 83 tests), npm run build passed, node dist/cli.js scan indexed 24 tasks, node dist/cli.js work JS-017 --json returned ok true with next_action final-verify, node dist/cli.js schema show work --json returned ok true, node dist/cli.js audit --json returned ok true, and node dist/cli.js plan validate JS-017 --json returned ok true. Jumpspace verify was not run because git rev-parse --is-inside-work-tree failed: this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: A single `jumpspace work <id> --json` command returns the task intent, acceptance criteria, durable plan, next unblocked steps, dependencies, refs, linked code, linked tests, verification state, and required checks.
  - id: AC-2
    description: The work packet includes recent drift facts and warnings when a git ref is provided, while still working without drift when no ref is available.
  - id: AC-3
    description: The JSON output includes schema names or schema links for nested packet sections so agents do not guess shapes.
  - id: AC-4
    description: Human-readable output is concise and points agents to the same next action as JSON output.
  - id: AC-5
    description: Unknown tasks, blocked dependencies, stale indexes, and invalid plans return structured errors.
-->

Jumpspace should provide one command that an AI agent runs before touching code. `jumpspace work <id> --json` should be the agent's complete start packet: intent, plan, next step, links, acceptance criteria, verification state, drift state, schema names, and guardrails in one stable shape. Agents should prefer `work` over manually combining `context`, `execute`, and `next`; those commands remain useful for lower-level inspection. `jumpspace work <id> --since <ref> --json` includes factual drift and heuristic warnings in the same packet when a Git baseline is available.

### Doctor and last mutation summary

<!-- jumpspace
id: JS-018
type: spec
status: implemented
module: maintenance
space: repo
keywords:
  - doctor
  - last
  - mutation summary
  - diagnostics
  - repair suggestions
code:
  - src/cli.ts
  - src/commands/last.ts
  - src/commands/doctor.ts
  - src/commands/bootstrap.ts
  - src/commands/status.ts
  - src/commands/step.ts
  - src/commands/verify.ts
  - src/commands/plan.ts
  - src/commands/addSkill.ts
  - src/core/mutations.ts
  - src/core/doctor.ts
  - src/core/agentSkills.ts
  - src/core/schemas.ts
tests:
  - src/cli.test.ts
  - src/core/agentSkills.test.ts
  - src/core/mutations.test.ts
  - src/core/doctor.test.ts
depends_on:
  - JS-005
  - JS-011
  - JS-015
refs:
  - type: related_to
    id: JS-005
    note: Doctor should extend audit from graph validity into practical post-mutation diagnostics.
  - type: related_to
    id: JS-015
    note: Mutation summaries need stable machine output contracts.
plan:
  task_id: JS-018
  goal: Add post-mutation visibility through a durable local last-mutation summary and a doctor command that turns audit state into agent-friendly diagnostics and repair suggestions.
  status: complete
  steps:
    - id: orient
      outcome: Existing mutation commands, audit behavior, schema contracts, config/index paths, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/commands/bootstrap.ts
        - src/commands/status.ts
        - src/commands/step.ts
        - src/commands/verify.ts
        - src/commands/plan.ts
        - src/commands/addSkill.ts
        - src/commands/audit.ts
        - src/core/config.ts
        - src/core/atomicWrite.ts
      tests:
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-018 --json
        - node dist/cli.js related JS-018 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context JS-018, related JS-018, audit, and repo reads to map mutation points and audit/schema patterns.
    - id: mutation-summary-core
      outcome: Shared core helpers write and read an atomic generated last-mutation summary with command, timestamp, touched files, task IDs, config/index changes, and warnings.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/mutations.ts
        - src/core/config.ts
        - src/core/atomicWrite.ts
      tests:
        - src/core/mutations.test.ts
      checks:
        - npm test -- src/core/mutations.test.ts
      evidence:
        - Added src/core/mutations.ts with atomic .jumpspace/last-mutation.json recording, readLastMutation, and human rendering. Added src/core/mutations.test.ts. Verified npm test -- src/core/mutations.test.ts passed.
    - id: mutation-hooks
      outcome: Existing mutation commands record truthful summaries after successful source/config/index mutations without recording failed or dry-run operations.
      status: complete
      depends_on:
        - mutation-summary-core
      source_files:
        - src/commands/bootstrap.ts
        - src/commands/status.ts
        - src/commands/step.ts
        - src/commands/verify.ts
        - src/commands/plan.ts
        - src/commands/addSkill.ts
      tests:
        - src/cli.test.ts
      checks:
        - npm test -- src/cli.test.ts
      evidence:
        - Added recordMutation hooks to plan save, step complete, status, verify, bootstrap apply, and add-skill. Dry-run bootstrap apply and unchanged skill installs do not record mutations. Verified npm test -- src/core/mutations.test.ts src/core/doctor.test.ts src/cli.test.ts passed, and npm run build passed.
    - id: last-doctor-cli
      outcome: The CLI exposes jumpspace last and jumpspace doctor in human and JSON modes, with doctor separating errors, warnings, and repair suggestions.
      status: complete
      depends_on:
        - mutation-hooks
      source_files:
        - src/cli.ts
        - src/commands/last.ts
        - src/commands/doctor.ts
        - src/core/doctor.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
        - src/core/doctor.test.ts
      checks:
        - npm test -- src/core/doctor.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js schema show last --json
        - node dist/cli.js schema show doctor --json
      evidence:
        - Added jumpspace last and jumpspace doctor commands, wired them into src/cli.ts, added src/core/doctor.ts diagnostics, added last/doctor schema contracts, and added CLI/core tests. Verified npm test -- src/core/mutations.test.ts src/core/doctor.test.ts src/cli.test.ts passed, npm run build passed, node dist/cli.js last --json returned ok true, node dist/cli.js doctor --json returned ok true, and schema show last/doctor --json returned ok true.
    - id: docs-final
      outcome: README, spec text, templates, tests, build, scan, audit, schema, last, and doctor smokes pass with limitations recorded.
      status: complete
      depends_on:
        - last-doctor-cli
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/agentSkills.test.ts
        - src/core/doctor.test.ts
        - src/core/mutations.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js last --json
        - node dist/cli.js plan validate JS-018 --json
      evidence:
        - "Updated README.md, docs/specs/jumpspace-v0.md, src/templates/AGENTS.md, src/templates/SKILL.md, and src/core/agentSkills.ts to document jumpspace last and doctor plus the work-first agent flow. Final verification passed: npm test passed (26 files, 89 tests), npm run build passed, node dist/cli.js scan indexed 24 tasks, audit --json returned ok true, doctor --json returned ok true with no errors/warnings/suggestions, last --json returned ok true, and plan validate JS-018 --json returned ok true."
acceptance_criteria:
  - id: AC-1
    description: Mutation commands record a local operation summary containing command name, timestamp, touched files, inserted or updated task IDs, config changes, index changes, and warnings.
  - id: AC-2
    description: "`jumpspace last` prints the most recent mutation summary in human-readable and JSON formats."
  - id: AC-3
    description: "`jumpspace doctor` checks heading references, missing linked paths, stale index state, duplicate task IDs, duplicate ambiguous headings, unsupported config globs, and ignored generated paths."
  - id: AC-4
    description: Doctor output separates blocking errors, factual warnings, and suggested repairs.
  - id: AC-5
    description: Both commands publish JSON schemas and use the standard error envelope.
-->

Jumpspace should make every mutation easy to verify after the fact. After bootstrap apply, status changes, step completion, skill installation, or future repair commands, users and agents should be able to ask what changed and whether the graph is still healthy. `jumpspace last` reads the generated `.jumpspace/last-mutation.json` summary for the most recent successful mutation. `jumpspace doctor` wraps audit, duplicate-heading checks, config-glob checks, ignored-path checks, the last mutation summary, and suggested repairs while keeping blocking errors, factual warnings, and recommendations separate.

### Self-healing drift

<!-- jumpspace
id: JS-019
type: spec
status: implemented
module: maintenance
space: repo
keywords:
  - self-healing drift
  - repair
  - git rename
  - gaps
  - stale links
code:
  - src/cli.ts
  - src/commands/repair.ts
  - src/commands/doctor.ts
  - src/core/repair.ts
  - src/core/changed.ts
  - src/core/drift.ts
  - src/core/doctor.ts
  - src/core/metadata.ts
  - src/core/mutations.ts
  - src/core/types.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/core/repair.test.ts
  - src/core/doctor.test.ts
  - src/core/parseMarkdown.test.ts
  - src/core/validateTasks.test.ts
gaps: []
depends_on:
  - JS-011
  - JS-018
refs:
  - type: related_to
    id: JS-011
    note: Existing changed and drift detection should become the factual input to repair mode.
  - type: related_to
    id: JS-018
    note: Repairs should be visible through last mutation summaries and doctor checks.
plan:
  task_id: JS-019
  goal: Add local self-healing drift repair that can preview and apply safe linked-file repairs, while preserving ambiguous rot as explicit task gaps and surfacing unapplied opportunities through doctor.
  status: complete
  steps:
    - id: orient
      outcome: Existing changed, drift, metadata mutation, doctor, schema, and CLI patterns are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/core/changed.ts
        - src/core/drift.ts
        - src/core/metadata.ts
        - src/core/doctor.ts
        - src/commands/drift.ts
        - src/commands/changed.ts
        - src/commands/doctor.ts
        - src/core/types.ts
      tests:
        - src/core/changed.test.ts
        - src/core/drift.test.ts
        - src/core/metadata.test.ts
        - src/core/doctor.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-019 --json
        - node dist/cli.js related JS-019 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context/related/audit plus repo reads to map changed/drift metadata, doctor diagnostics, schemas, and CLI integration points.
    - id: gaps-schema
      outcome: Task metadata supports explicit gaps and audit/parse/schema paths preserve them.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/types.ts
        - src/core/parseMarkdown.ts
        - src/core/validateTasks.ts
        - src/core/schemas.ts
      tests:
        - src/core/parseMarkdown.test.ts
        - src/core/validateTasks.test.ts
      checks:
        - npm test -- src/core/parseMarkdown.test.ts src/core/validateTasks.test.ts
      evidence:
        - Added first-class gaps metadata to task parsing/index schema, surfaced gaps as audit warnings, propagated bootstrap proposal gaps, and passed npm test -- src/core/parseMarkdown.test.ts src/core/validateTasks.test.ts.
    - id: repair-core
      outcome: A shared repair planner finds rename fixes and missing/deleted linked-file gaps, and apply mode updates source task blocks atomically.
      status: complete
      depends_on:
        - gaps-schema
      source_files:
        - src/core/repair.ts
        - src/core/changed.ts
        - src/core/metadata.ts
        - src/core/mutations.ts
        - src/core/refreshIndex.ts
      tests:
        - src/core/repair.test.ts
      checks:
        - npm test -- src/core/repair.test.ts
      evidence:
        - Added src/core/repair.ts with dry-run planning and apply mode for git rename path repairs plus deleted/missing linked-file gaps; passed npm test -- src/core/repair.test.ts.
    - id: repair-cli-doctor
      outcome: CLI exposes dry-run/apply repair mode with schema output, and doctor can surface unapplied repair opportunities from a supplied Git ref.
      status: complete
      depends_on:
        - repair-core
      source_files:
        - src/cli.ts
        - src/commands/repair.ts
        - src/commands/doctor.ts
        - src/core/doctor.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
        - src/core/doctor.test.ts
      checks:
        - npm test -- src/core/repair.test.ts src/core/doctor.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js schema show repair --json
      evidence:
        - Added jumpspace repair --since <ref> [--apply], doctor --since <ref> repair opportunity reporting, repair JSON schema, CLI integration tests, doctor tests, and passed npm test -- src/core/repair.test.ts src/core/doctor.test.ts src/cli.test.ts; npm run build; node dist/cli.js schema show repair --json.
    - id: docs-final
      outcome: README, spec text, templates, build, tests, scan, audit, doctor, repair smoke, and plan validation pass with truthful limitations recorded.
      status: complete
      depends_on:
        - repair-cli-doctor
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/cli.test.ts
        - src/core/repair.test.ts
        - src/core/doctor.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-019 --json
      evidence:
        - Updated README, spec, agent templates, and generated skill guidance for repair workflow; passed npm test (27 files, 95 tests), npm run build, node dist/cli.js scan, node dist/cli.js audit --json, node dist/cli.js doctor --json, node dist/cli.js plan validate JS-019 --json, and node dist/cli.js schema show repair --json.
acceptance_criteria:
  - id: AC-1
    description: Drift repair detects git renames and updates task code, tests, and source references from old paths to new paths with atomic writes.
  - id: AC-2
    description: Deleted or missing linked files create explicit task gaps instead of silently dropping evidence.
  - id: AC-3
    description: Repair mode supports dry-run and apply modes with structured JSON output.
  - id: AC-4
    description: Mechanical fixes are separated from heuristic recommendations.
  - id: AC-5
    description: Audit and doctor can detect unapplied repair opportunities after changed files are reported.
-->

Jumpspace drift should not only report rot. For obvious mechanical changes, such as git renames, `jumpspace repair --since <ref>` previews graph repairs and `jumpspace repair --since <ref> --apply` atomically updates task metadata. For ambiguous or destructive cases, deleted or missing linked code/test files are removed from active links and preserved as explicit `gaps` for human review. `jumpspace doctor --since <ref>` surfaces unapplied repair opportunities without making Git a requirement for ordinary doctor runs.

### Graph query command

<!-- jumpspace
id: JS-020
type: spec
status: implemented
module: graph
space: repo
keywords:
  - graph query
  - multi-hop
  - structured query
  - dependencies
  - refs
code:
  - src/cli.ts
  - src/commands/query.ts
  - src/core/graphQuery.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/core/graphQuery.test.ts
gaps: []
depends_on:
  - JS-008
  - JS-009
  - JS-015
refs:
  - type: related_to
    id: JS-008
    note: Structured refs, modules, spaces, acceptance criteria, and verification records should power graph queries.
  - type: related_to
    id: JS-009
    note: Query should complement find and related with higher-signal graph filtering.
plan:
  task_id: JS-020
  goal: Add a deterministic graph query command that can answer structured multi-hop task questions without ad hoc grep, with stable JSON output and clear errors.
  status: complete
  steps:
    - id: orient
      outcome: Existing graph/search/relation code, schema contracts, CLI conventions, and JS-020 dependencies are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/taskRelations.ts
        - src/core/searchTasks.ts
        - src/core/types.ts
        - src/core/schemas.ts
        - src/commands/related.ts
        - src/cli.ts
      tests:
        - src/core/taskRelations.test.ts
        - src/core/searchTasks.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-020 --json
        - node dist/cli.js related JS-020 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, proposed-task list, and audit to confirm JS-020 scope, dependencies, and roadmap position.
    - id: query-core
      outcome: Core graph query evaluator supports deterministic filters for status, type, module, space, direct/transitive dependencies, refs, linked code/tests, acceptance criteria, verification state, and gaps.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/graphQuery.ts
        - src/core/types.ts
      tests:
        - src/core/graphQuery.test.ts
      checks:
        - npm test -- src/core/graphQuery.test.ts
      evidence:
        - Added src/core/graphQuery.ts with deterministic graph filters for status/type/module/space, direct and transitive dependencies, refs, inbound refs, linked code/tests, acceptance criteria, verification records, and gaps; passed npm test -- src/core/graphQuery.test.ts.
    - id: query-cli-schema
      outcome: CLI exposes jumpspace query with human and JSON output, stable schema contract, structured errors, and representative integration coverage.
      status: complete
      depends_on:
        - query-core
      source_files:
        - src/commands/query.ts
        - src/cli.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
      checks:
        - npm test -- src/core/graphQuery.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js schema show query --json
      evidence:
        - "Added jumpspace query CLI with deterministic filters, human and JSON output, structured errors, query schema publication, CLI tests, and compiled smoke checks: npm test -- src/core/graphQuery.test.ts src/cli.test.ts, npm run build, node dist/cli.js schema show query --json, and node dist/cli.js query --module graph --json."
    - id: docs-final
      outcome: README, spec, templates, scan, audit, doctor, plan validation, and full tests reflect graph query behavior and limitations.
      status: complete
      depends_on:
        - query-cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/core/graphQuery.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-020 --json
      evidence:
        - "Updated README, spec, agent templates, and generated skill guidance for jumpspace query; final verification passed: npm test (28 files, 101 tests), npm run build, node dist/cli.js scan, audit --json, doctor --json, plan validate JS-020 --json, schema show query --json, query --depends-on-transitive JS-015 --no-tests --json, and query --where unknown=value --json returned UNKNOWN_QUERY_FIELD."
acceptance_criteria:
  - id: AC-1
    description: "`jumpspace query` can answer structured graph questions about dependencies, refs, modules, spaces, statuses, linked code, linked tests, acceptance criteria, and verification state."
  - id: AC-2
    description: The command supports JSON output that returns task lists, matched graph paths, filters applied, and unanswered constraints.
  - id: AC-3
    description: Common queries such as tasks depending on an ADR with no tests linked are possible without ad hoc grep.
  - id: AC-4
    description: Query behavior is deterministic and documented before any natural-language query layer is added.
  - id: AC-5
    description: Unknown fields, unsupported relations, and ambiguous query terms produce structured errors.
-->

Jumpspace should expose graph questions that grep cannot answer. `jumpspace query` is deterministic and structured, focused on dependencies, transitive dependencies, refs, status, modules, spaces, linked code, linked tests, acceptance criteria, verification, and gaps. It intentionally uses explicit flags and `--where field=value` predicates before any natural-language query layer, returning applied filters, matched task lists, matched graph paths, and unanswered constraints.

### PR bot and CI repair loop

<!-- jumpspace
id: JS-021
type: spec
status: implemented
module: ci
space: repo
keywords:
  - pr bot
  - ci
  - github action
  - repair loop
  - suggestions
code:
  - src/cli.ts
  - src/commands/ci.ts
  - src/core/ci.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/core/ci.test.ts
gaps: []
depends_on:
  - JS-016
  - JS-018
  - JS-019
  - JS-020
refs:
  - type: related_to
    id: JS-016
    note: First-run and CI setup should work in messy real repositories.
  - type: related_to
    id: JS-019
    note: The bot should propose or apply safe drift repairs.
plan:
  task_id: JS-021
  goal: Add a local CI/PR report command that aggregates scan, audit, doctor, drift, repair opportunities, graph queries, and source-backed suggestion drafts without requiring hosted services.
  status: complete
  steps:
    - id: orient
      outcome: JS-021 dependencies, current CI-adjacent commands, schemas, and tests are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/commands/changed.ts
        - src/commands/drift.ts
        - src/commands/doctor.ts
        - src/commands/repair.ts
        - src/commands/query.ts
        - src/core/changed.ts
        - src/core/drift.ts
        - src/core/doctor.ts
        - src/core/repair.ts
        - src/core/graphQuery.ts
        - src/core/bootstrap.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
        - src/core/repair.test.ts
        - src/core/graphQuery.test.ts
      checks:
        - node dist/cli.js context JS-021 --json
        - node dist/cli.js related JS-021 --json
        - node dist/cli.js query --depends-on-transitive JS-020 --no-tests --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, graph query, and audit to confirm JS-021 scope and dependency readiness.
    - id: ci-core
      outcome: Core CI report builder runs scan-equivalent indexing, audit, doctor, drift, repair planning, default graph queries, and deterministic PR suggestions from changed Markdown/code/test files.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/ci.ts
        - src/core/changed.ts
        - src/core/drift.ts
        - src/core/doctor.ts
        - src/core/repair.ts
        - src/core/graphQuery.ts
      tests:
        - src/core/ci.test.ts
      checks:
        - npm test -- src/core/ci.test.ts
      evidence:
        - Added src/core/ci.ts local CI report builder that refreshes the index, runs audit/doctor/drift/repair planning, default graph queries, and deterministic task-block suggestions from changed Markdown plus touched code/test paths; passed npm test -- src/core/ci.test.ts.
    - id: ci-cli-schema
      outcome: CLI exposes jumpspace ci --since <ref> with human/JSON output, standard errors, schema contract, and integration coverage.
      status: complete
      depends_on:
        - ci-core
      source_files:
        - src/commands/ci.ts
        - src/cli.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
      checks:
        - npm test -- src/core/ci.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js schema show ci --json
      evidence:
        - Added jumpspace ci --since <ref> with --query and --json support, registered the ci JSON schema, and covered the CLI path with integration tests. Passed npm test -- src/core/ci.test.ts src/cli.test.ts, npm run build, and node dist/cli.js schema show ci --json.
    - id: docs-final
      outcome: README, spec, templates, tests, build, scan, audit, doctor, schema, CI smoke, and plan validation pass.
      status: complete
      depends_on:
        - ci-cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-021 --json
      evidence:
        - "Updated README, roadmap/spec text, static agent templates, and generated agent skill guidance for jumpspace ci. Full verification passed: npm test (29 files, 103 tests), npm run build, node dist/cli.js scan, node dist/cli.js audit --json, node dist/cli.js doctor --json, and node dist/cli.js plan validate JS-021 --json. The CLI integration test exercises jumpspace ci in a temp Git repo with rename, Markdown, code, and test changes."
acceptance_criteria:
  - id: AC-1
    description: A CI mode runs scan, audit, doctor, drift, and selected graph queries against a supplied base ref.
  - id: AC-2
    description: PR output drafts suggested Jumpspace blocks for new documentation headings using diff evidence and touched code or test paths.
  - id: AC-3
    description: PR output proposes link repairs for moved, renamed, deleted, staged, unstaged, and untracked files where evidence is sufficient.
  - id: AC-4
    description: The bot comments with proposed patches or structured repair packets instead of only failing.
  - id: AC-5
    description: The first implementation is local and CI friendly, with GitHub Action integration optional rather than required by the core CLI.
-->

Jumpspace should lower the maintenance tax to nearly zero. `jumpspace ci --since <ref>` is the local first implementation of the PR-bot loop: it refreshes the index, runs audit, doctor, drift, repair planning, and graph queries, drafts task blocks from changed Markdown headings plus touched code/test paths, and emits either a Markdown PR comment or a structured JSON packet. Hosted GitHub Action integration can build on this command later; the core value is reviewable suggestions without requiring hosted services.

### Bootstrap propose

<!-- jumpspace
id: JS-022
type: spec
status: implemented
module: bootstrap
space: repo
keywords:
  - bootstrap propose
  - first graph
  - proposal
  - approval
  - messy repo
code:
  - src/cli.ts
  - src/commands/bootstrap.ts
  - src/core/bootstrap.ts
  - src/core/bootstrapPropose.ts
  - src/core/bootstrapProposal.ts
  - src/core/schemas.ts
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/cli.test.ts
  - src/commands/bootstrap.test.ts
  - src/core/bootstrap.test.ts
  - src/core/bootstrapPropose.test.ts
gaps: []
depends_on:
  - JS-013
  - JS-016
  - JS-017
refs:
  - type: related_to
    id: JS-013
    note: Bootstrap propose should build on the existing context, validate, and apply workflow.
  - type: related_to
    id: JS-016
    note: Proposal generation should start from discovered doc globs rather than hard-coded docs paths.
plan:
  task_id: JS-022
  goal: Add a deterministic bootstrap propose command that creates reviewable proposal drafts from discovered docs and context, while preserving the human approval boundary before apply.
  status: complete
  steps:
    - id: orient
      outcome: Existing bootstrap discover/context/validate/apply, schema, CLI, tests, and JS-022 dependencies are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/cli.ts
        - src/commands/bootstrap.ts
        - src/core/bootstrap.ts
        - src/core/bootstrapProposal.ts
        - src/core/discovery.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
        - src/commands/bootstrap.test.ts
        - src/core/bootstrap.test.ts
        - src/core/bootstrapProposal.test.ts
      checks:
        - node dist/cli.js context JS-022 --json
        - node dist/cli.js related JS-022 --json
        - node dist/cli.js plan review JS-022
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, plan review, and repo reads to confirm JS-022 scope, dependencies, and bootstrap architecture.
    - id: propose-core
      outcome: A shared proposal builder turns discovered docs and bootstrap context into deterministic draft tasks, skipped headings, citations, confidence, gaps, and explicit extraction metadata.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/bootstrapPropose.ts
        - src/core/bootstrap.ts
        - src/core/bootstrapProposal.ts
      tests:
        - src/core/bootstrapPropose.test.ts
        - src/core/bootstrap.test.ts
      checks:
        - npm test -- src/core/bootstrapPropose.test.ts src/core/bootstrap.test.ts
      evidence:
        - Added src/core/bootstrapPropose.ts deterministic proposal builder, extended bootstrap context with own_excerpt and descendant_excerpt, fixed own-section task detection so descendant task blocks do not mark ancestors as already tracked, and passed npm test -- src/core/bootstrapPropose.test.ts src/core/bootstrap.test.ts.
    - id: propose-cli-schema
      outcome: CLI exposes jumpspace bootstrap propose with human/JSON output, optional proposal-file writing, stable schema output, and integration coverage.
      status: complete
      depends_on:
        - propose-core
      source_files:
        - src/commands/bootstrap.ts
        - src/cli.ts
        - src/core/schemas.ts
      tests:
        - src/commands/bootstrap.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/bootstrapPropose.test.ts src/commands/bootstrap.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js schema show bootstrap.propose --json
      evidence:
        - Added jumpspace bootstrap propose [paths...] [--file <proposal-file>] with human and JSON output, non-destructive proposal-file writing, schema bootstrap.propose, command tests, and CLI integration coverage. Passed npm test -- src/core/bootstrapPropose.test.ts src/commands/bootstrap.test.ts src/cli.test.ts, npm run build, and node dist/cli.js schema show bootstrap.propose --json.
    - id: docs-final
      outcome: README, spec, agent templates, full tests, build, scan, audit, doctor, proposal validate/dry-run smoke, and plan validation pass.
      status: complete
      depends_on:
        - propose-cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/core/bootstrapPropose.test.ts
        - src/commands/bootstrap.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-022 --json
      evidence:
        - "Updated README, JS-022 spec text, static agent templates, and generated agent skill guidance for bootstrap propose. Full verification passed: npm test (30 files, 106 tests), npm run build, node dist/cli.js scan, node dist/cli.js audit --json, node dist/cli.js doctor --json, node dist/cli.js plan validate JS-022 --json, and node dist/cli.js schema show bootstrap.propose --json. Built-CLI smoke in /private/tmp/jumpspace-js022-smoke passed: bootstrap propose README.md --file proposal.json --json generated a valid proposal, bootstrap validate --file proposal.json --json returned ok true, and bootstrap apply --file proposal.json --dry-run --json returned would_insert for DOC-740C250C."
acceptance_criteria:
  - id: AC-1
    description: "`jumpspace bootstrap propose` creates a proposal packet or draft proposal file from discovered docs, existing task IDs, heading evidence, and linked-file hints."
  - id: AC-2
    description: The command clearly separates deterministic extraction from any agent-generated reasoning.
  - id: AC-3
    description: Proposed tasks include source path, heading, line, level, parent headings, citations, confidence, skipped-heading reasons, and unanswered gaps.
  - id: AC-4
    description: The proposal can be validated, dry-run applied, and applied through the existing bootstrap validation boundary.
  - id: AC-5
    description: Human approval remains required before mutating source Markdown.
-->

Jumpspace bootstrap should become a first-class flow rather than a pile of separate commands. `jumpspace bootstrap propose [paths...] --file <proposal-file> --json` creates a deterministic draft proposal from discovered docs or supplied paths, clearly labels the output as `mode: deterministic_extraction`, and writes only proposal JSON for the existing validate/apply boundary. Agents can use the draft as evidence to improve task boundaries, but human approval remains required before apply mutates source Markdown.

### Typed SDKs and schema packages

<!-- jumpspace
id: JS-023
type: spec
status: implemented
module: agent-contracts
space: repo
keywords:
  - sdk
  - typescript
  - python
  - json schema
  - typed client
code:
  - src/sdk/index.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/__init__.py
  - sdk/python/jumpspace_sdk/contracts.py
  - sdk/python/pyproject.toml
  - package.json
  - .npmignore
  - .gitignore
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
gaps: []
depends_on:
  - JS-015
refs:
  - type: related_to
    id: JS-015
    note: SDKs should be generated from or kept consistent with the schema catalog.
plan:
  task_id: JS-023
  goal: Publish first-class TypeScript and Python SDK contract surfaces backed by the Jumpspace schema catalog so agents and integrations stop guessing JSON shapes.
  status: complete
  steps:
    - id: orient
      outcome: JS-023 scope, JS-015 dependency, current schema catalog, package layout, and build/test constraints are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/schemas.ts
        - src/commands/schema.ts
        - package.json
        - tsconfig.json
        - docs/specs/jumpspace-v0.md
      tests:
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-023 --json
        - node dist/cli.js related JS-023 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, query, audit, and repo reads to confirm JS-023 depends on implemented JS-015 and should build on the existing schema catalog.
    - id: typescript-sdk
      outcome: TypeScript SDK exports versioned contract metadata, command result types, schema lookup helpers, error guards, and is tested against the live schema catalog.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/sdk/index.ts
        - src/sdk/contracts.ts
        - package.json
      tests:
        - src/sdk/contracts.test.ts
      checks:
        - npm test -- src/sdk/contracts.test.ts
        - npm run build
      evidence:
        - Added src/sdk TypeScript SDK exports with JUMPSPACE_CONTRACT_VERSION, schema-name constants, typed command result aliases, schema helpers, and error guards; package.json now exposes jumpspace and jumpspace/sdk from dist/sdk. Passed npm test -- src/sdk/contracts.test.ts and npm run build.
    - id: python-sdk
      outcome: Python SDK package exposes dataclass models, schema-name constants, error helpers, and tests that compare against the TypeScript schema catalog.
      status: complete
      depends_on:
        - typescript-sdk
      source_files:
        - sdk/python/jumpspace_sdk/__init__.py
        - sdk/python/jumpspace_sdk/contracts.py
        - sdk/python/pyproject.toml
      tests:
        - sdk/python/tests/test_contracts.py
      checks:
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - Added sdk/python/jumpspace_sdk pure-stdlib dataclass contract package with schema constants, command dataclasses, and error helpers, plus pyproject metadata and unittest coverage comparing SCHEMA_NAMES to node dist/cli.js schema list --json. Passed python3 -m unittest discover -s sdk/python/tests.
    - id: docs-final
      outcome: README, spec, agent templates, package metadata, full tests, build, scan, audit, doctor, and plan validation reflect SDK usage and limitations.
      status: complete
      depends_on:
        - python-sdk
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - package.json
        - .npmignore
        - .gitignore
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-023 --json
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run
      evidence:
        - "Updated README, JS-023 spec text, agent templates, generated skill guidance, package exports, package file list, and ignore rules for SDK usage. Final verification passed: npm test (31 files, 109 tests), python3 -m unittest discover -s sdk/python/tests (3 tests), npm run build, built SDK import smoke for getSdkSchema('bootstrap.propose'), env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run with dist/sdk and sdk/python source included and no pycache packaged, node dist/cli.js scan, node dist/cli.js audit --json, node dist/cli.js doctor --json, and node dist/cli.js plan validate JS-023 --json."
acceptance_criteria:
  - id: AC-1
    description: A TypeScript package exposes typed command result shapes for stable JSON commands.
  - id: AC-2
    description: A Python package exposes equivalent typed models or dataclasses for stable JSON commands.
  - id: AC-3
    description: SDK types are generated from or tested against the published schema catalog.
  - id: AC-4
    description: Versioned contracts make breaking JSON output changes explicit.
  - id: AC-5
    description: Agent guidance points tool builders to the SDKs instead of encouraging ad hoc JSON parsing.
-->

Agents and integrations should not reverse-engineer JSON by trial and error. Jumpspace now publishes a first contract SDK surface: TypeScript consumers can import versioned schema names, command result types, schema helpers, and error guards from `@jumpspace/cli/sdk`; Python consumers can use the pure-stdlib dataclass package in `sdk/python/jumpspace_sdk`. Both SDKs are tested against `jumpspace schema list --json` so contract drift becomes explicit instead of becoming agent guesswork.

### Package artifact hygiene

<!-- jumpspace
id: JS-025
type: engineering
status: implemented
module: packaging
space: repo
keywords:
  - package
  - build
  - dist
  - npm
  - artifacts
code:
  - package.json
  - .npmignore
  - .gitignore
tests:
  - src/packageHygiene.test.ts
gaps: []
depends_on:
  - JS-023
refs:
  - type: related_to
    id: JS-023
    note: SDK publishing needs package contents to exclude generated caches and stale build artifacts.
plan:
  task_id: JS-025
  goal: Ensure clean builds and npm packaging exclude stale dist test artifacts and generated Python caches while keeping SDK package files included.
  status: complete
  steps:
    - id: orient
      outcome: Package dry-run, build scripts, ignore rules, and SDK package files are mapped.
      status: complete
      depends_on: []
      source_files:
        - package.json
        - .npmignore
        - .gitignore
      tests: []
      checks:
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run
        - node dist/cli.js audit --json
      evidence:
        - npm pack --dry-run showed SDK files are included but stale dist test files can remain when dist is not cleaned before build; audit was clean.
    - id: clean-build
      outcome: npm build cleans dist before compiling and package metadata keeps generated Python caches out of npm packaging.
      status: complete
      depends_on:
        - orient
      source_files:
        - package.json
        - .npmignore
        - .gitignore
      tests:
        - src/packageHygiene.test.ts
      checks:
        - npm test -- src/packageHygiene.test.ts
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run
      evidence:
        - Updated package.json so npm run build runs npm run clean before tsc, using Node fs.rmSync to remove dist. Tightened package files and ignore rules for Python caches and added src/packageHygiene.test.ts. Verified npm test -- src/packageHygiene.test.ts and npm run build passed, rg --files dist | rg '\.test\.' found no compiled test artifacts, and env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run included dist/sdk plus sdk/python source with no pycache files and no dist *.test.* artifacts.
    - id: final-verify
      outcome: Full tests, build, package dry-run, scan, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - clean-build
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - src/packageHygiene.test.ts
      checks:
        - npm test
        - npm run build
        - python3 -m unittest discover -s sdk/python/tests
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-025 --json
      evidence:
        - "Final verification passed: npm test -- src/packageHygiene.test.ts (1 test), npm test (32 files, 110 tests), npm run build with clean dist, python3 -m unittest discover -s sdk/python/tests (3 tests), rg --files dist | rg '\\.test\\.' found no compiled test files, npm pack --dry-run --json package-content check returned 198 files with SDK files present and no pycache or dist test artifacts, node dist/cli.js scan indexed 25 tasks, node dist/cli.js audit --json returned ok true, node dist/cli.js doctor --json returned ok true, and node dist/cli.js plan validate JS-025 --json returned ok true."
acceptance_criteria:
  - id: AC-1
    description: The build process removes stale dist artifacts before compiling.
  - id: AC-2
    description: npm pack dry-run includes the SDK contract files but excludes compiled test files and Python cache files.
  - id: AC-3
    description: Generated Python cache files are ignored by Git and npm packaging.
  - id: AC-4
    description: Existing tests, build, scan, audit, and doctor remain clean.
-->

Jumpspace packages should feel boringly trustworthy. Clean builds should not preserve stale compiled tests, and package dry-runs should show only intentional runtime, SDK, template, and documentation files.

### Task-vector graph retrieval

<!-- jumpspace
id: JS-024
type: spec
status: implemented
module: retrieval
space: repo
keywords:
  - task vectors
  - graph expansion
  - embeddings
  - lancedb
  - onnx
code:
  - src/core/semanticIndex.ts
  - src/core/ask.ts
  - src/commands/semantic.ts
  - src/core/schemas.ts
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/semanticIndex.test.ts
  - src/core/ask.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-012
  - JS-017
  - JS-020
refs:
  - type: supersedes
    id: JS-012
    note: This narrows semantic retrieval toward task embeddings plus graph expansion instead of generic docs embeddings.
  - type: related_to
    id: JS-020
    note: Retrieval should expand vector matches through explicit graph relationships.
plan:
  task_id: JS-024
  goal: Add task-vector graph expansion so semantic retrieval returns connected task evidence rather than flat ranked matches.
  status: complete
  steps:
    - id: orient
      outcome: JS-024 scope, dependencies, semantic index implementation, graph query code, ask behavior, CLI schemas, SDK contracts, and docs are mapped.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
        - src/core/semanticIndex.ts
        - src/core/ask.ts
        - src/commands/semantic.ts
        - src/core/graphQuery.ts
        - src/core/schemas.ts
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/ask.test.ts
        - src/core/graphQuery.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-024 --json
        - node dist/cli.js related JS-024 --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
      evidence:
        - "Orientation complete: JS-024 depends on implemented JS-012, JS-017, and JS-020. Current semantic retrieval returns task-vector matches but only lightweight graph reason strings; ask reports retrieval sources but not connected graph expansion paths."
    - id: graph-core
      outcome: Semantic retrieval can expand candidate tasks through direct dependencies, dependents, refs, inbound refs, supersession chains, shared modules, and shared spaces with explicit graph path objects.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/semanticIndex.ts
        - src/core/taskRelations.ts
        - src/core/types.ts
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/taskRelations.test.ts
      checks:
        - npm test -- src/core/semanticIndex.test.ts src/core/taskRelations.test.ts
      evidence:
        - Implemented semantic graph expansion in src/core/semanticIndex.ts. Semantic hits now include graph_expansion paths and connected_tasks through dependencies, dependents, refs, inbound refs, supersedes/superseded_by, supersession chains, modules, and non-repo spaces. Verified npm test -- src/core/semanticIndex.test.ts src/core/ask.test.ts src/core/taskRelations.test.ts passed (10 tests) and npm run build passed.
    - id: ask-cli-schema
      outcome: Semantic search and ask expose graph expansion paths in JSON/human output, schemas, and SDK contracts without changing find defaults.
      status: complete
      depends_on:
        - graph-core
      source_files:
        - src/core/ask.ts
        - src/commands/semantic.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - sdk/python/jumpspace_sdk/__init__.py
      tests:
        - src/core/ask.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test -- src/core/ask.test.ts src/cli.test.ts src/sdk/contracts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js schema show semantic.search --json
        - node dist/cli.js ask "task vector graph retrieval" --json
      evidence:
        - Semantic search and ask now expose graph_expansion and connected_tasks in JSON and human output. Verified npm test -- src/core/ask.test.ts src/core/semanticIndex.test.ts src/cli.test.ts src/sdk/contracts.test.ts passed (26 tests), python3 -m unittest discover -s sdk/python/tests passed, npm run build passed, schema show semantic.search requires graph_expansion and connected_tasks, semantic search 'task vector graph retrieval' returned JS-024 with graph paths to JS-012/JS-017/JS-020, and hybrid ask returned JS-024 evidence with graph paths.
    - id: docs-guidance
      outcome: README and agent guidance explain task-vector graph expansion, generated local fallback behavior, and when to prefer semantic search, ask, or query.
      status: complete
      depends_on:
        - ask-cli-schema
      source_files:
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
      evidence:
        - Updated README, static AGENTS/SKILL templates, generated agent skill guidance, and JS-024 roadmap metadata to document semantic graph_expansion paths, connected_tasks, and when to use semantic search, ask, or deterministic query. Added proposed roadmap tasks JS-026 hosted PR assistant, JS-027 link suggestion ergonomics, JS-028 task lifecycle/orphan handling, JS-029 generated schema packages, and JS-030 pluggable local embeddings. Verified npm test -- src/core/agentSkills.test.ts passed (3 tests), node dist/cli.js scan indexed 30 tasks, node dist/cli.js find 'hosted PR assistant' --mode any --json returned JS-026, and audit/doctor reported only the expected stale semantic-index warning after docs changed.
    - id: final-verify
      outcome: Full tests, build, scan, semantic rebuild, semantic search, hybrid ask, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-guidance
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/ask.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js semantic search "task vector graph retrieval" --json
        - node dist/cli.js ask "Which tasks connect semantic retrieval to graph query?" --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-024 --json
      evidence:
        - "Final verification passed: npm run build passed, npm test passed (33 files, 118 tests), python3 -m unittest discover -s sdk/python/tests passed (3 tests), node dist/cli.js scan indexed 30 tasks, node dist/cli.js semantic build --json built 30 semantic documents with local-task-vector-v1 fallback, semantic search 'task vector graph retrieval' returned JS-024 with graph_expansion and connected_tasks (JS-030 ranked top after the new embeddings roadmap task), hybrid ask 'Which tasks connect semantic retrieval to graph query?' returned JS-024 evidence with graph paths, find 'hosted PR assistant' --mode any returned JS-026 as top result, audit --json returned ok true with no issues, doctor --json returned ok true with no warnings, and plan validate JS-024 --json returned ok true."
acceptance_criteria:
  - id: AC-1
    description: The semantic index embeds Jumpspace tasks, summaries, keywords, acceptance criteria, and linked snippets rather than raw docs alone.
  - id: AC-2
    description: Retrieval combines lexical matches, task-vector matches, and graph expansion through dependencies, refs, supersession chains, modules, and spaces.
  - id: AC-3
    description: Ask reports retrieval source, match reasons, graph expansion paths, coverage, unanswered terms, paths, and task IDs.
  - id: AC-4
    description: The vector backend is optional, local, generated under .jumpspace, and degrades gracefully when dependencies are unavailable.
  - id: AC-5
    description: Audit or doctor detects stale semantic indexes separately from blocking graph errors.
-->

If Jumpspace adds vectors, the differentiator should be task-vector plus graph retrieval, not generic docs search. Semantic matching should find candidate tasks, then graph expansion should explain the connected evidence an agent can trust.

### Hosted PR assistant

<!-- jumpspace
id: JS-026
type: spec
status: implemented
module: ci
space: repo
keywords:
  - pr bot
  - github action
  - review comment
  - suggestions
  - approval
code:
  - src/core/prAssistant.ts
  - src/commands/pr.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - schemas/catalog.json
  - schemas/pr.comment.schema.json
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - docs/specs/jumpspace-v0.md
tests:
  - src/core/prAssistant.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-019
  - JS-021
  - JS-022
  - JS-023
refs:
  - type: related_to
    id: JS-021
    note: The hosted assistant should wrap the local ci packet rather than inventing a second PR analysis path.
  - type: related_to
    id: JS-019
    note: Review comments should include safe repair suggestions and explicit gaps for deleted or missing files.
plan:
  task_id: JS-026
  goal: Add a local PR assistant wrapper over the existing CI packet that produces idempotent review comments, reviewable suggestions, mutation guardrails, schemas, and visible failure comments without hosted-service dependencies.
  status: complete
  steps:
    - id: orient
      outcome: Existing CI report, repair suggestions, task-block suggestions, CLI wiring, schemas, SDK tests, and agent guidance are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/core/ci.ts
        - src/commands/ci.ts
        - src/cli.ts
        - src/core/schemas.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-026 --json
        - node dist/cli.js related JS-026 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context/related/audit and focused repo reads to confirm JS-026 should wrap the implemented local ci packet rather than adding a second PR analysis path.
    - id: assistant-core
      outcome: Core PR assistant builder wraps buildCiReport, emits idempotent review-comment metadata, reviewable task-block/repair/gap suggestions, mutation policy, schema names, and failure comment payloads.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/prAssistant.ts
        - src/core/ci.ts
      tests:
        - src/core/prAssistant.test.ts
      checks:
        - npm test -- src/core/prAssistant.test.ts
      evidence:
        - Added src/core/prAssistant.ts as a review-only local PR assistant builder over buildCiReport. It emits idempotency marker/fingerprint metadata, mutation policy, schema references, flattened review items for task blocks/repairs/gaps with evidence, and human-readable success/failure comments. Added src/core/prAssistant.test.ts covering idempotent reruns, no-mutation policy, review item evidence, repair command suggestions, and structured failure comments. Verified npm test -- src/core/prAssistant.test.ts passed (1 file, 2 tests).
    - id: cli-schema
      outcome: CLI exposes jumpspace pr comment --since <ref> with human/JSON output, standard errors, schema contract, and SDK contract lockstep.
      status: complete
      depends_on:
        - assistant-core
      source_files:
        - src/commands/pr.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test -- src/core/prAssistant.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - "Added jumpspace pr comment --since <ref> [--json], pr.comment schema catalog entry, generated schema artifacts, TS/Python SDK schema names, and CLI/schema coverage. Verification: npm run generate:schemas passed; npm test -- src/core/prAssistant.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts passed 4 files/23 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests."
    - id: docs-guidance
      outcome: README, spec, and agent guidance document the local PR assistant workflow, human approval boundary, idempotency marker, and failure-comment behavior.
      status: complete
      depends_on:
        - cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - "Updated README, JS-026 roadmap prose, static AGENTS/SKILL templates, generated agent skill guidance, and agent skill tests to document jumpspace pr comment --since <ref> as a local idempotent review-only handoff comment with human approval boundary. Escaped the literal PR marker in Markdown prose after scan caught it as invalid metadata. Verification: npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests; node dist/cli.js scan indexed 30 tasks cleanly."
    - id: final-verify
      outcome: Full tests, Python tests, schema generation, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-guidance
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/prAssistant.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-026 --json
      evidence:
        - "Final verification passed: npm run generate:schemas built dist and generated 26 schema artifacts; npm test passed 36 files/128 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json included dist/commands/pr.*, dist/core/prAssistant.*, schemas/catalog.json, schemas/pr.comment.schema.json, SDK files, and templates; node dist/cli.js scan indexed 30 tasks; node dist/cli.js semantic build --json built 30 documents with expected local-task-vector-v1 fallback because optional LanceDB/ONNX dependencies are not installed; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings; plan validate JS-026 --json returned ok true. Jumpspace verify was not run because this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: A GitHub Action or local bot wrapper runs the existing Jumpspace CI packet against a supplied base ref.
  - id: AC-2
    description: The assistant drafts task blocks, code/test links, drift repairs, and gaps as reviewable suggestions with cited evidence.
  - id: AC-3
    description: The assistant never mutates protected branches or user-authored docs without explicit human approval.
  - id: AC-4
    description: Bot output is idempotent across reruns and uses the published JSON schemas or SDK contract helpers.
  - id: AC-5
    description: Failure modes are visible as structured errors plus a useful human PR comment.
-->

The "discipline tax goes to zero" version of Jumpspace is a PR assistant that drafts graph maintenance instead of asking humans to remember it. The first shipped shape is intentionally local and thin: `jumpspace pr comment --since <ref>` runs the local CI packet, converts suggestions into an idempotent review-only comment with the `&lt;!-- jumpspace-pr-assistant:v1 --&gt;` marker, cites evidence for task blocks, repairs, and gaps, and leaves posting plus approval with a human or wrapper.

### CI workflow installer

<!-- jumpspace
id: JS-031
type: engineering
status: implemented
module: ci
space: repo
keywords:
  - ci installer
  - github actions
  - pr assistant
  - workflow template
  - idempotent setup
code:
  - src/core/ciWorkflow.ts
  - src/commands/init.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - schemas/catalog.json
  - schemas/init.ci.schema.json
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/templates/jumpspace.yml
  - src/templates/pull_request_template.md
  - src/core/agentSkills.ts
tests:
  - src/core/ciWorkflow.test.ts
  - src/commands/init.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-021
  - JS-026
  - JS-029
refs:
  - type: related_to
    id: JS-026
    note: The workflow installer should run the local PR assistant comment packet and upsert a marker-based PR comment.
  - type: related_to
    id: JS-014
    note: CI setup should be additive and non-destructive like agent skill installation.
plan:
  task_id: JS-031
  goal: Add an idempotent CI workflow installer that creates or refreshes a Jumpspace-managed GitHub Actions PR assistant workflow without requiring full repo init.
  status: complete
  steps:
    - id: orient
      outcome: Existing init templates, PR assistant command, CI report, managed-block utilities, mutation summaries, schemas, and docs patterns are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/commands/init.ts
        - src/templates/jumpspace.yml
        - src/core/agentSkills.ts
        - src/core/managedBlocks.ts
        - src/core/prAssistant.ts
        - src/commands/pr.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/commands/init.test.ts
        - src/core/agentSkills.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-031 --json
        - node dist/cli.js related JS-031 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, and audit plus focused repo reads to confirm JS-031 should build on the existing PR assistant and init/template patterns. Audit warning was only stale semantic index after adding the new roadmap task.
    - id: installer-core
      outcome: A core installer creates, updates, dry-runs, and reports a Jumpspace-managed GitHub Actions workflow while preserving unrelated user-authored workflow content.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/ciWorkflow.ts
        - src/templates/jumpspace.yml
      tests:
        - src/core/ciWorkflow.test.ts
      checks:
        - npm test -- src/core/ciWorkflow.test.ts
      evidence:
        - "Added src/core/ciWorkflow.ts idempotent GitHub workflow installer and updated src/templates/jumpspace.yml to the managed PR assistant workflow. The installer creates missing workflow files, updates legacy Jumpspace audit templates, preserves unrelated user-owned workflows with a warning, supports dry-run, and produces a workflow that runs scan, pr comment, audit, and doctor before upserting a marker-based PR comment. Verification: npm test -- src/core/ciWorkflow.test.ts passed 1 file/5 tests."
    - id: cli-init
      outcome: CLI exposes jumpspace init --ci github with human and JSON output, dry-run behavior, mutation summaries, and integration coverage.
      status: complete
      depends_on:
        - installer-core
      source_files:
        - src/commands/init.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
      tests:
        - src/commands/init.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test -- src/core/ciWorkflow.test.ts src/commands/init.test.ts src/cli.test.ts src/sdk/contracts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - npm run generate:schemas
      evidence:
        - "Added jumpspace init --ci github [--dry-run] [--json], wired it to the idempotent CI workflow installer, recorded mutation summaries for real writes, published init.ci schema, updated generated schema artifacts to 27, and added TS/Python SDK schema-name coverage. Verification: npm run generate:schemas passed; npm test -- src/core/ciWorkflow.test.ts src/commands/init.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts passed 5 files/32 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests."
    - id: docs-guidance
      outcome: README, workflow template, spec, and agent guidance explain the CI installer, PR comment marker upsert, dry-run flow, and non-destructive behavior.
      status: complete
      depends_on:
        - cli-init
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/templates/jumpspace.yml
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - "Updated README, JS-031 roadmap prose, static AGENTS/SKILL templates, generated agent skill guidance, pull request template, and src/templates/jumpspace.yml to document jumpspace init --ci github, dry-run preview, marker-based PR comment upsert, and non-destructive workflow behavior. Verification: npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests; node dist/cli.js scan indexed 31 tasks cleanly."
    - id: final-verify
      outcome: Full tests, Python tests, schema generation, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-guidance
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/ciWorkflow.test.ts
        - src/commands/init.test.ts
        - src/cli.test.ts
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-031 --json
      evidence:
        - "Full JS-031 verification passed: npm run generate:schemas generated 27 artifacts and rebuilt dist; npm test passed 37 files/136 tests; npm run build passed; python3 -m unittest discover -s sdk/python/tests passed 3 tests after rebuild; npm pack --dry-run --json passed with 247 files including dist/core/ciWorkflow.js, dist/core/ciWorkflow.d.ts, dist/commands/init.js, schemas/init.ci.schema.json, dist/templates/jumpspace.yml, src/templates/jumpspace.yml, and src/templates/pull_request_template.md, with no dist test files; node dist/cli.js scan indexed 31 tasks; semantic build succeeded with 31 task documents; audit --json, doctor --json, and plan validate JS-031 --json all returned ok true; direct smoke test node dist/cli.js init --ci github --dry-run --json in /private/tmp/jumpspace-ci-smoke-js031 returned ok true and would create .github/workflows/jumpspace.yml."
acceptance_criteria:
  - id: AC-1
    description: A command can install a repo-local GitHub Actions workflow for Jumpspace without requiring full init.
  - id: AC-2
    description: The workflow runs scan, the PR assistant comment command, and audit/doctor checks against the pull-request base ref.
  - id: AC-3
    description: The workflow upserts a PR comment by the Jumpspace assistant marker instead of adding duplicate comments on every run.
  - id: AC-4
    description: "Installation is idempotent and non-destructive: missing files are created, Jumpspace-managed files are updated, and unrelated user-authored workflows are not overwritten."
  - id: AC-5
    description: JSON output and docs tell agents which files changed and how to verify the installed workflow.
-->

Jumpspace becomes easier to recommend when a repo can add the PR assistant loop without hand-copying YAML. `jumpspace init --ci github` creates or refreshes a clearly Jumpspace-managed workflow that produces the local PR comment packet, updates a marker-based PR comment, runs scan/audit/doctor checks, and leaves source edits under human review. `--dry-run --json` lets agents preview the workflow mutation before writing it, and user-owned workflows at the target path are left untouched with a warning.

### Link suggestion ergonomics

<!-- jumpspace
id: JS-027
type: spec
status: implemented
module: graph
space: repo
keywords:
  - links
  - code refs
  - test refs
  - suggest links
  - empty links
code:
  - src/core/taskLinks.ts
  - src/commands/link.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/taskLinks.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
gaps: []
depends_on:
  - JS-017
  - JS-020
  - JS-021
refs:
  - type: related_to
    id: JS-021
    note: PR suggestions need an ergonomic command path for adding or editing linked code and tests.
  - type: related_to
    id: JS-020
    note: Graph queries become more useful when code and test refs are populated consistently.
plan:
  task_id: JS-027
  goal: Add ergonomic task link maintenance so agents can explicitly add or remove code/test/relationship/gap metadata and preview evidence-backed link suggestions.
  status: complete
  steps:
    - id: orient
      outcome: JS-027 scope, dependencies, existing metadata mutation helpers, changed-file parsing, repair suggestions, schemas, CLI conventions, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
        - src/core/metadata.ts
        - src/core/changed.ts
        - src/core/repair.ts
        - src/core/ci.ts
        - src/core/schemas.ts
        - src/cli.ts
      tests:
        - src/core/metadata.test.ts
        - src/core/changed.test.ts
        - src/core/repair.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-027 --json
        - node dist/cli.js related JS-027 --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
      evidence:
        - "Orientation complete: JS-027 depends on implemented JS-017, JS-020, and JS-021. Existing updateTaskMetadata gives atomic source-block writes; changed/ci already classify Git diff files; repair records mutations and gaps. Audit and doctor were clean before implementation."
    - id: link-core
      outcome: Core helpers can plan and apply task metadata link additions/removals for code, tests, dependencies, refs, and gaps with validation and no duplicate values.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/taskLinks.ts
        - src/core/metadata.ts
        - src/core/types.ts
      tests:
        - src/core/taskLinks.test.ts
      checks:
        - npm test -- src/core/taskLinks.test.ts
      evidence:
        - Added src/core/taskLinks.ts and src/core/taskLinks.test.ts. Core helpers plan/apply idempotent add/remove operations for code, tests, depends_on, refs, and gaps; validate missing paths, unknown dependencies, unknown refs, self dependencies, self refs, and invalid ref syntax; and dedupe duplicate inputs. Verified npm test -- src/core/taskLinks.test.ts passed (3 tests).
    - id: link-suggest
      outcome: Suggestion mode proposes code/test link candidates from changed files, task keywords, modules, titles, specs, and existing graph context with match reasons and no mutations.
      status: complete
      depends_on:
        - link-core
      source_files:
        - src/core/taskLinks.ts
        - src/core/changed.ts
      tests:
        - src/core/taskLinks.test.ts
      checks:
        - npm test -- src/core/taskLinks.test.ts
      evidence:
        - Suggestion mode implemented in src/core/taskLinks.ts with candidate scoring from task title/spec/keywords/module, path tokens including camelCase/plural normalization, changed/candidate sources, statuses, code/test classification, already-linked filtering, and no source mutation. Verified npm test -- src/core/taskLinks.test.ts passed and built CLI smoke node dist/cli.js link suggest JS-027 --path src/core/taskLinks.ts --path src/core/taskLinks.test.ts --path src/commands/link.ts --json returned suggestions for the core, command, and test files with match reasons.
    - id: cli-schema
      outcome: CLI exposes jumpspace link and jumpspace link suggest with human/JSON output, dry-run/apply behavior, stable schemas, structured errors, and integration coverage.
      status: complete
      depends_on:
        - link-suggest
      source_files:
        - src/commands/link.ts
        - src/cli.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test -- src/core/taskLinks.test.ts src/cli.test.ts src/sdk/contracts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js schema show link --json
        - node dist/cli.js schema show link.suggest --json
      evidence:
        - Added src/commands/link.ts, wired the link namespace in src/cli.ts, published link and link.suggest schemas in src/core/schemas.ts, and updated TypeScript/Python SDK schema-name lists. CLI integration covers dry-run, apply, remove, missing path errors, invalid ref errors, explicit-path suggestions, and real Git --since suggestions. Verified npm test -- src/core/taskLinks.test.ts src/cli.test.ts src/sdk/contracts.test.ts passed (23 tests), python3 -m unittest discover -s sdk/python/tests passed, npm run build passed, and schema show link/link.suggest --json returned ok true.
    - id: docs-final
      outcome: README, agent guidance, JS-027 metadata, full tests, build, scan, semantic rebuild, audit, doctor, schema smokes, and plan validation pass.
      status: complete
      depends_on:
        - cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - .jumpspace/index.json
      tests:
        - src/core/taskLinks.test.ts
        - src/cli.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-027 --json
      evidence:
        - "Final verification for JS-027 passed: README, static AGENTS/SKILL templates, generated agent skill guidance, and JS-027 metadata now document link suggest/update workflow. Dogfooded link update to add JS-027 code/test/doc links. Verified npm test -- src/core/taskLinks.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts passed (26 tests), python3 -m unittest discover -s sdk/python/tests passed (3 tests), npm run build passed, node dist/cli.js scan indexed 30 tasks, node dist/cli.js semantic build --json built 30 documents, semantic status --json reported ready true and stale false, audit --json returned ok true with no issues, doctor --json returned ok true with no warnings, plan validate JS-027 --json returned ok true, schema show link/link.suggest --json returned ok true, and link suggest JS-027 with unlinked metadata candidates returned non-mutating suggestions."
acceptance_criteria:
  - id: AC-1
    description: A command can atomically add or remove code, test, ref, dependency, and gap metadata for one task.
  - id: AC-2
    description: A suggestion mode proposes code/test links from changed files, task keywords, modules, and nearby docs with match reasons.
  - id: AC-3
    description: Suggestions are never written unless explicitly applied or accepted by a human.
  - id: AC-4
    description: Implemented tasks with empty code or test links are discoverable through doctor, query, or CI output.
  - id: AC-5
    description: JSON output includes stable schemas and structured errors for unknown tasks, missing paths, and ambiguous links.
-->

Bootstrap makes the first graph possible, but daily value depends on keeping linked code and tests populated without ceremony. Jumpspace should make link maintenance feel like a tiny command or a reviewable suggestion, not a hand-edited YAML chore.

### Task lifecycle and orphan handling

<!-- jumpspace
id: JS-028
type: spec
status: implemented
module: lifecycle
space: repo
keywords:
  - orphan
  - heading rename
  - lifecycle
  - deleted docs
  - task identity
code:
  - src/core/types.ts
  - src/core/parseMarkdown.ts
  - src/core/validateTasks.ts
  - src/core/doctor.ts
  - src/core/repair.ts
  - src/core/schemas.ts
  - src/core/agentSkills.ts
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
tests:
  - src/core/parseMarkdown.test.ts
  - src/core/validateTasks.test.ts
  - src/core/doctor.test.ts
  - src/core/repair.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-013
  - JS-015
  - JS-018
  - JS-019
refs:
  - type: related_to
    id: JS-013
    note: Bootstrap-created task blocks need a clear story when source headings are renamed, moved, or deleted.
  - type: related_to
    id: JS-019
    note: Drift repair should distinguish mechanical source moves from semantic task orphaning.
plan:
  task_id: JS-028
  goal: Add task lifecycle safety so source heading identity, duplicate headings, source doc renames/deletions, and orphan risks are visible and repairable instead of silently degrading the graph.
  status: complete
  steps:
    - id: orient
      outcome: Existing parser, bootstrap source identity, validation, doctor, repair, schema, and docs patterns are mapped with Jumpspace context.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/jumpspace-v0.md
        - src/core/parseMarkdown.ts
        - src/core/bootstrap.ts
        - src/core/validateTasks.ts
        - src/core/doctor.ts
        - src/core/repair.ts
        - src/core/schemas.ts
      tests:
        - src/core/parseMarkdown.test.ts
        - src/core/doctor.test.ts
        - src/core/validateTasks.test.ts
      checks:
        - node dist/cli.js context JS-028 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context/audit and focused repo reads to map JS-028 dependencies, bootstrap heading identity, duplicate-heading doctor warnings, validation, and repair behavior.
    - id: source-identity
      outcome: Parsed task docs include source line, heading level, and parent heading chain so agents can disambiguate duplicate titles after scan/context/list/ask.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/types.ts
        - src/core/parseMarkdown.ts
        - src/core/schemas.ts
      tests:
        - src/core/parseMarkdown.test.ts
        - src/core/validateTasks.test.ts
      checks:
        - npm test -- src/core/parseMarkdown.test.ts src/core/validateTasks.test.ts
      evidence:
        - Added task doc source identity fields (line, level, parent_headings) to the model, parser, JSON schema contract, and parser tests. Verified npm test -- src/core/parseMarkdown.test.ts src/core/validateTasks.test.ts passed (2 files, 10 tests).
    - id: lifecycle-diagnostics
      outcome: Audit and doctor report task-level ambiguous source headings and source-doc repair opportunities with actionable suggestions.
      status: complete
      depends_on:
        - source-identity
      source_files:
        - src/core/validateTasks.ts
        - src/core/doctor.ts
        - src/core/repair.ts
      tests:
        - src/core/validateTasks.test.ts
        - src/core/doctor.test.ts
        - src/core/repair.test.ts
      checks:
        - npm test -- src/core/validateTasks.test.ts src/core/doctor.test.ts src/core/repair.test.ts
      evidence:
        - Added audit warning AMBIGUOUS_TASK_HEADING for task blocks that share a source path and heading title, added repair warnings TASK_SOURCE_DOC_RENAMED and TASK_SOURCE_DOC_DELETED for source-doc lifecycle drift, surfaced repair warnings in doctor top-level warnings, and added doctor suggestions DISAMBIGUATE_TASK_HEADING, REFRESH_SOURCE_DOC_RENAME, and RESOLVE_ORPHANED_TASK. Verified npm test -- src/core/validateTasks.test.ts src/core/doctor.test.ts src/core/repair.test.ts passed (3 files, 17 tests).
    - id: docs-guidance
      outcome: README, spec, and generated/static agent guidance document the lifecycle for rename, move, delete, supersede, retire, and duplicate-heading disambiguation.
      status: complete
      depends_on:
        - lifecycle-diagnostics
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - Updated README, JS-028 spec text, static AGENTS/SKILL templates, and generated agent skill guidance to document task source identity, duplicate-heading disambiguation, source-doc rename scan/config review, and source-doc deletion restore/recreate/stale/supersede/gap handling. Verified npm test -- src/core/agentSkills.test.ts passed (1 file, 3 tests), npm run build passed, and node dist/cli.js scan indexed 30 tasks with rebuilt parser source coordinates.
    - id: final-verify
      outcome: Full tests, build, scan, semantic rebuild, audit, doctor, and plan validation pass with truthful limitations recorded.
      status: complete
      depends_on:
        - docs-guidance
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/parseMarkdown.test.ts
        - src/core/validateTasks.test.ts
        - src/core/doctor.test.ts
        - src/core/repair.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - npm test
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-028 --json
      evidence:
        - "Final verification passed before completing this step: npm test passed (34 files, 125 tests) after updating bootstrap expectations for richer doc identity; python3 -m unittest discover -s sdk/python/tests passed (3 tests); npm run build passed; node dist/cli.js scan indexed 30 tasks; node dist/cli.js semantic build --json built 30 documents with expected local-task-vector-v1 fallback because optional LanceDB/ONNX dependencies are not installed; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings; plan validate JS-028 --json returned ok true. Jumpspace verify was not run because this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: Scan, audit, doctor, or repair can detect task blocks whose source heading moved, changed identity, or disappeared.
  - id: AC-2
    description: Heading identity uses enough source structure to avoid title-only ambiguity across duplicate headings.
  - id: AC-3
    description: Mechanical heading moves or path renames can be repaired safely when evidence is exact.
  - id: AC-4
    description: Deleted or semantically ambiguous docs create explicit gaps or orphan warnings instead of silent graph decay.
  - id: AC-5
    description: The lifecycle for rename, move, delete, supersede, and retire is documented for humans and agents.
-->

A small graph only stays trustworthy if tasks have a lifecycle. Renames should not break identity, deleted sections should not vanish silently, and stale source anchors should turn into clear repair opportunities or gaps. Task identity is the task ID; source anchors are evidence coordinates. Indexed tasks now carry `doc.line`, `doc.level`, and `doc.parent_headings` in addition to path and heading title so duplicate headings are not title-only traps. Audit reports `AMBIGUOUS_TASK_HEADING` when task blocks share the same source path and heading title. Doctor surfaces source document lifecycle drift from `doctor --since <ref>`: `TASK_SOURCE_DOC_RENAMED` means scan and review config globs after the move, while `TASK_SOURCE_DOC_DELETED` means restore the doc, recreate the task from surviving evidence, or mark a surviving task stale, superseded, retired, or gap-bearing.

### Generated schema packages

<!-- jumpspace
id: JS-029
type: engineering
status: implemented
module: contracts
space: repo
keywords:
  - sdk
  - schemas
  - generated contracts
  - package
  - codegen
code:
  - src/core/schemas.ts
  - src/commands/schema.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - sdk/python/jumpspace_sdk/__init__.py
  - scripts/generate-schemas.mjs
  - package.json
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - schemas/catalog.json
tests:
  - src/schemaArtifacts.test.ts
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/packageHygiene.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-015
  - JS-023
  - JS-025
refs:
  - type: related_to
    id: JS-023
    note: Current SDKs expose and test contracts, but generated packages would reduce manual drift further.
plan:
  task_id: JS-029
  goal: Generate versioned schema artifacts from the canonical schema catalog and make TypeScript/Python/package checks fail when contracts drift.
  status: complete
  steps:
    - id: orient
      outcome: Existing schema catalog, CLI schema command, SDK contract surfaces, package exports, docs, and tests are mapped through Jumpspace and repo reads.
      status: complete
      depends_on: []
      source_files:
        - src/core/schemas.ts
        - src/commands/schema.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - package.json
        - README.md
      tests:
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/packageHygiene.test.ts
      checks:
        - node dist/cli.js context JS-029 --json
        - node dist/cli.js related JS-029 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context/related/audit plus focused repo search to confirm JS-029 depends on implemented JS-015, JS-023, and JS-025 and should generate artifacts from the existing schemaCatalog rather than inventing a parallel source.
    - id: schema-artifacts
      outcome: A generator exports versioned JSON schema artifacts from the canonical catalog into packageable source-controlled files.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/schemas.ts
        - scripts/generate-schemas.mjs
        - schemas/
        - package.json
      tests:
        - src/schemaArtifacts.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/schemaArtifacts.test.ts
      evidence:
        - Added shared SCHEMA_CONTRACT_VERSION, scripts/generate-schemas.mjs, npm run generate:schemas, package schema JSON exports, and source-controlled schemas/catalog.json plus one *.schema.json artifact per schema from the canonical schemaCatalog. Verified npm run generate:schemas generated 25 schema artifacts and npm test -- src/schemaArtifacts.test.ts passed (1 file, 1 test).
    - id: contract-lockstep
      outcome: TypeScript and Python SDK contract surfaces are mechanically checked against generated schema artifacts and the live catalog.
      status: complete
      depends_on:
        - schema-artifacts
      source_files:
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - sdk/python/tests/test_contracts.py
        - src/sdk/contracts.test.ts
      tests:
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - Updated TypeScript and Python SDK tests so JUMPSPACE_SCHEMA_NAMES/SCHEMA_NAMES are compared against both the live schema catalog and generated schemas/catalog.json, and each generated per-schema artifact is checked for matching contract_version, name, and schema body. Verified npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts passed (2 files, 4 tests) and python3 -m unittest discover -s sdk/python/tests passed (3 tests).
    - id: package-docs
      outcome: Package metadata includes generated schemas intentionally, and README/agent guidance document contract versioning and schema artifact usage.
      status: complete
      depends_on:
        - contract-lockstep
      source_files:
        - package.json
        - .npmignore
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/packageHygiene.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/packageHygiene.test.ts src/core/agentSkills.test.ts
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run
      evidence:
        - Updated package.json exports/files to include generated schema JSON artifacts, README and agent guidance to document jumpspace/schemas/catalog.json and jumpspace/schemas/<name>.schema.json usage, package hygiene tests for schema package contents, and JS-029 roadmap text. Verified npm test -- src/packageHygiene.test.ts src/core/agentSkills.test.ts passed (2 files, 4 tests), and env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json included schemas/catalog.json and all schemas/*.schema.json artifacts.
    - id: final-verify
      outcome: Full tests, Python SDK tests, build, schema generation check, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - package-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - src/packageHygiene.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-029 --json
      evidence:
        - "Final verification passed: npm run generate:schemas built dist and generated 25 schema artifacts; npm test passed (35 files, 126 tests); python3 -m unittest discover -s sdk/python/tests passed (3 tests); npm run build passed; sequential env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json included dist, SDK files, templates, schemas/catalog.json, and all schemas/*.schema.json artifacts; node dist/cli.js scan indexed 30 tasks; node dist/cli.js semantic build --json built 30 documents with expected local-task-vector-v1 fallback because optional LanceDB/ONNX dependencies are not installed; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings; plan validate JS-029 --json returned ok true. Jumpspace verify was not run because this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: The schema catalog can be exported as versioned JSON files for package consumers.
  - id: AC-2
    description: TypeScript and Python contract surfaces are generated from, or mechanically checked against, the schema catalog.
  - id: AC-3
    description: CI fails when command output, schemas, and SDK types drift apart.
  - id: AC-4
    description: Package contents include schemas and SDK helpers without generated caches or stale build artifacts.
  - id: AC-5
    description: Contract versioning and migration notes are documented for agent and integration authors.
-->

The current SDKs stop agents from guessing JSON shapes, but manual contract surfaces still carry drift risk. Jumpspace now generates versioned schema artifacts from the canonical `schemaCatalog`: `schemas/catalog.json` lists every command contract and `schemas/<name>.schema.json` stores each individual schema. The npm package exposes those JSON files alongside `@jumpspace/cli/sdk`, and TypeScript/Python SDK tests compare their schema names against both the live catalog and generated artifacts so contract drift fails loudly in CI. Integrators can choose the CLI schema commands for discovery, SDK helpers for typed app code, or pinned JSON artifacts for language-agnostic tooling.

### Pluggable local embeddings

<!-- jumpspace
id: JS-030
type: spec
status: implemented
module: retrieval
space: repo
keywords:
  - embeddings
  - lancedb
  - onnx
  - semantic backend
  - evaluation
code:
  - src/core/semanticIndex.ts
  - src/commands/semantic.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/core/types.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - sdk/python/jumpspace_sdk/__init__.py
  - schemas/catalog.json
  - schemas/semantic.eval.schema.json
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/semanticIndex.test.ts
  - src/core/ask.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-012
  - JS-024
  - JS-025
refs:
  - type: related_to
    id: JS-024
    note: Real embeddings should preserve the task-vector plus graph-expansion model rather than turning into generic docs search.
plan:
  task_id: JS-030
  goal: Add optional real local embedding backend plumbing while preserving deterministic task-vector graph retrieval and making semantic quality measurable.
  status: complete
  steps:
    - id: orient
      outcome: JS-030 dependencies, current semantic index behavior, schemas, CLI, SDK contracts, docs, and tests are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/core/semanticIndex.ts
        - src/commands/semantic.ts
        - src/core/ask.ts
        - src/core/schemas.ts
        - src/core/types.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/ask.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-030 --json
        - node dist/cli.js related JS-030 --json
        - node dist/cli.js semantic status --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, semantic status, work packet, and audit plus focused code reads for src/core/semanticIndex.ts, src/commands/semantic.ts, src/core/ask.ts, src/core/schemas.ts, src/core/types.ts, package.json, and CLI tests. JS-030 is approved with implemented dependencies JS-012, JS-024, and JS-025. Current semantic backend only detects optional LanceDB/ONNX availability and always builds local-task-vector-v1; semantic status is ready, audit is clean, and next implementation should add explicit backend selection, model/store metadata, async backend-aware search, and evaluation reporting while preserving graph expansion and deterministic fallback.
    - id: backend-core
      outcome: Semantic index build/search supports explicit backend selection, records model/store/degradation metadata, and keeps deterministic fallback when optional LanceDB/ONNX runtime is unavailable.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/semanticIndex.ts
        - src/core/types.ts
      tests:
        - src/core/semanticIndex.test.ts
      checks:
        - npm test -- src/core/semanticIndex.test.ts
      evidence:
        - "Implemented optional semantic backend plumbing in src/core/semanticIndex.ts and config typing in src/core/types.ts. Semantic index metadata now records active/selected backend, model, vector kind, store metadata, optional dependency availability, and degradation reason. Added explicit lancedb-onnx-v1 selection with fake-provider test coverage, deterministic fallback when optional dependencies are unavailable, async backend-aware semantic search, and semantic evaluation core comparing lexical/local/active retrieval. Verification: npm test -- src/core/semanticIndex.test.ts src/core/ask.test.ts passed 2 files/10 tests; npm run build passed."
    - id: cli-eval-schema
      outcome: CLI exposes backend/model selection and a semantic evaluation report with stable JSON schemas and SDK contract coverage.
      status: complete
      depends_on:
        - backend-core
      source_files:
        - src/commands/semantic.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - schemas/catalog.json
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test -- src/core/semanticIndex.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - "Added semantic build --backend/--model/--store-path options, semantic eval CLI report, semantic.eval schema contract, TypeScript/Python SDK schema names and Python eval result export, and regenerated 28 schema artifacts. Verification: npm run generate:schemas passed; npm test -- src/core/semanticIndex.test.ts src/core/ask.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts passed 5 files/32 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; node dist/cli.js semantic build --backend local-task-vector-v1 --json returned ok true with backend selected local-task-vector-v1 and metadata; node dist/cli.js schema show semantic.eval --json returned ok true; node dist/cli.js semantic eval --json returned 3 queries with lexical/local/active hits."
    - id: docs-guidance
      outcome: README, roadmap spec, and agent guidance explain optional backend selection, local-only constraints, degradation behavior, and semantic eval usage.
      status: complete
      depends_on:
        - cli-eval-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - "Updated README, JS-030 roadmap prose, static AGENTS/SKILL templates, and generated agent skill guidance to explain backend selection, local-only LanceDB/ONNX usage, model/store metadata, degraded fallback, semantic eval, and graph-preserving retrieval. Verification: npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests; npm run build passed; node dist/cli.js scan indexed 31 tasks cleanly."
    - id: final-verify
      outcome: Full tests, Python tests, schema generation, build, package dry-run, scan, semantic rebuild/eval, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-guidance
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/semanticIndex.test.ts
        - src/core/ask.test.ts
        - src/cli.test.ts
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js semantic eval --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-030 --json
      evidence:
        - "Full JS-030 verification passed: npm run generate:schemas generated 28 artifacts and rebuilt dist; npm test passed 37 files/139 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json passed with 248 files including dist/core/semanticIndex.js, dist/commands/semantic.js, schemas/semantic.eval.schema.json, schemas/catalog.json, and sdk/python/jumpspace_sdk/contracts.py, with no dist test files; node dist/cli.js scan indexed 31 tasks; node dist/cli.js semantic build --backend auto --json and node dist/cli.js semantic build --json both returned ok true with active local-task-vector-v1, selected auto, degraded true, and the truthful optional LanceDB/ONNX missing reason; semantic status --json returned ready true stale false; semantic eval --json returned 3 queries with lexical/local/active hits all 3; semantic search 'task vector graph retrieval' --json returned JS-030/JS-024 evidence with graph_expansion and connected_tasks; audit --json and doctor --json returned ok true with no issues; plan validate JS-030 --json returned ok true. Jumpspace verify was not run because this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: A local optional embedding backend can be installed and selected without making semantic retrieval a required dependency.
  - id: AC-2
    description: Generated semantic index metadata records backend, model, index version, source hash, and degraded fallback reason.
  - id: AC-3
    description: Retrieval still returns task IDs, graph expansion paths, connected tasks, coverage, and unanswered terms.
  - id: AC-4
    description: A small evaluation fixture compares lexical, deterministic task-vector, and real embedding recall on conceptual queries.
  - id: AC-5
    description: No hosted vector service is required for the first implementation.
-->

Real local embeddings are useful only if they amplify the graph. The backend stays optional and local: `jumpspace semantic build` defaults to deterministic `local-task-vector-v1`, while `jumpspace semantic build --backend lancedb+onnx --model <local-model>` explicitly selects dense local embeddings when the optional runtime is installed. Generated index metadata records active and selected backend, model, vector kind, local store, source hash, optional dependency availability, and degraded fallback reason. Retrieval still returns task IDs, paths, graph expansion, connected tasks, coverage, and unanswered terms; `jumpspace semantic eval --json` compares lexical, deterministic task-vector, and active semantic recall so agents can tell whether the semantic layer is helping.

### Serialized metadata mutations

<!-- jumpspace
id: JS-032
type: engineering
status: implemented
module: core-cli
space: repo
keywords:
  - mutation lock
  - concurrency
  - atomic writes
  - agent safety
code:
  - src/core/mutationLock.ts
  - src/core/metadata.ts
  - src/core/errors.ts
  - src/commands/status.ts
  - src/commands/plan.ts
  - src/commands/step.ts
  - src/commands/verify.ts
  - src/core/taskLinks.ts
  - src/core/repair.ts
  - src/cli.ts
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/mutationLock.test.ts
  - src/core/metadata.test.ts
  - src/core/repair.test.ts
  - src/cli.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-010
  - JS-011
  - JS-018
refs:
  - type: related_to
    id: JS-011
    note: Atomic writes protect file replacement, but task metadata commands still need serialized read-modify-write protection.
plan:
  task_id: JS-032
  goal: Serialize task metadata read-modify-write operations through a repo-local mutation lock so concurrent agent commands cannot lose each other's changes.
  status: complete
  steps:
    - id: orient
      outcome: Existing metadata mutation paths, atomic write behavior, error envelope conventions, and tests are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - src/core/metadata.ts
        - src/core/atomicWrite.ts
        - src/core/errors.ts
        - src/commands/status.ts
        - src/commands/plan.ts
        - src/commands/step.ts
        - src/commands/verify.ts
        - src/core/taskLinks.ts
        - src/core/repair.ts
      tests:
        - src/core/metadata.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-032 --json
        - node dist/cli.js related JS-032 --json
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, work/plan validation, and audit plus focused reads of src/core/metadata.ts, src/core/atomicWrite.ts, src/core/errors.ts, src/commands/status.ts, src/commands/plan.ts, src/commands/step.ts, src/commands/verify.ts, src/core/taskLinks.ts, src/core/repair.ts, and existing metadata/mutation tests. JS-032 is approved with implemented dependencies JS-010, JS-011, and JS-018. Current atomicWriteFile protects replacement but updateTaskMetadata still performs unprotected read-modify-write over Markdown, so commands sharing updateTaskMetadata are the right coverage point.
    - id: lock-core
      outcome: A repo-local mutation lock serializes metadata updates, times out with structured errors, and can recover bounded stale locks.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/mutationLock.ts
        - src/core/metadata.ts
      tests:
        - src/core/mutationLock.test.ts
        - src/core/metadata.test.ts
      checks:
        - npm test -- src/core/mutationLock.test.ts src/core/metadata.test.ts
      evidence:
        - "Added src/core/mutationLock.ts with repo-local exclusive lock file .jumpspace/locks/mutation.lock, timeout handling via structured MUTATION_LOCK_TIMEOUT errors, bounded stale lock recovery, and automatic cleanup. Wrapped updateTaskMetadata in the lock so task-block read-modify-write operations serialize through the shared helper. Added tests proving lock serialization, timeout error shape, stale lock recovery, and concurrent metadata updates preserving both status and keyword changes. Verification: npm test -- src/core/mutationLock.test.ts src/core/metadata.test.ts passed 2 files/6 tests; npm run build passed."
    - id: command-coverage
      outcome: Status, plan save, step complete, verify, link update, and repair inherit serialized task metadata writes and expose lock timeouts through the standard JSON error envelope.
      status: complete
      depends_on:
        - lock-core
      source_files:
        - src/commands/status.ts
        - src/commands/plan.ts
        - src/commands/step.ts
        - src/commands/verify.ts
        - src/core/taskLinks.ts
        - src/core/repair.ts
        - src/cli.ts
      tests:
        - src/cli.test.ts
        - src/core/metadata.test.ts
        - src/core/repair.test.ts
      checks:
        - npm test -- src/core/mutationLock.test.ts src/core/metadata.test.ts src/core/repair.test.ts src/cli.test.ts
        - npm run build
      evidence:
        - "Status, plan save, step complete, verify, link update, and repair all inherit the shared updateTaskMetadata lock; no per-command custom lock path was needed. Added CLI coverage that holds .jumpspace/locks/mutation.lock and verifies status JS-100 partial --json returns the standard ok:false/errors envelope with MUTATION_LOCK_TIMEOUT. Existing repair and CLI mutation paths remain covered through focused tests. Verification: npm test -- src/core/mutationLock.test.ts src/core/metadata.test.ts src/core/repair.test.ts src/cli.test.ts passed 4 files/29 tests; npm run build had already passed after the lock integration."
    - id: docs-links
      outcome: README, roadmap, and agent guidance document mutation serialization, and JS-032 links point at the implemented files and tests.
      status: complete
      depends_on:
        - command-coverage
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - Updated README.md, docs/specs/jumpspace-v0.md, src/templates/AGENTS.md, src/templates/SKILL.md, and src/core/agentSkills.ts to document repo-local mutation serialization, MUTATION_LOCK_TIMEOUT, and the read-vs-mutation agent workflow. Added generated skill coverage in src/core/agentSkills.test.ts. Verified npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests, npm run build passed, node dist/cli.js scan indexed 32 tasks, and link update JS-032 recorded code/test links for the mutation lock implementation, command surfaces, docs, and tests.
    - id: final-verify
      outcome: Full tests, Python tests, schema generation, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-links
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/mutationLock.test.ts
        - src/core/metadata.test.ts
        - src/cli.test.ts
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-032 --json
      evidence:
        - Final JS-032 verification passed. npm run generate:schemas generated 28 schema artifacts and rebuilt dist; npm test initially exposed a tight 5s timeout in the CLI schema contract test, so src/cli.test.ts now gives that subprocess-heavy test 10 seconds, and the rerun passed 38 files/144 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json passed and the inspected manifest had 251 files with dist/core/mutationLock.js, dist/core/mutationLock.d.ts, schemas/catalog.json, schemas/semantic.eval.schema.json, sdk/python/jumpspace_sdk/contracts.py, and no dist test files; node dist/cli.js scan indexed 32 tasks; semantic build --json built 32 documents with expected local-task-vector-v1 degraded fallback because optional LanceDB/ONNX dependencies are not installed; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings or suggestions; plan validate JS-032 --json returned ok true; next JS-032 --json returned only final-verify before this completion.
acceptance_criteria:
  - id: AC-1
    description: Task metadata mutation commands serialize read-modify-write operations through a repo-local lock.
  - id: AC-2
    description: Concurrent mutation attempts either wait safely or fail with a structured MUTATION_LOCK_TIMEOUT error.
  - id: AC-3
    description: Stale lock recovery is bounded, observable, and avoids corrupting source Markdown.
  - id: AC-4
    description: Status, plan save, step complete, verify, link update, and repair metadata writes are covered.
  - id: AC-5
    description: Tests reproduce two concurrent metadata updates and prove both changes survive.
-->

Agents can run independent reads in parallel, but source metadata mutations need serialization. Atomic replacement alone does not prevent two commands from reading the same old Markdown block and overwriting each other's changes. Jumpspace now makes the safe path automatic with the repo-local `.jumpspace/locks/mutation.lock` file around task-block read-modify-write commands. Status changes, plan saves, step completion, verification records, link updates, and repair-applied metadata updates share the same lock, return structured `MUTATION_LOCK_TIMEOUT` errors when the lock cannot be acquired, and recover stale locks after a bounded interval.

### OSS launch hygiene and write-side schemas

<!-- jumpspace
id: JS-033
type: engineering
status: implemented
module: package-contracts
space: repo
keywords:
  - oss launch
  - package metadata
  - executable bin
  - write-side schemas
code:
  - package.json
  - package-lock.json
  - LICENSE
  - scripts/fix-bin-mode.mjs
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/packageHygiene.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-015
  - JS-023
  - JS-029
refs:
  - type: related_to
    id: JS-015
    note: Agent-grade contracts need to cover mutation commands, not only read-oriented packets.
plan:
  task_id: JS-033
  goal: Make Jumpspace OSS-launch ready enough for local/npm-linked agent use by fixing package metadata, executable bin output, and missing write-side JSON schema contracts.
  status: complete
  steps:
    - id: orient
      outcome: Current package metadata, bin mode, schema catalog, SDK contract lists, and write-side command JSON shapes are mapped.
      status: complete
      depends_on: []
      source_files:
        - package.json
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - src/cli.ts
        - src/commands/plan.ts
        - src/commands/status.ts
        - src/commands/verify.ts
        - src/commands/step.ts
        - src/commands/ready.ts
        - src/commands/next.ts
        - src/commands/execute.ts
      tests:
        - src/packageHygiene.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - node dist/cli.js context JS-033 --json
        - node dist/cli.js schema list --json
        - ls -l dist/cli.js package.json LICENSE
      evidence:
        - Oriented with Jumpspace and focused repo reads. Current package.json is version 0.0.0 and lacks license, repository, homepage, bugs, and keywords; LICENSE is missing; dist/cli.js is mode -rw-r--r--; schema list lacks write-side contracts for plan.review/plan.save/plan.show/plan.validate/step.complete/verify/status/ready/next/execute; SDK schema-name lists mirror the missing schema catalog; command JSON shapes were mapped from src/commands/plan.ts, status.ts, verify.ts, step.ts, ready.ts, next.ts, and execute.ts. Audit/doctor were clean before implementation.
    - id: package-hygiene
      outcome: package.json and LICENSE are launch-ready, and build output marks dist/cli.js executable.
      status: complete
      depends_on:
        - orient
      source_files:
        - package.json
        - LICENSE
        - scripts/fix-bin-mode.mjs
      tests:
        - src/packageHygiene.test.ts
      checks:
        - npm run build
        - ls -l dist/cli.js
        - npm test -- src/packageHygiene.test.ts
      evidence:
        - "Updated package.json to version 0.1.0 with launch-ready license metadata, keywords, repository, bugs, homepage, and LICENSE in package files; added LICENSE; added scripts/fix-bin-mode.mjs and wired build to chmod dist/cli.js. JS-051 later finalized the policy as Apache-2.0 for Jumpspace Core with NOTICE and TRADEMARKS.md covering the company-controlled Jumpspace name/logo. Verification passed: npm run build passed, ls -l dist/cli.js showed -rwxr-xr-x, ./dist/cli.js --help printed help successfully, and npm test -- src/packageHygiene.test.ts passed 1 file/1 test."
    - id: write-schema-contracts
      outcome: Write-side commands publish schemas and SDK schema-name lists cover them in TypeScript and Python.
      status: complete
      depends_on:
        - package-hygiene
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - schemas/catalog.json
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test -- src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - node dist/cli.js schema show plan.save --json
        - node dist/cli.js schema show step.complete --json
        - node dist/cli.js schema show verify --json
      evidence:
        - "Added schema catalog entries for plan.review, plan.save, plan.show, plan.validate, ready, execute, next, step.complete, status, and verify; updated TypeScript SDK schema names and write-side result aliases; updated Python SCHEMA_NAMES; regenerated schema artifacts. Verification passed: npm run generate:schemas generated 38 artifacts; npm test -- src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts passed 3 files/23 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; schema show plan.save, step.complete, and verify returned ok true with expected required fields."
    - id: docs-links
      outcome: README, roadmap, and agent guidance mention launch contracts, write-side schemas, and JS-033 links point to implementation and tests.
      status: complete
      depends_on:
        - write-schema-contracts
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - "Updated README examples and schema documentation to include write-side schema discovery for plan.save, step.complete, verify, and related commands; updated static AGENTS/SKILL templates and generated src/core/agentSkills.ts guidance to tell agents write-side schemas are published; added agentSkills regression assertions for plan.save/step.complete guidance; linked JS-033 to package, schema, SDK, docs, and test files. Verification passed: npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests; node dist/cli.js scan indexed 34 tasks."
    - id: final-verify
      outcome: Full tests, Python tests, build, package dry-run, scan, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-links
      source_files:
        - .jumpspace/index.json
      tests:
        - src/packageHygiene.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-033 --json
      evidence:
        - "Final JS-033 verification passed: npm run generate:schemas generated 38 schema artifacts and rebuilt executable dist; npm test passed 38 files/144 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json produced jumpspace 0.1.0 with 262 files, included LICENSE, schemas/plan.save.schema.json, schemas/step.complete.schema.json, schemas/verify.schema.json, sdk/python/jumpspace_sdk/contracts.py, no dist test files, and dist/cli.js mode 493 (0755); node dist/cli.js scan indexed 34 tasks; semantic build --json refreshed 34 documents with expected local-task-vector-v1 fallback; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings or suggestions; plan validate JS-033 --json returned ok true; schema list --json includes plan.review, plan.save, plan.show, plan.validate, ready, execute, next, step.complete, status, and verify."
acceptance_criteria:
  - id: AC-1
    description: package.json has launch-ready version, license, repository, homepage, bugs, and keywords metadata, and a LICENSE file is included in the package.
  - id: AC-2
    description: Build output makes dist/cli.js executable so local npm link and direct bin execution do not fail with permission denied.
  - id: AC-3
    description: schema list/show and generated artifacts include plan.review, plan.save, plan.show, plan.validate, step.complete, verify, status, ready, next, and execute.
  - id: AC-4
    description: TypeScript and Python SDK schema-name contracts include the new write-side schema names.
  - id: AC-5
    description: Tests and package dry-run cover metadata, executable bin mode, schema artifacts, SDK contracts, and generated schema count.
-->

Jumpspace should be installable and scriptable like a serious OSS CLI before public launch. Package metadata should not look like a private prototype, the generated bin should be executable after build, and agent-facing schemas should cover write-side commands as well as read packets. Agents should not need to guess the JSON shape for plan save/show/validate, step complete, status, verify, ready, next, or execute.

### Evidence-ranked link suggestions

<!-- jumpspace
id: JS-034
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - link suggest
  - pr bot
  - scoring
  - evidence ranking
code:
  - src/core/taskLinks.ts
  - src/commands/link.ts
  - src/core/ci.ts
  - src/core/prAssistant.ts
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/taskLinks.test.ts
  - src/cli.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-021
  - JS-027
  - JS-030
refs:
  - type: related_to
    id: JS-021
    note: The PR assistant is only useful if suggested task links are ranked by evidence, not by changed-file presence alone.
  - type: related_to
    id: JS-027
    note: Link suggestion ergonomics need a quality floor so agents can trust proposed links.
plan:
  task_id: JS-034
  goal: Make link suggestions and PR-bot candidates evidence-ranked instead of changed-file-ranked, so agents are not handed unrelated files with empty matched terms.
  status: complete
  steps:
    - id: orient
      outcome: Current link suggestion candidate collection, scoring, CLI output, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/commands/link.ts
        - src/core/taskLinks.ts
        - src/core/ci.ts
        - src/core/prAssistant.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-034 --json
        - node dist/cli.js related JS-034 --json
      evidence:
        - "Used Jumpspace context/related and focused reads of src/commands/link.ts, src/core/taskLinks.ts, src/core/ci.ts, src/core/prAssistant.ts, and existing task link tests. Current scorer tokenizes task intent and candidate path only, then adds score for statuses and sources; that means changed/untracked candidates can be suggested with matched_terms: [] and only status/source reasons. runLinkSuggest collects changed files but does not read local file content, so generic paths cannot match task intent through file body evidence."
    - id: scoring-core
      outcome: Suggestion scoring uses path/content intent matches as evidence, and changed-file status/source cannot create zero-match recommendations.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/taskLinks.ts
        - src/commands/link.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/taskLinks.test.ts src/cli.test.ts
      evidence:
        - "Updated src/core/taskLinks.ts so suggestions require matched task-intent evidence from path or content before status/source/test bonuses are applied; match reasons now distinguish path:<term> and content:<term>, and zero matched_terms candidates are dropped. Updated src/commands/link.ts to read bounded local candidate content (64KB, non-binary files) before scoring. Updated core and CLI tests for path matches, content-only matches, and unrelated untracked files. Verification passed: npm test -- src/core/taskLinks.test.ts src/cli.test.ts passed 2 files/22 tests."
    - id: docs-links
      outcome: README, roadmap, and agent guidance explain evidence-ranked link suggestions, and JS-034 links point to implementation and tests.
      status: complete
      depends_on:
        - scoring-core
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - "Updated README and agent guidance templates to document that changed-file status is candidate context, not proof, and link suggestions should include path/content matched terms with path:<term> or content:<term> reasons. Updated generated src/core/agentSkills.ts guidance and tests. Linked JS-034 to scorer, CLI, PR/CI surfaces, docs, and tests. Verification passed: npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests; node dist/cli.js scan indexed 34 tasks."
    - id: final-verify
      outcome: Focused scorer tests, full tests, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-links
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/taskLinks.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/taskLinks.test.ts src/cli.test.ts
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-034 --json
      evidence:
        - "Final JS-034 verification passed: focused npm test -- src/core/taskLinks.test.ts src/cli.test.ts passed 2 files/22 tests; npm test passed 38 files/144 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json produced jumpspace 0.1.0 with 262 files, included dist/commands/link.js and dist/core/taskLinks.js, no dist test files, and dist/cli.js mode 493 (0755); node dist/cli.js scan indexed 34 tasks; semantic build --json refreshed 34 documents with expected local-task-vector-v1 fallback; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings or suggestions; plan validate JS-034 --json returned ok true; next JS-034 --json returned only final-verify before this completion."
acceptance_criteria:
  - id: AC-1
    description: link suggest never recommends a code/test candidate with empty matched_terms unless another explicit evidence field explains the match.
  - id: AC-2
    description: Candidate scoring uses task intent terms against both path tokens and bounded file-content tokens for local files.
  - id: AC-3
    description: Changed-file status and source metadata can break ties but cannot create a recommendation by themselves.
  - id: AC-4
    description: PR comment/link suggestion output explains whether matches came from path, content, module, or test classification.
  - id: AC-5
    description: Unit and CLI tests cover unrelated untracked files, content-only matches, path matches, and test-file classification.
-->

The PR assistant workflow is only as trustworthy as its ranking. A changed file is a candidate, not evidence. Link suggestions should require an actual match between task intent and file path or file content, then use changed-file source/status as secondary context. This keeps the bot from saying "approve any touched file" when it has no reason to connect the file to the task.

### Mutation history command

<!-- jumpspace
id: JS-035
type: engineering
status: implemented
module: maintenance
space: repo
keywords:
  - mutation history
  - session trail
  - audit trail
  - last mutation
code:
  - src/core/mutations.ts
  - src/commands/history.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - sdk/python/jumpspace_sdk/__init__.py
  - schemas/catalog.json
  - schemas/history.schema.json
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/mutations.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-018
  - JS-032
  - JS-033
refs:
  - type: related_to
    id: JS-018
    note: The existing last mutation summary answers only what happened most recently; agents also need a task/session trail.
  - type: related_to
    id: JS-032
    note: Metadata mutation serialization should protect generated mutation history writes from races.
plan:
  task_id: JS-035
  goal: Add a durable mutation history so agents and humans can inspect the generated trail of Jumpspace mutations by session or task, not just the most recent mutation.
  status: complete
  steps:
    - id: orient
      outcome: Existing mutation summary hooks, last command, schema surfaces, SDK schema-name lists, and agent guidance are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/mutations.ts
        - src/commands/last.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/mutations.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - node dist/cli.js ask "what mutation summary history exists" --json
        - node dist/cli.js context JS-035 --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
      evidence:
        - Used Jumpspace audit, doctor, ask, scan, and focused source reads. Audit and doctor were clean; ask identified JS-018 as the existing last-mutation anchor and left history unanswered. Current recordMutation writes only .jumpspace/last-mutation.json; last command exposes only the latest summary; schema/SDK/agent guidance expose last but no history command. JS-035 was added to docs/specs/jumpspace-v0.md, scanned into the graph, and plan save persisted this execution plan.
    - id: history-core
      outcome: recordMutation writes both last-mutation and append-only JSONL history, with read/render helpers supporting task filters and limits.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/mutations.ts
      tests:
        - src/core/mutations.test.ts
      checks:
        - npm test -- src/core/mutations.test.ts
      evidence:
        - "Updated src/core/mutations.ts with MUTATION_HISTORY_PATH, append-only .jumpspace/mutations.jsonl recording, readMutationHistory, renderMutationHistory, newest-first ordering, task filtering, limits, and mutation-lock protected writes. Preserved last-mutation behavior. Verification passed: npm test -- src/core/mutations.test.ts passed 1 file/6 tests."
    - id: history-cli-schema
      outcome: jumpspace history exposes human and JSON output, CLI wiring, schema catalog/artifacts, and TypeScript/Python SDK schema names.
      status: complete
      depends_on:
        - history-core
      source_files:
        - src/commands/history.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - schemas/catalog.json
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test -- src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - "Added src/commands/history.ts and wired jumpspace history [--task <id>] [--limit <n>] [--json] into src/cli.ts. Added history JSON schema, shared mutation summary schema, TypeScript LastCommandResult/HistoryCommandResult and schema-name contract, Python SCHEMA_NAMES/HistoryResult export, and regenerated schemas/history.schema.json plus schemas/catalog.json. Verification passed: npm run generate:schemas generated 39 artifacts; npm test -- src/core/mutations.test.ts src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts passed 4 files/29 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests."
    - id: docs-links
      outcome: README, roadmap, and agent guidance explain mutation history, and JS-035 links point to implementation and tests.
      status: complete
      depends_on:
        - history-cli-schema
      source_files:
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts
        - node dist/cli.js scan
      evidence:
        - "Updated README, src/templates/AGENTS.md, src/templates/SKILL.md, and src/core/agentSkills.ts to describe jumpspace history as the task/session trail alongside last. Added agent skill regression assertions for history guidance. Linked JS-035 to history implementation, schema artifacts, SDK surfaces, docs, templates, and tests through link update after a dry-run preview. Verification passed: npm test -- src/core/agentSkills.test.ts passed 1 file/3 tests; node dist/cli.js scan indexed 35 tasks."
    - id: final-verify
      outcome: Focused tests, full tests, Python tests, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - docs-links
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/mutations.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-035 --json
      evidence:
        - "Final JS-035 verification passed: npm run generate:schemas generated 39 schema artifacts and rebuilt dist; npm test passed 38 files/147 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json produced jumpspace 0.1.0 with 266 files, included dist/commands/history.js, dist/core/mutations.js, schemas/history.schema.json, SDK Python files, no dist test files, and dist/cli.js mode 493 (0755); node dist/cli.js scan indexed 35 tasks; semantic build --json refreshed 35 documents with expected local-task-vector-v1 fallback; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings or suggestions; plan validate JS-035 --json returned ok true; schema show history --json returned ok true with required fields ok/history_path/total/returned/filters/entries; history --task JS-035 --limit 10 --json returned 3 entries before final-step completion."
acceptance_criteria:
  - id: AC-1
    description: recordMutation still writes .jumpspace/last-mutation.json and also appends every successful mutation summary to .jumpspace/mutations.jsonl.
  - id: AC-2
    description: jumpspace history supports human-readable output plus --json, --limit, and --task filters with newest-first entries, total count, returned count, and applied filters.
  - id: AC-3
    description: History writes are serialized and safe against interleaved generated mutation entries.
  - id: AC-4
    description: schema list/show, generated schema artifacts, and TypeScript/Python SDK schema-name contracts include the history command.
  - id: AC-5
    description: README, agent guidance, unit tests, CLI tests, schema tests, and package dry-run cover mutation history behavior.
-->

`jumpspace last` answers "what just happened?" Agents also need "what happened during this session?" and "what changed for this task?" A generated append-only local history lets humans and agents review the mutation trail after bootstrap, plan, status, link, repair, semantic, and verification commands without reconstructing it from terminal scrollback.

### CLI version source of truth

<!-- jumpspace
id: JS-036
type: engineering
status: implemented
module: package-contracts
space: repo
keywords:
  - cli version
  - package metadata
  - launch hygiene
code:
  - src/cli.ts
  - docs/specs/jumpspace-v0.md
tests:
  - src/packageHygiene.test.ts
gaps: []
depends_on:
  - JS-033
refs:
  - type: related_to
    id: JS-033
    note: OSS launch hygiene must include the CLI-visible version, not only package.json metadata.
plan:
  task_id: JS-036
  goal: Make the CLI-visible version use package metadata so jumpspace --version cannot drift from package.json.
  status: complete
  steps:
    - id: orient
      outcome: The package version, current CLI-visible version, and package hygiene test coverage are mapped.
      status: complete
      depends_on: []
      source_files:
        - package.json
        - src/cli.ts
        - src/packageHygiene.test.ts
      tests:
        - src/packageHygiene.test.ts
      checks:
        - node dist/cli.js --version
      evidence:
        - 'Reproduced the drift: package.json version is 0.1.0, but node dist/cli.js --version printed 0.0.0. src/cli.ts hard-codes .version("0.0.0"), and src/packageHygiene.test.ts checks package.json metadata but not CLI-visible version output.'
    - id: version-source
      outcome: src/cli.ts reads package metadata for Commander version output instead of hard-coding 0.0.0.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/cli.ts
      tests:
        - src/packageHygiene.test.ts
      checks:
        - npm test -- src/packageHygiene.test.ts
        - npm run build
        - node dist/cli.js --version
      evidence:
        - "Updated src/cli.ts to read package metadata through createRequire(import.meta.url) and pass packageJson.version to Commander instead of hard-coding 0.0.0. Added package hygiene coverage that runs src/cli.ts --version through tsx and compares it to package.json. Verification passed: npm test -- src/packageHygiene.test.ts passed 1 file/2 tests; npm run build passed; node dist/cli.js --version printed 0.1.0."
    - id: docs-links-verify
      outcome: JS-036 links point to code/tests, package dry-run includes the fixed bin, and final Jumpspace health checks pass.
      status: complete
      depends_on:
        - version-source
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - src/packageHygiene.test.ts
      checks:
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-036 --json
      evidence:
        - "Final JS-036 verification passed: npm test -- src/packageHygiene.test.ts passed 1 file/2 tests; npm run build passed; node dist/cli.js --version prints 0.1.0, matching package.json; npm pack --dry-run --json produced jumpspace 0.1.0 with executable dist/cli.js mode 493; link update recorded src/cli.ts, docs/specs/jumpspace-v0.md, and src/packageHygiene.test.ts; node dist/cli.js scan indexed 36 tasks; semantic build --json refreshed 36 documents with expected local-task-vector-v1 fallback; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings or suggestions; plan validate JS-036 --json returned ok true; history --task JS-036 --limit 10 --json returned the task mutation trail."
        - "Post-implementation full-suite rerun passed after the CLI version fix: npm test passed 38 files/148 tests."
acceptance_criteria:
  - id: AC-1
    description: node dist/cli.js --version prints the same version as package.json.
  - id: AC-2
    description: The CLI version is sourced from package metadata instead of a hard-coded duplicate literal.
  - id: AC-3
    description: Package hygiene tests fail if the CLI-visible version drifts from package.json again.
  - id: AC-4
    description: Build and package dry-run prove the packaged bin reports the launch-ready version.
-->

Launch hygiene includes the version a user or agent actually sees. `jumpspace --version` should never lag behind package metadata or continue to report a prototype version after package.json is updated.

### Work packet task history

<!-- jumpspace
id: JS-037
type: engineering
status: implemented
module: agent-workflow
space: repo
keywords:
  - work packet
  - mutation history
  - agent handoff
  - session trail
code:
  - src/core/workPacket.ts
  - src/commands/work.ts
  - src/core/schemas.ts
  - schemas/work.schema.json
  - schemas/catalog.json
  - README.md
  - docs/specs/jumpspace-v0.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/workPacket.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-017
  - JS-035
refs:
  - type: related_to
    id: JS-017
    note: The work packet is the one-command agent start point and should include recent task memory.
  - type: related_to
    id: JS-035
    note: The history command provides the generated mutation trail that the work packet should surface.
plan:
  task_id: JS-037
  goal: Include recent task mutation history in jumpspace work packets so agent handoffs and resumptions carry the generated task/session trail by default.
  status: complete
  steps:
    - id: orient
      outcome: Existing work packet builder, work command, history helpers, schema, SDK type, docs, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/workPacket.ts
        - src/commands/work.ts
        - src/core/mutations.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/workPacket.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - node dist/cli.js ask "how do work packets include recent mutation history for a task" --json
        - node dist/cli.js find work packet history --mode any --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
      evidence:
        - Used Jumpspace audit, doctor, ask, find, and list plus focused reads of src/core/workPacket.ts, src/commands/work.ts, src/core/workPacket.test.ts, src/core/schemas.ts, src/sdk/contracts.ts, README and templates. Current work packet is anchored by JS-017 and includes drift/schema/guardrails but not mutation_history or history schema reference. JS-035 provides readMutationHistory/history CLI, so JS-037 should compose that generated task trail into work packets with bounded output.
    - id: packet-core
      outcome: buildWorkPacket accepts bounded task history and exposes mutation_history in JSON and human-readable output.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/workPacket.ts
        - src/commands/work.ts
      tests:
        - src/core/workPacket.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/workPacket.test.ts src/cli.test.ts
      evidence:
        - "Updated src/core/workPacket.ts to include WORK_PACKET_HISTORY_LIMIT=5, mutation_history in JSON packets, a history schema reference, default empty history for pure builders, and a concise Recent History human-readable section. Updated src/commands/work.ts to read bounded task-specific history with readMutationHistory(root, { taskId, limit: 5 }). Updated core and CLI tests to prove JSON and human work packets include the generated task history after plan save. Verification passed: npm test -- src/core/workPacket.test.ts src/cli.test.ts passed 2 files/24 tests."
    - id: schema-docs-links
      outcome: Work packet schema, generated artifacts, README, agent guidance, and JS-037 links cover mutation_history.
      status: complete
      depends_on:
        - packet-core
      source_files:
        - src/core/schemas.ts
        - schemas/work.schema.json
        - schemas/catalog.json
        - README.md
        - docs/specs/jumpspace-v0.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts
        - node dist/cli.js link update JS-037 --dry-run --json
      evidence:
        - "Updated src/core/schemas.ts and regenerated schemas/work.schema.json/catalog.json so work requires mutation_history and schemas.history. Updated README, static AGENTS/SKILL templates, generated agentSkills guidance, and agentSkills tests to say work packets include recent task mutation_history and history remains available for deeper trails. Linked JS-037 to implementation, schema artifacts, docs, templates, and tests after dry-run preview. Verification passed: npm run generate:schemas generated 39 artifacts; npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts src/core/workPacket.test.ts src/cli.test.ts passed 5 files/31 tests; node dist/cli.js scan indexed 37 tasks."
    - id: final-verify
      outcome: Focused tests, full tests, Python tests, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, and work-packet smoke pass.
      status: complete
      depends_on:
        - schema-docs-links
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/workPacket.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-037 --json
        - node dist/cli.js work JS-037 --json
      evidence:
        - "Final verification completed: npm run generate:schemas generated 39 schema artifacts; npm test passed 38 files / 149 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json produced jumpspace@0.1.0 with 266 files and executable dist/cli.js mode 0755; scan indexed 37 tasks; semantic build refreshed 37 docs with expected local semantic fallback; audit, doctor, and plan validate JS-037 returned ok; schema show work confirms required mutation_history and schemas.history; work JS-037 and history --task JS-037 show recent mutation records."
acceptance_criteria:
  - id: AC-1
    description: jumpspace work <id> --json includes recent task-specific mutation history entries, newest first, with total and returned counts.
  - id: AC-2
    description: The work packet schema and TypeScript SDK type expose the mutation_history field and history schema reference.
  - id: AC-3
    description: Human-readable work packet output includes a concise recent history section without overwhelming the start packet.
  - id: AC-4
    description: Work packet history is bounded by a small default limit so the command remains fast and agent-friendly.
  - id: AC-5
    description: Unit, CLI, schema, docs, and package verification cover the new field and guidance.
-->

`jumpspace work <id>` should be the agent's handoff and start packet, so it should carry the recent task mutation trail directly. Agents should not need to remember a separate `jumpspace history --task <id>` call just to see what the prior run changed.

### PR task-block candidate ranking

<!-- jumpspace
id: JS-038
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - pr bot
  - task block suggestions
  - candidate ranking
  - evidence scoring
code:
  - src/core/ci.ts
  - docs/specs/jumpspace-v0.md
  - src/core/taskLinks.ts
  - src/core/schemas.ts
  - schemas/ci.schema.json
  - schemas/catalog.json
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/core/ci.test.ts
  - src/cli.test.ts
  - src/core/taskLinks.test.ts
  - src/schemaArtifacts.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-021
  - JS-034
refs:
  - type: related_to
    id: JS-021
    note: The PR comment workflow proposes task blocks for changed Markdown headings.
  - type: related_to
    id: JS-034
    note: The link suggestion scorer already treats changed-file status as context, not evidence.
plan:
  task_id: JS-038
  goal: Make PR/CI task-block suggestions rank code and test candidates per heading using the existing evidence-backed link scorer, so unrelated changed files are not copied into every proposed block.
  status: complete
  steps:
    - id: orient
      outcome: Current CI task-block suggestion flow, link suggestion scorer, schema surface, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/ci.ts
        - src/core/taskLinks.ts
        - src/core/ci.test.ts
        - src/cli.test.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-038 --json
        - node dist/cli.js related JS-038 --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
      evidence:
        - Used Jumpspace scan, context, related, audit, and doctor plus focused reads of src/core/ci.ts, src/core/taskLinks.ts, src/core/ci.test.ts, and src/cli.test.ts. JS-038 depends on implemented JS-021 and JS-034. link suggest already drops zero-match candidates, but CI task-block suggestions still build one global linked_code_candidates/linked_test_candidates list and reuse it for every changed Markdown heading. Audit/doctor are ok with expected stale semantic index warning after adding the new task.
    - id: ci-ranking
      outcome: CI task-block suggestions use heading-local pseudo tasks and evidence-scored changed-file candidates.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/ci.ts
      tests:
        - src/core/ci.test.ts
      checks:
        - npm test -- src/core/ci.test.ts
      evidence:
        - "Updated src/core/ci.ts so CI task-block suggestions build a heading-local pseudo task from each changed Markdown heading plus its section text, then reuse suggestTaskLinks for changed code/test candidates. Candidate content is read with a 64KB non-binary cap, and unrelated Markdown/deleted/ignored files are excluded. Updated src/core/taskLinks.ts stop words so generic path roots like src/docs/tests cannot create weak matches. Core verification passed: npm test -- src/core/ci.test.ts src/core/taskLinks.test.ts passed 2 files / 4 tests, including multiple headings with different related files and an unrelated src file omitted from every block."
    - id: cli-docs-links
      outcome: CLI integration coverage and roadmap links prove per-heading candidates and document the narrower PR-bot behavior.
      status: complete
      depends_on:
        - ci-ranking
      source_files:
        - src/cli.test.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/cli.test.ts
        - src/core/ci.test.ts
      checks:
        - npm test -- src/core/ci.test.ts src/cli.test.ts
        - node dist/cli.js link update JS-038 --dry-run --json
      evidence:
        - "Updated CLI integration assertions, CI JSON schema, generated schema artifacts, README, AGENTS/SKILL templates, generated agent guidance, and agent skill tests. CI task-block JSON now requires linked_code_candidate_matches and linked_test_candidate_matches, and schema show ci confirms both fields. Linked JS-038 to scorer, schema, docs, templates, and tests. Verification passed: npm run generate:schemas generated 39 artifacts; npm test -- src/core/ci.test.ts src/cli.test.ts src/core/agentSkills.test.ts src/schemaArtifacts.test.ts src/core/taskLinks.test.ts passed 5 files / 27 tests; schema show ci returned ok with candidate match fields."
    - id: final-verify
      outcome: Focused tests, full tests, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - cli-docs-links
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/ci.test.ts src/cli.test.ts
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-038 --json
      evidence:
        - "Final JS-038 verification passed: npm run generate:schemas generated 39 schema artifacts; npm test -- src/core/ci.test.ts src/cli.test.ts src/core/agentSkills.test.ts src/schemaArtifacts.test.ts src/core/taskLinks.test.ts passed 5 files / 27 tests; npm test passed 38 files / 149 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json was rerun after build and produced jumpspace@0.1.0 with 266 files including dist/core/ci.js, dist/core/taskLinks.js, schemas/ci.schema.json, README, templates, and executable dist/cli.js mode 0755; scan indexed 38 tasks; semantic build refreshed 38 docs with expected local fallback; audit and doctor returned ok with no issues; plan validate JS-038 returned ok; schema show ci confirmed linked_code_candidate_matches and linked_test_candidate_matches."
acceptance_criteria:
  - id: AC-1
    description: PR/CI task-block suggestions rank code and test candidates per heading instead of reusing the same global changed-file list for every heading.
  - id: AC-2
    description: Suggested task blocks include only candidates with path or bounded file-content matches against the heading and nearby section text.
  - id: AC-3
    description: Unrelated changed, staged, unstaged, or untracked files are omitted from task-block metadata even when they are present in the diff.
  - id: AC-4
    description: Existing link suggest evidence rules remain the single source of truth for candidate scoring.
  - id: AC-5
    description: Unit and CLI integration tests cover multiple headings with different related files and no empty-match candidate leakage.
-->

PR comments should be useful review packets, not just lists of every touched file. When a changed Markdown file has multiple new headings, each proposed task block should only carry code/test candidates that match that heading's own intent or local section evidence.

### Compact agent JSON output

<!-- jumpspace
id: JS-039
type: engineering
status: implemented
module: agent-contracts
space: repo
keywords:
  - compact json
  - agent budget
  - schema contracts
  - discovery
code:
  - src/commands/find.ts
  - src/commands/ask.ts
  - src/commands/related.ts
  - src/cli.ts
  - src/core/schemas.ts
  - docs/specs/jumpspace-v0.md
  - src/core/compact.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - schemas/catalog.json
  - schemas/find.compact.schema.json
  - schemas/ask.compact.schema.json
  - schemas/related.schema.json
  - schemas/related.compact.schema.json
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
tests:
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-015
  - JS-023
  - JS-037
refs:
  - type: related_to
    id: JS-015
    note: Agent-grade contracts should include bounded output shapes for high-volume discovery commands.
  - type: related_to
    id: JS-037
    note: Work packets are the deep start packet; discovery commands should have a lighter orientation mode.
plan:
  task_id: JS-039
  goal: Add opt-in compact JSON output and schema contracts for high-volume discovery commands so agents can orient cheaply before requesting full task packets.
  status: complete
  steps:
    - id: orient
      outcome: Current find, ask, related, CLI wiring, schema catalog, SDK schema-name lists, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/commands/find.ts
        - src/commands/ask.ts
        - src/commands/related.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - node dist/cli.js context JS-039 --json
        - node dist/cli.js related JS-039 --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
      evidence:
        - Used Jumpspace scan, context, related, audit, and doctor plus focused reads of find/ask/related command implementations, CLI wiring, schemas, SDK schema lists, and CLI/schema tests. JS-039 depends on implemented JS-015, JS-023, and JS-037. Current find and related JSON return full JumpTask payloads including durable plans and evidence, which caused large outputs during agent orientation. ask is lighter but still includes long graph/excerpt details. Audit/doctor are ok with expected STALE_SEMANTIC_INDEX warning after adding JS-039.
    - id: compact-core
      outcome: find, ask, and related support --compact JSON output with task/evidence briefs and no heavy embedded fields.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/commands/find.ts
        - src/commands/ask.ts
        - src/commands/related.ts
        - src/cli.ts
      tests:
        - src/cli.test.ts
      checks:
        - npm test -- src/cli.test.ts
      evidence:
        - "Implemented shared compactTask briefs in src/core/compact.ts and wired --compact through find, ask, and related. Compact find returns ok/query/mode/results with scored task briefs; compact ask returns coverage, unanswered terms, match reasons, scores, link counts, connected task IDs, and graph path counts without excerpts or graph expansion payloads; compact related returns relationship task briefs without full task plans/specs. Existing default JSON and human output remain unchanged. Verification passed: npm test -- src/cli.test.ts passed 1 file / 19 tests."
    - id: schemas-docs-links
      outcome: Schema catalog, generated artifacts, SDK schema names, README, and JS-039 links cover compact output contracts.
      status: complete
      depends_on:
        - compact-core
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - schemas/catalog.json
        - README.md
        - docs/specs/jumpspace-v0.md
      tests:
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm run generate:schemas
        - npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - node dist/cli.js link update JS-039 --dry-run --json
      evidence:
        - "Added schema catalog entries and generated artifacts for find.compact, ask.compact, related, and related.compact; updated TypeScript and Python SDK schema-name lists; documented compact orientation in README, static AGENTS/SKILL templates, and generated agentSkills guidance; linked JS-039 to implementation, schemas, docs, and tests. Verification passed: npm run generate:schemas generated 43 artifacts; npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts src/cli.test.ts passed 4 files / 26 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; schema list reported all four new schema names."
    - id: final-verify
      outcome: Focused tests, full tests, Python tests, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - schemas-docs-links
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - npm test -- src/cli.test.ts src/sdk/contracts.test.ts src/schemaArtifacts.test.ts
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-039 --json
      evidence:
        - "Final JS-039 verification passed: npm run generate:schemas generated 43 schema artifacts; focused npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts src/cli.test.ts passed 4 files / 26 tests; npm test passed 38 files / 149 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json was rerun after build and produced jumpspace@0.1.0 with 273 files including dist/core/compact.js, dist/commands/find.js, dist/commands/ask.js, dist/commands/related.js, compact schema artifacts, and executable dist/cli.js mode 0755; scan indexed 39 tasks; semantic build refreshed 39 docs with expected local fallback; audit and doctor returned ok with no issues; plan validate JS-039 returned ok; built CLI compact smokes for find, ask, and related confirmed compact true and omitted heavy spec/excerpt/graph payloads."
acceptance_criteria:
  - id: AC-1
    description: find --json --compact returns scored task briefs without embedded plans, verification records, or long specs.
  - id: AC-2
    description: ask --json --compact returns evidence briefs with task IDs, paths, match reasons, coverage, and unanswered terms, while omitting long graph expansions and excerpts.
  - id: AC-3
    description: related --json --compact returns relationship task briefs instead of full task payloads, and related has a discoverable JSON schema.
  - id: AC-4
    description: schema list/show and generated schema artifacts include find.compact, ask.compact, related, and related.compact contracts.
  - id: AC-5
    description: Unit or CLI integration tests prove compact outputs omit heavy fields while preserving IDs, paths, scores, match reasons, and link counts.
-->

Agents need a cheap first pass before asking for a full work packet. High-volume discovery commands should offer exact compact JSON contracts that preserve task IDs, source paths, scores, match reasons, relationship direction, and link counts without dumping durable plans, verification records, or long task specs.

### Weighted source-evidence ranking

<!-- jumpspace
id: JS-040
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - evidence ranking
  - link suggestions
  - pr assistant
  - source matcher
code:
  - src/core/taskLinks.ts
  - src/core/ci.ts
  - src/core/schemas.ts
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - docs/specs/jumpspace-v0.md
  - schemas/link.suggest.schema.json
  - schemas/ci.schema.json
  - schemas/catalog.json
tests:
  - src/core/taskLinks.test.ts
  - src/core/ci.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-034
  - JS-038
refs:
  - type: related_to
    id: JS-034
    note: Link suggestions already require evidence; the next step is better weighting and explanations.
  - type: related_to
    id: JS-038
    note: PR task-block candidates should reuse the same richer source-evidence scorer.
plan:
  task_id: JS-040
  goal: Improve link and PR task-block candidate ranking with a shared weighted source-evidence scorer and structured evidence details.
  status: complete
  steps:
    - id: orient
      outcome: Current scorer, CI task-block suggestion flow, schemas, docs, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/taskLinks.ts
        - src/core/ci.ts
        - src/commands/link.ts
        - src/core/schemas.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-040 --json
        - node dist/cli.js related JS-040 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - "Mapped JS-040 with Jumpspace context/related/audit plus focused reads of src/core/taskLinks.ts, src/core/ci.ts, src/commands/link.ts, src/core/schemas.ts, src/core/taskLinks.test.ts, and src/core/ci.test.ts. Dependencies JS-034 and JS-038 are implemented. Current scoring is evidence-gated but simple: path/content shared token counts plus small status/source/test bonuses, no structured evidence object, no phrase/identifier weighting, and CI task-block matches simply copy the same suggestion shape."
    - id: weighted-scorer
      outcome: Shared suggestion scorer returns weighted scores and structured evidence for path, phrase, identifier, and content matches.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/taskLinks.ts
      tests:
        - src/core/taskLinks.test.ts
      checks:
        - npm test -- src/core/taskLinks.test.ts
      evidence:
        - "Implemented weighted source-evidence scoring in src/core/taskLinks.ts. Suggestions now include evidence.path_terms, evidence.basename_terms, evidence.content_terms, evidence.identifier_terms, evidence.phrase_matches, and coverage; scoring weights basename/path/identifier/phrase evidence above incidental content and keeps status/source as secondary context. CI task-block candidate matches carry the same evidence object. Verification passed: npm test -- src/core/taskLinks.test.ts src/core/ci.test.ts passed 2 files / 5 tests, including exact path and identifier evidence outranking content-only matches and no empty-match leakage."
    - id: ci-schema-docs
      outcome: CI task-block candidate JSON, link suggestion schema, README, and agent guidance expose the richer evidence details.
      status: complete
      depends_on:
        - weighted-scorer
      source_files:
        - src/core/ci.ts
        - src/core/schemas.ts
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/ci.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/core/ci.test.ts src/cli.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts
      evidence:
        - "Extended link.suggest and ci JSON schemas with required suggestion evidence details, regenerated 43 schema artifacts, updated README plus static and generated agent guidance to tell agents to inspect path_terms, basename_terms, identifier_terms, content_terms, phrase_matches, and coverage. Linked JS-040 to implementation, schema artifacts, docs, and tests with jumpspace link update. Verification passed: npm run generate:schemas passed, and npm test -- src/core/taskLinks.test.ts src/core/ci.test.ts src/cli.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts passed 5 files / 28 tests."
    - id: final-verify
      outcome: Focused tests, full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - ci-schema-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-040 --json
      evidence:
        - "Final JS-040 verification passed: npm test passed 38 files / 150 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json passed for jumpspace@0.1.0 with 273 files including dist/core/taskLinks.js, dist/core/ci.js, schemas/link.suggest.schema.json, schemas/ci.schema.json, and executable dist/cli.js mode 0755; node dist/cli.js scan indexed 40 tasks; semantic build --json refreshed 40 docs with expected local-task-vector-v1 fallback; audit --json and doctor --json returned ok true with no issues; plan validate JS-040 --json returned ok true; built CLI link suggest JS-040 --path src/core/prAssistant.ts --json emitted evidence keys path_terms, basename_terms, content_terms, identifier_terms, phrase_matches, and coverage with no bad status stem or generic file/changed terms."
acceptance_criteria:
  - id: AC-1
    description: Link and PR task-block suggestions use one shared weighted scorer for path, basename, identifier, phrase, content, status, and source evidence.
  - id: AC-2
    description: Exact path or identifier evidence outranks incidental content-only matches when the same candidate set is scored.
  - id: AC-3
    description: Suggestions include structured evidence details so agents can see path terms, content terms, identifier terms, phrase matches, and coverage.
  - id: AC-4
    description: Generic path roots, stop words, changed-file status, and source metadata cannot create a recommendation without source evidence.
  - id: AC-5
    description: Focused unit and CI tests cover ranking order, evidence details, PR task-block candidate JSON, and no empty-match leakage.
-->

The PR assistant needs to feel like it understands the changed files, not like it sorted a bag of paths. Candidate ranking should stay deterministic and local, but it should weight stronger evidence first: exact filename phrases, identifier names, basename tokens, bounded content matches, then changed-file status and source as context only.

### Link suggestion ranking eval

<!-- jumpspace
id: JS-041
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - link eval
  - ranking quality
  - suggestion fixtures
  - agent trust
code:
  - src/core/taskLinkEval.ts
  - src/core/taskLinks.ts
  - src/commands/link.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - sdk/python/jumpspace_sdk/__init__.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - docs/specs/jumpspace-v0.md
  - schemas/link.eval.schema.json
  - schemas/catalog.json
tests:
  - src/core/taskLinkEval.test.ts
  - src/core/taskLinks.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-027
  - JS-034
  - JS-040
refs:
  - type: related_to
    id: JS-040
    note: Weighted source-evidence ranking needs an eval harness so future scorer changes are measurable.
plan:
  task_id: JS-041
  goal: Add a local link suggestion ranking evaluation harness so scorer quality is measurable and agent-readable.
  status: complete
  steps:
    - id: orient
      outcome: Current link scorer, link CLI, semantic eval pattern, schemas, SDK contracts, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/taskLinks.ts
        - src/commands/link.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/commands/semantic.ts
        - src/core/semanticIndex.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - node dist/cli.js context JS-041 --json
        - node dist/cli.js related JS-041 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - "Mapped JS-041 with Jumpspace context/related/audit plus focused reads of src/core/taskLinks.ts, src/commands/link.ts, src/cli.ts, src/core/schemas.ts, src/commands/semantic.ts, and src/core/semanticIndex.ts. Dependencies JS-027, JS-034, and JS-040 are implemented. Existing semantic eval provides the native pattern: built-in fixtures, summary hit metrics, human/JSON output, schema catalog entry, and SDK schema names. Link suggestions currently have strong scoring and evidence details but no command-level ranking quality harness."
    - id: eval-core-cli
      outcome: Core evaluator and CLI command report ranking fixture quality in human and JSON modes.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/taskLinkEval.ts
        - src/commands/link.ts
        - src/cli.ts
      tests:
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/taskLinkEval.test.ts src/cli.test.ts
      evidence:
        - "Implemented src/core/taskLinkEval.ts with built-in link suggestion ranking fixtures and metrics for pass/fail, top-1 accuracy, mean reciprocal rank, expected path/field, rank, top candidate, and suggestions. Wired jumpspace link eval [--limit] [--json] through src/commands/link.ts and src/cli.ts with human and JSON output. Tightened identifier extraction so plain English words no longer count as code identifiers. Verification passed: npm test -- src/core/taskLinkEval.test.ts src/core/taskLinks.test.ts src/cli.test.ts passed 3 files / 24 tests; link eval JSON reports 4/4 passing cases including exact path, identifier, test classification, and generic changed-file rejection."
    - id: schemas-docs-guidance
      outcome: Schema catalog, generated artifacts, SDK schema names, README, and agent guidance document link eval.
      status: complete
      depends_on:
        - eval-core-cli
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - "Added link.eval schema catalog entry, generated schema artifact, TypeScript/Python SDK schema-name contracts, README command guidance, AGENTS/SKILL templates, and generated agent guidance for running link eval before trusting scorer changes. Verification passed: npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts src/core/taskLinkEval.test.ts src/cli.test.ts passed 5 files / 27 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; node dist/cli.js schema show link.eval --json returned the published link.eval schema."
    - id: final-verify
      outcome: Focused tests, full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, and plan validation pass.
      status: complete
      depends_on:
        - schemas-docs-guidance
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-041 --json
      evidence:
        - "Final JS-041 verification passed: npm test passed 39 files / 151 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed and rebuilt dist with bin-mode fix; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json produced jumpspace@0.1.0 with 277 files, LICENSE included, schemas/link.eval.schema.json included, dist/core/taskLinkEval.js included, and dist/cli.js mode 0755; node dist/cli.js scan indexed 41 tasks; node dist/cli.js semantic build --json refreshed 41 documents with local-task-vector-v1 fallback; audit --json and doctor --json returned ok true with no issues; plan validate JS-041 --json returned ok true; link eval --json returned 4 passing built-in cases with top1_accuracy 1 and mean_reciprocal_rank 1."
acceptance_criteria:
  - id: AC-1
    description: A CLI command evaluates built-in link suggestion ranking fixtures without requiring Git or hosted services.
  - id: AC-2
    description: The eval reports pass/fail, rank, top candidate, expected candidate, top-1 accuracy, and mean reciprocal rank.
  - id: AC-3
    description: Eval cases cover exact path evidence, identifier evidence, test classification, and rejection of changed-file-only/generic candidates.
  - id: AC-4
    description: JSON output has a published schema and SDK schema-name contracts.
  - id: AC-5
    description: README and agent guidance tell agents to run the eval before trusting scorer changes.
-->

Ranking quality should be testable as a product behavior, not inferred from a handful of unit assertions. Jumpspace should ship a local fixture suite that agents can run after scorer changes to prove that expected code and test files rank where they should, and that generic changed-file context does not create false confidence.

### Release readiness doctor

<!-- jumpspace
id: JS-042
type: engineering
status: implemented
module: package-contracts
space: repo
keywords:
  - oss launch
  - npm publish
  - release doctor
  - package readiness
code:
  - src/core/releaseDoctor.ts
  - src/commands/release.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - schemas/release.doctor.schema.json
  - schemas/catalog.json
tests:
  - src/core/releaseDoctor.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/sdk/contracts.test.ts
  - src/core/agentSkills.test.ts
  - sdk/python/tests/test_contracts.py
gaps: []
depends_on:
  - JS-025
  - JS-033
  - JS-036
refs:
  - type: related_to
    id: JS-033
    note: OSS launch hygiene is implemented locally; release readiness should make remaining npm publication checks explicit.
plan:
  task_id: JS-042
  goal: Add a release readiness doctor that gives maintainers and agents one local evidence packet before npm publish.
  status: complete
  steps:
    - id: orient
      outcome: Current package hygiene, CLI command layout, schema/SDK contract surfaces, docs, and test patterns are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/cli.ts
        - src/core/schemas.ts
        - src/core/schemaCoverage.ts
        - src/packageHygiene.test.ts
        - src/cli.test.ts
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/packageHygiene.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - src/core/agentSkills.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - node dist/cli.js context JS-042 --json
        - node dist/cli.js related JS-042 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - "Oriented with Jumpspace context/related/audit and focused reads of src/cli.ts, src/commands/doctor.ts, src/core/doctor.ts, src/core/schemas.ts, src/core/schemaCoverage.ts, package hygiene tests, CLI tests, SDK contracts, README, and agent guidance. JS-042 is approved and ready; dependencies JS-025, JS-033, and JS-036 are implemented. Current gap is real: package metadata/bin/schema hygiene exists, but there is no single release-readiness command that runs package dry-run, reports required package contents/bin mode/metadata/schema artifacts, and separates local blockers from npm registry publication state. Implementation should add jumpspace release doctor with JSON/human output, default local-only registry unknown, optional registry check, published release.doctor schema, SDK schema names, docs, and agent guidance."
    - id: release-core-cli
      outcome: Core release doctor and CLI command report package metadata, package dry-run contents, bin mode, local blockers, and registry status.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/releaseDoctor.ts
        - src/commands/release.ts
        - src/cli.ts
      tests:
        - src/core/releaseDoctor.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/releaseDoctor.test.ts src/cli.test.ts
        - node dist/cli.js release doctor --json
      evidence:
        - "Implemented src/core/releaseDoctor.ts and src/commands/release.ts, wired jumpspace release doctor [--check-registry] [--json] into src/cli.ts. The command reports package metadata, LICENSE presence, bin target/mode, npm pack --dry-run --json contents, required runtime/schema/template/SDK package files, local blockers, external registry warnings, and registry status unknown/available/unavailable. It uses a repo-safe temp npm cache by default so a broken global npm cache does not make local readiness opaque. Added src/core/releaseDoctor.test.ts and CLI fixture coverage in src/cli.test.ts, including default registry unknown and checked registry unavailable behavior. Verification passed: npm test -- src/core/releaseDoctor.test.ts src/cli.test.ts passed 2 files/23 tests."
    - id: schemas-sdk-docs
      outcome: release.doctor has a published schema, SDK schema-name contracts, README docs, and agent guidance.
      status: complete
      depends_on:
        - release-core-cli
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - node dist/cli.js schema show release.doctor --json
        - node dist/cli.js schema coverage --json
      evidence:
        - "Published release.doctor schema and SDK contract surfaces, regenerated schemas, and documented release doctor in README plus agent guidance/templates. Verification passed: npm run generate:schemas generated 46 schema artifacts; npm test -- src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts passed 3 files/7 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; node dist/cli.js schema show release.doctor --json returned ok; node dist/cli.js schema coverage --json returned declared/catalog/artifacts/sdk_names 46 with 0 issues; node dist/cli.js release doctor --json returned status ready with 0 local blockers and registry unknown/not_requested."
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, schema coverage, and release doctor pass.
      status: complete
      depends_on:
        - schemas-sdk-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/releaseDoctor.test.ts
        - src/cli.test.ts
        - src/packageHygiene.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js release doctor --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-042 --json
        - node dist/cli.js schema coverage --json
      evidence:
        - Full release-doctor verification passed. npm test passed 41 files/163 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed and fixed dist/cli.js mode; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json passed with jumpspace-0.1.0.tgz, 288 entries, README/LICENSE/dist/templates/SDK/schemas included, and dist/cli.js mode 493; node dist/cli.js release doctor --json returned ok true/status ready/0 local blockers/0 local warnings/registry unknown not_requested; node dist/cli.js scan indexed 45 tasks; node dist/cli.js semantic build --json rebuilt 45 semantic documents using deterministic local-task-vector fallback; node dist/cli.js audit --json returned ok true with no issues; node dist/cli.js doctor --json returned ok true with no errors/warnings/suggestions; node dist/cli.js plan validate JS-042 --json returned ok true; node dist/cli.js schema coverage --json returned declared/catalog/artifacts/sdk_names 46 with 0 issues. jumpspace verify was deliberately not run because this workspace is not a Git repository, so commit SHA capture is unavailable.
acceptance_criteria:
  - id: AC-1
    description: A release-readiness command reports package version, license, repository, homepage, bugs, keywords, LICENSE presence, package files, bin target, and executable bin mode.
  - id: AC-2
    description: The command runs or validates a package dry-run and reports whether schemas, templates, SDK files, README, LICENSE, and dist/cli.js are included.
  - id: AC-3
    description: npm registry/name availability is represented as checked, unavailable, available, or unknown; unknown is used when network or credentials are absent.
  - id: AC-4
    description: Human and JSON output distinguish local release blockers from external publication steps that require credentials or network access.
  - id: AC-5
    description: README and agent guidance tell maintainers to run the release doctor before npm publish or launch validation.
-->

Jumpspace should make launch readiness boring and inspectable. Local package hygiene is already in place, but a maintainer should not have to remember every publish prerequisite or infer whether npm registry state was actually checked. A release doctor should produce a single local evidence packet for package metadata, package contents, executable bin mode, schema artifacts, and npm registry status, while being explicit when registry availability is unknown because the command did not or could not check the network.

### Real-repo link ranking fixtures

<!-- jumpspace
id: JS-043
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - link eval
  - real repo fixtures
  - pr bot scorer
  - ranking regression
code:
  - src/core/taskLinkEval.ts
  - src/commands/link.ts
  - src/cli.ts
  - src/core/schemas.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - docs/specs/jumpspace-v0.md
  - schemas/link.eval.schema.json
  - schemas/catalog.json
  - fixtures/link-eval/shared-candidates.json
tests:
  - src/core/taskLinkEval.test.ts
  - src/cli.test.ts
  - src/sdk/contracts.test.ts
  - src/schemaArtifacts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-034
  - JS-040
  - JS-041
refs:
  - type: related_to
    id: JS-041
    note: The first eval harness should grow into a realistic regression suite for PR-bot ranking failures.
plan:
  task_id: JS-043
  goal: Let link eval run real-repo fixture files and add regression coverage for shared candidate sets that should rank differently per task heading.
  status: complete
  steps:
    - id: orient
      outcome: Current link eval harness, link CLI, schema catalog, SDK contracts, docs, and agent guidance are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/taskLinkEval.ts
        - src/commands/link.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - node dist/cli.js context JS-043 --json
        - node dist/cli.js audit --json
      evidence:
        - Mapped JS-043 with Jumpspace context and current audit plus focused reads of src/core/taskLinkEval.ts, src/commands/link.ts, src/cli.ts, src/core/schemas.ts, SDK contracts, README, and agent guidance. Dependencies JS-034, JS-040, and JS-041 are implemented. Current link eval supports only built-in synthetic cases with suite fixed to built-in; runLinkEval has no --file option; link.eval schema has no fixture_path or suite variation; the next change should add external JSON fixture loading, shared-candidate regression cases, failure reasons, schema/docs/SDK updates, and agent guidance for adding fixtures from real ranking failures.
    - id: fixture-loader-cli
      outcome: link eval accepts an external fixture file, validates it, and reports per-case ranking failures for shared candidate sets.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/taskLinkEval.ts
        - src/commands/link.ts
        - src/cli.ts
      tests:
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/taskLinkEval.test.ts src/cli.test.ts
      evidence:
        - "Implemented external link eval fixture loading in src/core/taskLinkEval.ts, including JSON parsing, fixture validation, shared_candidates support, suite names, fixture_path reporting, min_matched_terms assertions, and failure reasons for missing expected candidates, wrong field, low rank, and weak evidence. Wired jumpspace link eval --file <fixture-file> through src/commands/link.ts and src/cli.ts while preserving the built-in default. Added built-in shared-candidate regression cases so the same candidate pool ranks metrics and auth headings to different files, plus CLI tests for --file and INVALID_LINK_EVAL_FIXTURE errors. Verification passed: npm test -- src/core/taskLinkEval.test.ts src/cli.test.ts passed 2 files / 22 tests."
    - id: schemas-docs-guidance
      outcome: Schema catalog, generated artifacts, SDK contracts, README, and agent guidance document external link eval fixtures.
      status: complete
      depends_on:
        - fixture-loader-cli
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/sdk/contracts.test.ts
        - src/schemaArtifacts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - "Updated link.eval schema to cover built-in and file-based fixtures, including fixture_path and min_matched_terms; regenerated 44 schema artifacts; updated Python LinkEvalResult with fixture_path; documented link eval --file in README, AGENTS/SKILL templates, generated agent guidance, and agent guidance tests. Verification passed: npm run generate:schemas passed; npm test -- src/sdk/contracts.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts src/core/taskLinkEval.test.ts src/cli.test.ts passed 5 files / 29 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; node dist/cli.js schema show link.eval --json returned the updated contract; node dist/cli.js link eval --json reported 6 built-in passing cases with fixture_path null."
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, and link eval smokes pass.
      status: complete
      depends_on:
        - schemas-docs-guidance
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-043 --json
      evidence:
        - "Final JS-043 verification passed: npm test passed 39 files / 153 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json compact summary reported jumpspace@0.1.0 with 277 entries, dist/cli.js mode 0755, LICENSE included, schemas/link.eval.schema.json included, and dist/core/taskLinkEval.js included; node dist/cli.js scan indexed 44 tasks; semantic build --json refreshed 44 documents with expected local-task-vector-v1 fallback; audit --json and doctor --json returned ok true with only intentional gap warnings for JS-042 and JS-044; plan validate JS-043 --json returned ok true; link eval --json returned 6 passing built-in cases; link eval --file fixtures/link-eval/shared-candidates.json --json returned 2 passing shared-candidate cases with top1_accuracy 1 and mean_reciprocal_rank 1."
acceptance_criteria:
  - id: AC-1
    description: link eval can run an external fixture file as well as the built-in suite, without requiring Git or hosted services.
  - id: AC-2
    description: Fixture cases can model multiple task headings sharing the same candidate file set and assert different expected top candidates.
  - id: AC-3
    description: Built-in or checked-in fixtures include a regression for generic changed/untracked files with matched_terms empty or weak evidence.
  - id: AC-4
    description: The eval report includes per-case failure reasons that explain whether rank, field, weak evidence, or missing candidate caused failure.
  - id: AC-5
    description: Agent guidance tells agents to add a fixture before changing scorer weights when they observe a bad ranking in a real repo.
-->

The scorer needs a way to absorb field reports from messy repositories. Synthetic fixtures are useful, but the PR assistant earns trust only when a real failure like "three unrelated headings all received the same changed-file candidates" becomes a regression case. Jumpspace should let maintainers store local eval fixtures that model task intent, candidate files, content snippets, expected top links, and weak-evidence expectations, so scorer changes become measurable against real-world agent pain.

### Schema coverage gate

<!-- jumpspace
id: JS-044
type: engineering
status: implemented
module: contracts
space: repo
keywords:
  - schema coverage
  - json contracts
  - agent ergonomics
  - command registry
code:
  - src/core/schemaCoverage.ts
  - src/core/schemas.ts
  - src/commands/schema.ts
  - src/cli.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - schemas/schema.coverage.schema.json
  - schemas/catalog.json
tests:
  - src/core/schemaCoverage.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/sdk/contracts.test.ts
  - sdk/python/tests/test_contracts.py
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-015
  - JS-029
  - JS-033
refs:
  - type: related_to
    id: JS-033
    note: Write-side schemas were added; future commands still need an automated coverage guard.
plan:
  task_id: JS-044
  goal: Add a schema coverage gate so JSON-capable command contracts cannot drift from the schema catalog, generated artifacts, and SDK lists.
  status: complete
  steps:
    - id: orient
      outcome: Current schema catalog, schema CLI, generated artifacts, SDK checks, and agent guidance are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/schemas.ts
        - src/commands/schema.ts
        - src/cli.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
      tests:
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-044 --json
        - node dist/cli.js related JS-044 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - Mapped JS-044 with Jumpspace context/related/audit plus focused reads of src/core/schemas.ts, src/commands/schema.ts, src/cli.ts, src/schemaArtifacts.test.ts, src/sdk/contracts.test.ts, SDK contract lists, README, and agent guidance. Dependencies JS-015, JS-029, and JS-033 are implemented. Current schema surfaces publish list/show and generated artifacts, and SDK tests compare schema names to the live/generated catalogs; missing piece is an explicit JSON-command contract registry plus CLI coverage report that can flag declared-but-missing schemas, orphaned schema entries, missing generated artifacts, and stale artifact/catalog metadata.
    - id: coverage-core-cli
      outcome: Core coverage checker and CLI command report missing, orphaned, and stale schema coverage issues.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/schemaCoverage.ts
        - src/core/schemas.ts
        - src/commands/schema.ts
        - src/cli.ts
      tests:
        - src/core/schemaCoverage.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/schemaCoverage.test.ts src/cli.test.ts
      evidence:
        - "Implemented schema coverage registry/checker and CLI command. Verified with npm test -- src/core/schemaCoverage.test.ts src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts src/cli.test.ts: 5 files, 31 tests passed; node dist/cli.js schema coverage --json reported 45 declared/catalog/generated/SDK schemas and 0 issues."
    - id: schemas-sdk-docs
      outcome: schema.coverage is published in artifacts and SDK lists, and docs/agent guidance point agents to the coverage output.
      status: complete
      depends_on:
        - coverage-core-cli
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts
        - python3 -m unittest discover -s sdk/python/tests
      evidence:
        - Published schema.coverage in schemaCatalog, generated schemas/schema.coverage.schema.json and updated schemas/catalog.json; added TS SDK and Python SDK schema names; updated README, static AGENTS/SKILL templates, and generated agent guidance to tell agents to run schema coverage. Verified npm run generate:schemas generated 45 artifacts; focused npm test passed 5 files/31 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; link update added JS-044 code/test links and removed the gap, then scan indexed 44 tasks.
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, and schema coverage pass.
      status: complete
      depends_on:
        - schemas-sdk-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/schemaCoverage.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-044 --json
        - node dist/cli.js schema coverage --json
      evidence:
        - "Final verification passed for JS-044: npm test passed 40 files/158 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json produced jumpspace@0.1.0 with 281 entries including dist/core/schemaCoverage.*, schemas/schema.coverage.schema.json, SDK files, and dist/cli.js mode 493 (0755); scan indexed 44 tasks; semantic build refreshed 44 documents with expected local-task-vector fallback because optional LanceDB/ONNX dependencies are not installed; audit --json and doctor --json returned ok true with the known JS-042 release-doctor gap warning; plan validate JS-044 --json returned ok true; schema coverage --json returned 45 declared/catalog/generated/SDK schemas with 0 issues. jumpspace verify was not run because git rev-parse --is-inside-work-tree failed: this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: A schema coverage check compares declared JSON-capable commands against schemaCatalog and generated schema artifacts.
  - id: AC-2
    description: The coverage check reports missing, orphaned, and stale schema entries with stable JSON errors or issues.
  - id: AC-3
    description: Tests fail when a command is marked JSON-capable without a schema name or when a schema artifact is missing from the generated catalog.
  - id: AC-4
    description: SDK schema-name lists remain mechanically checked against the coverage gate and generated artifacts.
  - id: AC-5
    description: README and agent guidance point agents to schema coverage output before relying on newly added command JSON.
-->

Agents do not forgive undocumented machine output. Jumpspace now publishes write-side schemas, but that standard needs a guardrail so new commands cannot quietly ship JSON output without a schema. A coverage gate should make the command/schema contract surface explicit, testable, and visible to agents before they spend tokens guessing shapes.

### Source-evidence PR link ranking

<!-- jumpspace
id: JS-045
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - pr bot scorer
  - link ranking
  - source evidence
  - weak candidates
code:
  - src/core/taskLinks.ts
  - src/core/ci.ts
  - src/commands/link.ts
  - src/core/taskLinkEval.ts
  - src/core/schemas.ts
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - fixtures/link-eval/source-evidence.json
  - schemas/link.suggest.schema.json
  - schemas/link.eval.schema.json
  - schemas/ci.schema.json
  - schemas/catalog.json
tests:
  - src/core/taskLinks.test.ts
  - src/core/ci.test.ts
  - src/core/taskLinkEval.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/core/agentSkills.test.ts
gaps: []
depends_on:
  - JS-038
  - JS-040
  - JS-041
  - JS-043
refs:
  - type: related_to
    id: JS-040
    note: Source evidence details exist; ranking must enforce them instead of treating changed-file status as enough.
  - type: related_to
    id: JS-043
    note: Real-repo fixtures should capture the repeated-candidate failure and keep scorer changes measurable.
plan:
  task_id: JS-045
  goal: Make link and PR task-block ranking reject or expose weak changed-file candidates so agents do not approve bogus code/test links.
  status: complete
  steps:
    - id: orient
      outcome: Current scorer, CI PR task-block suggestion flow, eval harness, schemas, and tests are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/taskLinks.ts
        - src/core/ci.ts
        - src/core/taskLinkEval.ts
        - src/commands/link.ts
        - src/core/schemas.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-045 --json
        - node dist/cli.js related JS-045 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - Oriented with Jumpspace context/related/audit plus focused reads of src/core/taskLinks.ts, src/core/ci.ts, src/core/taskLinkEval.ts, src/commands/link.ts, task link/CI/eval/CLI tests, and fixtures/link-eval/shared-candidates.json. Dependencies JS-038, JS-040, JS-041, and JS-043 are implemented. Current scorer already rejects exact matched_terms [] candidates before suggestion ranking, but rejected/no-evidence candidates disappear from link suggest and PR task-block output, leaving agents without explicit evidence about touched files that were considered and rejected. JS-045 should surface rejected candidates with reason/evidence, add a real fixture for the Claude failure shape, and keep changed-file status as context only.
    - id: rejection-surface
      outcome: link suggest and CI task-block suggestions expose rejected no-evidence candidates without ranking them as useful links.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/taskLinks.ts
        - src/core/ci.ts
        - src/commands/link.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/taskLinks.test.ts src/core/ci.test.ts src/cli.test.ts
      evidence:
        - Implemented rejected candidate surfacing for link suggest and CI task-block suggestions. suggestTaskLinks now returns rejected_candidates with NO_SOURCE_EVIDENCE, zero matched_terms, evidence coverage, sources, and statuses; link suggest JSON/human output includes rejected candidates; CI task-block JSON includes rejected_candidate_matches and PR Markdown prints rejected candidates. Verified npm run generate:schemas passed and npm test -- src/core/taskLinks.test.ts src/core/ci.test.ts src/cli.test.ts passed 3 files/24 tests.
    - id: fixtures-schemas-docs
      outcome: A checked-in eval fixture reproduces weak shared candidates, and schemas/docs/agent guidance document rejected candidate evidence.
      status: complete
      depends_on:
        - rejection-surface
      source_files:
        - fixtures/link-eval/source-evidence.json
        - src/core/taskLinkEval.ts
        - src/core/schemas.ts
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/core/taskLinkEval.test.ts
        - src/schemaArtifacts.test.ts
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/core/taskLinkEval.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts
        - node dist/cli.js link eval --file fixtures/link-eval/source-evidence.json --json
      evidence:
        - "Added fixtures/link-eval/source-evidence.json to reproduce Claude's shared changed-file candidate failure shape: two headings pick different source-evidenced files and an unrelated heading rejects all candidates. Updated link.eval schema/results with rejected_candidates, regenerated 45 schema artifacts, and updated README plus static/generated agent guidance to teach agents to inspect rejected_candidates and rejected_candidate_matches. Verification passed: npm run generate:schemas rebuilt dist and generated schemas; npm test -- src/core/taskLinkEval.test.ts src/schemaArtifacts.test.ts src/core/agentSkills.test.ts passed 3 files/8 tests; node dist/cli.js link eval --file fixtures/link-eval/source-evidence.json --json passed 3/3 cases with top1_accuracy 1 and mean_reciprocal_rank 1."
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, schema coverage, and link eval pass.
      status: complete
      depends_on:
        - fixtures-schemas-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-045 --json
        - node dist/cli.js schema coverage --json
        - node dist/cli.js link eval --json
        - node dist/cli.js link eval --file fixtures/link-eval/source-evidence.json --json
      evidence:
        - "Final JS-045 verification passed: npm test passed 40 files/159 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json produced jumpspace@0.1.0 with 281 entries, LICENSE included, schemas/link.suggest.schema.json, schemas/link.eval.schema.json, schemas/ci.schema.json, dist/core/taskLinks.js, dist/core/ci.js, dist/core/taskLinkEval.js, and dist/cli.js mode 0755; scan indexed 45 tasks; semantic build refreshed 45 documents with expected local-task-vector-v1 fallback because optional LanceDB/ONNX dependencies are not installed; audit --json and doctor --json returned ok true with only the known JS-042 release-doctor gap warning; plan validate JS-045 --json returned ok true; schema coverage --json returned 45 declared/catalog/generated/SDK schemas with 0 issues; link eval --json passed 6/6 built-in cases; link eval --file fixtures/link-eval/source-evidence.json --json passed 3/3 source-evidence cases with top1_accuracy 1 and mean_reciprocal_rank 1. jumpspace verify was not run because this workspace is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: link suggest and PR task-block candidates require positive source evidence from path, basename, identifier, phrase, or bounded content matching before ranking as useful suggestions.
  - id: AC-2
    description: Changed-file status contributes context but cannot by itself produce identical useful candidates for unrelated headings.
  - id: AC-3
    description: Candidates with no matched evidence are either excluded from useful suggestions or clearly marked weak with matched_terms/evidence empty and a no-evidence reason.
  - id: AC-4
    description: A checked-in link eval fixture reproduces the Claude failure with one shared changed-file pool and multiple headings that must rank different top candidates.
  - id: AC-5
    description: PR assistant JSON and Markdown make weak or rejected candidate evidence visible enough for an agent to avoid approving bogus links.
-->

The PR assistant loop is correct, but the scorer still needs to earn trust. A touched file is a candidate source, not proof that it implements a heading. When three unrelated headings all receive the same candidates with no matched terms, the bot has shifted authorship back to the human reviewer. Ranking should use source-backed evidence, reject or demote no-evidence candidates, and make per-heading results differ when the candidate pool is shared.

### Agent handoff recap packet

<!-- jumpspace
id: JS-046
type: engineering
status: implemented
module: core-cli
space: repo
keywords:
  - handoff
  - recap
  - agent packet
  - mutation history
  - next actions
code:
  - src/core/handoff.ts
  - src/commands/handoff.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - schemas/handoff.schema.json
  - schemas/catalog.json
tests:
  - src/core/handoff.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/sdk/contracts.test.ts
  - src/core/agentSkills.test.ts
  - sdk/python/tests/test_contracts.py
gaps: []
depends_on:
  - JS-010
  - JS-011
  - JS-015
  - JS-044
refs:
  - type: related_to
    id: JS-010
    note: Durable plans and next-step state should appear in task-specific handoff packets.
  - type: related_to
    id: JS-011
    note: Mutation history, doctor output, and structured JSON errors provide the trust-loop evidence a handoff should summarize.
  - type: related_to
    id: JS-044
    note: The new handoff JSON shape must be published and covered by schema coverage.
plan:
  task_id: JS-046
  goal: Add a compact agent handoff packet that summarizes recent mutations, graph health, task state, and next commands.
  status: complete
  steps:
    - id: orient
      outcome: Existing mutation history, doctor, audit, task execution, schema, SDK, docs, and agent guidance patterns are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/cli.ts
        - src/commands/history.ts
        - src/commands/last.ts
        - src/commands/doctor.ts
        - src/core/mutations.ts
        - src/core/doctor.ts
        - src/core/workPacket.ts
        - src/core/schemas.ts
      tests:
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
      checks:
        - node dist/cli.js context JS-046 --json
        - node dist/cli.js related JS-046 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - Created JS-046 from the remaining agent-handoff gap, scanned 46 tasks, and oriented with context JS-046 --json, related JS-046 --json --compact, audit --json, and focused reads of src/cli.ts, last/history/doctor commands, core mutations/doctor/workPacket/schema coverage patterns, SDK/schema tests, README, and agent guidance. Dependencies JS-010, JS-011, JS-015, and JS-044 are implemented. The implementation should add jumpspace handoff [--task <id>] [--limit <n>] [--json] with recent mutation summaries, touched files/task IDs/config changes/warnings, audit and doctor health summaries, optional task plan/next-step/check state, suggested next commands, a published handoff schema, SDK schema-name updates, docs, and agent guidance.
    - id: handoff-core-cli
      outcome: Core handoff packet builder and CLI command report recent mutations, touched files, health summaries, task next-step state, and suggested commands.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/handoff.ts
        - src/commands/handoff.ts
        - src/cli.ts
      tests:
        - src/core/handoff.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/handoff.test.ts src/cli.test.ts
        - node dist/cli.js handoff --json
        - node dist/cli.js handoff --task JS-046 --json
      evidence:
        - "Implemented src/core/handoff.ts, src/commands/handoff.ts, and CLI wiring for jumpspace handoff [--task <id>] [--limit <n>] [--json]. The packet summarizes recent mutation history, touched files, task IDs, config changes, mutation warnings, audit/doctor health, optional task plan status, pending unblocked steps, required checks, and suggested next commands. Added focused core and CLI tests. Verification passed: npm test -- src/core/handoff.test.ts src/cli.test.ts passed 2 files/22 tests; npm run build passed; node dist/cli.js handoff --json returned ok true/status attention with recent mutations and suggested health commands; node dist/cli.js handoff --task JS-046 --json returned task state with pending step handoff-core-cli and required checks."
    - id: schemas-sdk-docs
      outcome: handoff has a published JSON schema, SDK schema-name contracts, README docs, and agent guidance.
      status: complete
      depends_on:
        - handoff-core-cli
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
      tests:
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - node dist/cli.js schema show handoff --json
        - node dist/cli.js schema coverage --json
      evidence:
        - Added handoff JSON schema contract, regenerated schema artifacts, added TypeScript/Python SDK schema names and types, updated README/templates/agent skill guidance, and passed npm test -- src/core/handoff.test.ts src/cli.test.ts src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts plus python3 -m unittest discover -s sdk/python/tests, schema show handoff, and schema coverage.
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, schema coverage, and handoff smoke commands pass.
      status: complete
      depends_on:
        - schemas-sdk-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/handoff.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js handoff --json
        - node dist/cli.js handoff --task JS-046 --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-046 --json
        - node dist/cli.js schema coverage --json
      evidence:
        - "Final verification passed: npm test passed 42 files/165 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; npm pack --dry-run --json produced jumpspace@0.1.0 with 295 entries and dist/cli.js mode 493/0755; ./dist/cli.js --help succeeded; scan indexed 46 tasks; semantic build refreshed 46 documents with expected local-task-vector fallback because optional LanceDB/ONNX packages are not installed; audit --json, doctor --json, plan validate JS-046 --json, schema coverage --json, handoff --json, and handoff --task JS-046 --json all returned ok true; release doctor --json returned ready with zero local blockers and only registry check not requested."
        - "Post-final handoff polish: adjusted completed-task handoff semantics so implemented tasks with no pending plan steps report execution_ready true, no blockers, and packet status ready. Added regression coverage in src/core/handoff.test.ts. Verified npm test -- src/core/handoff.test.ts passed 1 file/3 tests, npm run build passed, node dist/cli.js handoff --task JS-046 --json returned ok true/status ready with plan_status complete and no pending steps/blockers, and audit/doctor stayed ok true."
acceptance_criteria:
  - id: AC-1
    description: A `jumpspace handoff` command returns a concise human and JSON recap of recent Jumpspace mutations, touched files, task IDs, warnings, and config changes.
  - id: AC-2
    description: The handoff packet includes current audit and doctor health summaries and exits non-zero only when blocking audit/doctor errors exist.
  - id: AC-3
    description: "`jumpspace handoff --task <id>` includes task status, plan status, pending unblocked step IDs, required checks, and task-filtered mutation history."
  - id: AC-4
    description: The packet includes concrete suggested next commands such as scan, audit, doctor, schema coverage, task context, plan validation, next, or release doctor when relevant.
  - id: AC-5
    description: The handoff JSON shape is documented through schema list/show/coverage, SDK schema-name lists, README, and agent guidance.
-->

Agents need a clean baton pass. After a long session, `last`, `history`, `doctor`, `audit`, `schema coverage`, and task-specific plan commands are all useful, but they force the next agent to rediscover the shape of the work. A handoff packet should give a compact, evidence-backed recap of what changed recently, whether the graph is healthy, what task state matters, and exactly which commands to run next.

### Messy-repo PR scorer regression

<!-- jumpspace
id: JS-047
type: engineering
status: implemented
module: pr-assistant
space: repo
keywords:
  - pr bot scorer
  - messy repo
  - link ranking
  - changed files
  - regression fixture
code:
  - src/core/taskLinks.ts
  - src/core/ci.ts
  - src/core/prAssistant.ts
  - src/core/taskLinkEval.ts
  - fixtures/link-eval/source-evidence.json
  - src/core/schemas.ts
  - schemas/pr.comment.schema.json
  - schemas/catalog.json
  - fixtures/link-eval/messy-repo-pr-scorer.json
tests:
  - src/core/taskLinks.test.ts
  - src/core/ci.test.ts
  - src/core/prAssistant.test.ts
  - src/core/taskLinkEval.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
gaps: []
depends_on:
  - JS-045
refs:
  - type: related_to
    id: JS-045
    note: JS-045 exposes rejected no-evidence candidates; this task should prove the real PR assistant and link suggest flows stop presenting identical empty-evidence candidates as useful suggestions.
plan:
  task_id: JS-047
  goal: Prove and fix the messy-repo PR scorer regression across the actual pr comment --since and link suggest --since surfaces.
  status: complete
  steps:
    - id: orient
      outcome: Current PR/link scorer, CI task-block suggestion flow, PR comment output, changed-file fixtures, and eval harness are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/taskLinks.ts
        - src/core/ci.ts
        - src/core/prAssistant.ts
        - src/core/taskLinkEval.ts
        - src/commands/link.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/core/prAssistant.test.ts
        - src/core/taskLinkEval.test.ts
        - src/cli.test.ts
      checks:
        - node dist/cli.js context JS-047 --json
        - node dist/cli.js related JS-047 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - Mapped JS-047 with Jumpspace context/related/audit and focused reads of src/core/taskLinks.ts, src/core/ci.ts, src/core/prAssistant.ts, src/core/taskLinkEval.ts, src/commands/link.ts, CLI/core tests, and fixtures/link-eval/source-evidence.json. The low-level scorer already rejects zero matched_terms candidates before status/source scoring, and CI task-block suggestions include rejected_candidate_matches, but PR assistant review items only summarize linked candidates and do not directly expose useful/rejected candidate evidence to the review item; CLI integration coverage should exercise messy multi-heading --since paths for ci/pr/link suggest.
    - id: fixture-reproduction
      outcome: A checked-in fixture or integration test reproduces multiple unrelated headings sharing one changed-file pool with previously empty-evidence candidates.
      status: complete
      depends_on:
        - orient
      source_files:
        - fixtures/link-eval/messy-repo-pr-scorer.json
        - src/core/taskLinkEval.ts
      tests:
        - src/core/taskLinkEval.test.ts
        - src/core/ci.test.ts
        - src/core/prAssistant.test.ts
      checks:
        - node dist/cli.js link eval --file fixtures/link-eval/messy-repo-pr-scorer.json --json
        - npm test -- src/core/taskLinkEval.test.ts src/core/ci.test.ts src/core/prAssistant.test.ts
      evidence:
        - Added and verified fixtures/link-eval/messy-repo-pr-scorer.json plus focused tests for the Claude messy-repo failure shape. node dist/cli.js link eval --file fixtures/link-eval/messy-repo-pr-scorer.json --json passed 4/4 cases with top1_accuracy 1 and mean_reciprocal_rank 1; npm test -- src/core/taskLinkEval.test.ts src/core/prAssistant.test.ts src/core/ci.test.ts src/cli.test.ts passed 4 files/28 tests. The fixture proves quarterly metrics, password entry, and local development headings choose different top files from the same candidate pool, while unrelated headings reject all touched files with NO_SOURCE_EVIDENCE and empty matched_terms.
    - id: scorer-surfaces
      outcome: link suggest --since, ci, and pr comment surfaces only promote source-evidenced candidates and expose rejected/weak candidates with machine-readable reasons.
      status: complete
      depends_on:
        - fixture-reproduction
      source_files:
        - src/core/taskLinks.ts
        - src/core/ci.ts
        - src/core/prAssistant.ts
        - src/commands/link.ts
        - src/core/schemas.ts
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/core/prAssistant.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/core/taskLinks.test.ts src/core/ci.test.ts src/core/prAssistant.test.ts src/cli.test.ts src/schemaArtifacts.test.ts
      evidence:
        - "Implemented JS-047 scorer surfaces across PR assistant JSON/Markdown and schema contracts. src/core/prAssistant.ts now exposes task-block useful_candidates and rejected_candidates, and review comments include useful_candidate/rejected_candidate evidence lines with score, matched_terms, match_reasons, and NO_SOURCE_EVIDENCE reasons. src/core/schemas.ts now makes pr.comment review_items explicit for task_block/repair/gap and requires useful_candidates/rejected_candidates for task blocks; schemas/pr.comment.schema.json and schemas/catalog.json were regenerated. Verification passed: npm run generate:schemas generated 47 schema artifacts; npm test -- src/core/taskLinks.test.ts src/core/ci.test.ts src/core/prAssistant.test.ts src/cli.test.ts src/schemaArtifacts.test.ts passed 5 files/28 tests; node dist/cli.js schema show pr.comment --json showed review_items task_block anyOf with useful_candidates and rejected_candidates; node dist/cli.js schema coverage --json returned ok true with declared/catalog/artifacts/sdk_names 47 and 0 issues; node dist/cli.js link eval --file fixtures/link-eval/messy-repo-pr-scorer.json --json passed 4/4 cases."
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, schema coverage, link eval, and handoff pass.
      status: complete
      depends_on:
        - scorer-surfaces
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/taskLinks.test.ts
        - src/core/ci.test.ts
        - src/core/prAssistant.test.ts
        - src/core/taskLinkEval.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-047 --json
        - node dist/cli.js schema coverage --json
        - node dist/cli.js link eval --file fixtures/link-eval/messy-repo-pr-scorer.json --json
        - node dist/cli.js handoff --task JS-047 --json
      evidence:
        - "Final JS-047 verification passed. npm test passed 42 files/167 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json produced jumpspace@0.1.0 with 295 entries, dist/cli.js mode 493/0755, and schemas/pr.comment.schema.json included; node dist/cli.js scan indexed 47 tasks; node dist/cli.js semantic build --json rebuilt 47 semantic documents with expected local-task-vector fallback because optional LanceDB/ONNX dependencies are not installed; audit --json and doctor --json returned ok true with no issues; plan validate JS-047 --json returned ok true; schema coverage --json returned declared/catalog/artifacts/sdk_names 47 with 0 issues; link eval --file fixtures/link-eval/messy-repo-pr-scorer.json --json passed 4/4 with top1_accuracy 1 and mean_reciprocal_rank 1; handoff --task JS-047 --json returned status ready with pending final-verify before this completion; release doctor --json returned ready with 0 local blockers/warnings and registry unknown because registry check was not requested. jumpspace verify was not run because git status/git rev-parse fail in this workspace: it is not a Git repository, so commit SHA capture is unavailable."
acceptance_criteria:
  - id: AC-1
    description: A checked-in fixture reproduces the messy-repo failure where multiple unrelated headings share one changed-file pool and previously received identical candidates with empty matched terms.
  - id: AC-2
    description: "`jumpspace pr comment --since <ref>` and `jumpspace link suggest <id> --since <ref>` both rank useful candidates only when source evidence exists, and otherwise surface them as rejected or weak evidence."
  - id: AC-3
    description: Per-heading candidate output differs when heading intent differs, unless shared candidates have explicit path, basename, identifier, phrase, or bounded content evidence for each heading.
  - id: AC-4
    description: JSON output includes enough evidence details for an agent to explain why a candidate was useful, rejected, or unanswered without reading source code.
  - id: AC-5
    description: Link eval and CI/PR assistant tests fail if empty-evidence changed files are promoted as useful candidates.
-->

Claude's messy-repo test still reported the PR bot proposing the same touched files for unrelated headings, with `score: 5` and `matched_terms: []`. That is the exact trust failure Jumpspace cannot hand-wave away. The next scorer slice should capture that reproduction as a fixture, exercise the actual `pr comment --since` and `link suggest --since` surfaces, and make the output either genuinely source-evidence ranked or explicitly rejected as weak.

### Installed CLI freshness doctor

<!-- jumpspace
id: JS-048
type: engineering
status: implemented
module: package-contracts
space: repo
keywords:
  - npm link
  - install freshness
  - active binary
  - Claude testing
  - release doctor
code:
  - src/core/releaseDoctor.ts
  - src/commands/release.ts
  - src/cli.ts
  - src/core/schemas.ts
  - src/core/installDoctor.ts
  - src/sdk/contracts.ts
  - sdk/python/jumpspace_sdk/contracts.py
  - README.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - schemas/release.install-doctor.schema.json
  - schemas/catalog.json
tests:
  - src/core/releaseDoctor.test.ts
  - src/cli.test.ts
  - src/schemaArtifacts.test.ts
  - src/core/installDoctor.test.ts
  - src/sdk/contracts.test.ts
  - src/core/agentSkills.test.ts
  - sdk/python/tests/test_contracts.py
gaps: []
depends_on:
  - JS-033
  - JS-036
  - JS-042
refs:
  - type: related_to
    id: JS-042
    note: Release doctor proves the repo-local package is publishable; install freshness should prove the binary an agent is actually running is the same build.
plan:
  task_id: JS-048
  goal: Add an install-freshness doctor so agents can prove which Jumpspace binary they are actually running and detect stale npm-link or cached installs.
  status: complete
  steps:
    - id: orient
      outcome: Current release doctor, CLI command layout, schema/SDK surfaces, tests, and JS-048 dependencies are mapped.
      status: complete
      depends_on: []
      source_files:
        - src/core/releaseDoctor.ts
        - src/commands/release.ts
        - src/cli.ts
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
      tests:
        - src/core/releaseDoctor.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
      checks:
        - node dist/cli.js context JS-048 --json
        - node dist/cli.js related JS-048 --json --compact
        - node dist/cli.js audit --json
        - node dist/cli.js schema coverage --json
      evidence:
        - Oriented JS-048 with Jumpspace context/related/audit/schema coverage and focused source reads of src/core/releaseDoctor.ts, src/commands/release.ts, src/cli.ts, src/core/releaseDoctor.test.ts, src/cli.test.ts, src/sdk/contracts.ts, and sdk/python/jumpspace_sdk/contracts.py. Dependencies JS-033, JS-036, and JS-042 are implemented. Existing release doctor proves repo-local package readiness but does not identify the actual binary an agent invoked or the PATH-resolved jumpspace command. Implementation should add a sibling release install-doctor command that reports invoked binary, realpath, PATH binary, package root/version, CLI-visible version, schema count, workspace comparison, and factual stale-install warnings.
    - id: install-doctor-core-cli
      outcome: A CLI command reports invoked and PATH-resolved Jumpspace binaries, package roots, versions, schema counts, workspace comparison, and stale-install warnings.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/installDoctor.ts
        - src/commands/release.ts
        - src/cli.ts
      tests:
        - src/core/installDoctor.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/installDoctor.test.ts src/cli.test.ts
        - node dist/cli.js release install-doctor --json
      evidence:
        - "Implemented release install-doctor core and CLI: src/core/installDoctor.ts inspects the invoked binary and PATH-resolved jumpspace, probes --version and schema list --json, compares both against the current workspace dist/cli.js, and reports stale-install warnings plus repair commands. Wired node dist/cli.js release install-doctor [--json] through src/commands/release.ts and src/cli.ts. Verification passed: npm test -- src/core/installDoctor.test.ts src/cli.test.ts passed; node dist/cli.js release install-doctor --json returned ok true/status current with invoked dist/cli.js, PATH /opt/homebrew/bin/jumpspace -> dist/cli.js, version 0.1.0, schema_count 48, and no warnings/blockers."
    - id: schemas-sdk-docs
      outcome: Install doctor has a published schema, SDK schema-name contracts, README docs, and agent guidance.
      status: complete
      depends_on:
        - install-doctor-core-cli
      source_files:
        - src/core/schemas.ts
        - src/sdk/contracts.ts
        - sdk/python/jumpspace_sdk/contracts.py
        - README.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
        - docs/specs/jumpspace-v0.md
        - schemas/release.install-doctor.schema.json
        - schemas/catalog.json
      tests:
        - src/schemaArtifacts.test.ts
        - src/sdk/contracts.test.ts
        - sdk/python/tests/test_contracts.py
        - src/core/agentSkills.test.ts
      checks:
        - npm run generate:schemas
        - npm test -- src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts
        - python3 -m unittest discover -s sdk/python/tests
        - node dist/cli.js schema show release.install-doctor --json
        - node dist/cli.js schema coverage --json
      evidence:
        - "Published release.install-doctor as an agent-facing JSON contract: added the schema declaration and schemaCatalog entry, generated schemas/release.install-doctor.schema.json and updated schemas/catalog.json, added TypeScript and Python SDK schema names/types, and documented install-doctor in README, static agent templates, and generated agent skill guidance. Verification passed: npm run generate:schemas generated 48 schema artifacts; npm test -- src/schemaArtifacts.test.ts src/sdk/contracts.test.ts src/core/agentSkills.test.ts passed 3 files/7 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; node dist/cli.js schema show release.install-doctor --json returned ok; node dist/cli.js schema coverage --json returned declared/catalog/artifacts/sdk_names 48 with 0 issues."
    - id: final-verify
      outcome: Full tests, Python contracts, build, package dry-run, scan, semantic rebuild, audit, doctor, plan validation, schema coverage, release doctor, install doctor, and handoff pass.
      status: complete
      depends_on:
        - schemas-sdk-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - src/core/installDoctor.test.ts
        - src/cli.test.ts
        - src/schemaArtifacts.test.ts
      checks:
        - npm test
        - python3 -m unittest discover -s sdk/python/tests
        - npm run build
        - env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        - node dist/cli.js release doctor --json
        - node dist/cli.js release install-doctor --json
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-048 --json
        - node dist/cli.js schema coverage --json
        - node dist/cli.js handoff --task JS-048 --json
      evidence:
        - Final JS-048 verification passed. npm test passed 43 files/171 tests; python3 -m unittest discover -s sdk/python/tests passed 3 tests; npm run build passed and regenerated dist with dist/cli.js executable; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json produced jumpspace-0.1.0.tgz with 299 entries, dist/cli.js mode 493/0755, dist/core/installDoctor.js, schemas/release.install-doctor.schema.json, README/LICENSE/templates/SDK files included; node dist/cli.js release doctor --json returned ok true/status ready with 0 local blockers/warnings and registry unknown because check not requested; node dist/cli.js release install-doctor --json returned ok true/status current with invoked dist/cli.js and PATH /opt/homebrew/bin/jumpspace both resolving to the workspace dist, version 0.1.0, schema_count 48, and no warnings/blockers; node dist/cli.js scan indexed 48 tasks; node dist/cli.js semantic build --json rebuilt 48 documents with expected local-task-vector fallback because optional LanceDB/ONNX dependencies are not installed; audit --json, doctor --json, plan validate JS-048 --json, schema coverage --json, and handoff --task JS-048 --json all returned ok true. jumpspace verify was not run because this workspace is not a Git repository, so commit SHA capture is unavailable.
acceptance_criteria:
  - id: AC-1
    description: A command reports the active `jumpspace` binary path, resolved symlink target, package root, package version, CLI-visible version, and schema count from that binary.
  - id: AC-2
    description: The report compares the active binary against the current workspace `package.json`, `dist/cli.js`, and schema catalog when run from a Jumpspace checkout.
  - id: AC-3
    description: Stale npm-link or cached-install states are surfaced as factual warnings with concrete repair commands such as `npm run build`, `npm link`, or `hash -r`.
  - id: AC-4
    description: JSON output is schema-published and includes enough evidence for Claude/Codex to explain why it is testing an old or current build.
  - id: AC-5
    description: Release doctor or a sibling install doctor can distinguish local package readiness from active-install freshness without network access.
-->

Claude's latest external test saw `jumpspace --version` report `0.0.0`, missing write-side schemas, and an old executable-mode failure even though the current repo-local `dist` reports `0.1.0`, has executable `dist/cli.js`, and exposes the write-side schemas. That is not a release-hygiene defect anymore; it is an install-freshness and binary-discovery defect. Agents need one command that answers "which Jumpspace am I running?" before they burn time debugging stale global links or shell command caches.

### Astro Starlight documentation site

<!-- jumpspace
id: JS-049
type: engineering
status: implemented
module: docs
space: repo
keywords:
  - astro
  - starlight
  - documentation
  - cloud
  - getting started
code:
  - .jumpspace/config.json
  - docs/package.json
  - docs/package-lock.json
  - docs/astro.config.mjs
  - docs/tsconfig.json
  - docs/.gitignore
  - docs/src/content/config.ts
  - docs/src/content/docs/index.md
  - docs/src/content/docs/getting-started/index.md
  - docs/src/content/docs/getting-started/task-blocks.md
  - docs/src/content/docs/getting-started/first-agent-workflow.md
  - docs/src/content/docs/core-concepts/tasks-and-graph.md
  - docs/src/content/docs/core-concepts/json-contracts.md
  - docs/src/content/docs/advanced/bootstrap.md
  - docs/src/content/docs/advanced/planning-and-verification.md
  - docs/src/content/docs/advanced/retrieval-and-graph-queries.md
  - docs/src/content/docs/advanced/drift-ci-and-repair.md
  - docs/src/content/docs/advanced/agent-skills.md
  - docs/src/content/docs/reference/cli.md
  - docs/src/content/docs/getting-started/new-repo.md
  - docs/src/content/docs/agents/using-with-agents.md
  - docs/src/content/docs/getting-started/why-jumpspace.md
  - docs/netlify.toml
  - docs/src/content/docs/jumpspace-cloud.md
tests:
  - docs/scripts/check-docs.mjs
gaps: []
depends_on:
  - JS-007
  - JS-023
  - JS-033
refs:
  - type: related_to
    id: JS-007
    note: The docs site should expand the README quickstart into a hosted learning path.
plan:
  task_id: JS-049
  goal: Create a separate Astro Starlight documentation module under docs that teaches Jumpspace from quickstart through advanced agent workflows and can be hosted as a static site.
  status: complete
  steps:
    - id: orient
      outcome: Existing README, CLI surfaces, schemas, and docs module constraints are mapped before implementation.
      status: complete
      depends_on: []
      source_files:
        - README.md
        - .jumpspace/config.json
        - docs/specs/jumpspace-v0.md
        - package.json
      tests: []
      checks:
        - node dist/cli.js context JS-049 --json
        - node dist/cli.js related JS-049 --json --compact
        - node dist/cli.js audit --json
      evidence:
        - Used Jumpspace context, related, audit, help, and README reads to confirm JS-049 scope, dependencies JS-007/JS-023/JS-033, CLI surfaces, and docs-module constraints. Tightened root scan config to docs/specs/**/*.md so Starlight instructional pages do not become task metadata.
    - id: starlight-shell
      outcome: The docs directory contains an Astro Starlight module with package scripts, Astro config, content config, and static output.
      status: complete
      depends_on:
        - orient
      source_files:
        - docs/package.json
        - docs/package-lock.json
        - docs/astro.config.mjs
        - docs/tsconfig.json
        - docs/netlify.toml
        - docs/.gitignore
        - docs/src/content/config.ts
      tests: []
      checks:
        - npm --prefix docs run build
      evidence:
        - Added separate docs Astro Starlight module with docs/package.json, package-lock.json, astro.config.mjs, tsconfig.json, netlify.toml, .gitignore, and src/content/config.ts. npm install completed and npm run build passed after disabling Astro telemetry in package scripts for sandboxed/agent builds.
    - id: beginner-docs
      outcome: Getting-started documentation teaches installation, initialization, scanning, task blocks, context, and the first agent workflow.
      status: complete
      depends_on:
        - starlight-shell
      source_files:
        - docs/src/content/docs/index.md
        - docs/src/content/docs/getting-started/index.md
        - docs/src/content/docs/getting-started/task-blocks.md
        - docs/src/content/docs/getting-started/first-agent-workflow.md
        - docs/src/content/docs/core-concepts/tasks-and-graph.md
      tests: []
      checks:
        - rg -n "Quickstart|task block|jumpspace scan|jumpspace context|jumpspace work" docs/src/content/docs
      evidence:
        - Added beginner docs covering the homepage overview, getting started path, task block format, first agent workflow, and tasks/graph concepts. Coverage check passed with rg -n "Quickstart|task block|jumpspace scan|jumpspace context|jumpspace work" docs/src/content/docs.
    - id: advanced-reference-docs
      outcome: Advanced and reference docs cover bootstrap, planning, verification, retrieval, graph queries, drift, CI, repair, agent skills, schemas, SDKs, release diagnostics, and Jumpspace Cloud.
      status: complete
      depends_on:
        - beginner-docs
      source_files:
        - docs/src/content/docs/core-concepts/json-contracts.md
        - docs/src/content/docs/advanced/bootstrap.md
        - docs/src/content/docs/advanced/planning-and-verification.md
        - docs/src/content/docs/advanced/retrieval-and-graph-queries.md
        - docs/src/content/docs/advanced/drift-ci-and-repair.md
        - docs/src/content/docs/advanced/agent-skills.md
        - docs/src/content/docs/reference/cli.md
        - docs/src/content/docs/jumpspace-cloud.md
      tests: []
      checks:
        - rg -n "bootstrap|verify|semantic|query|drift|ci|repair|add-skill|schema|release install-doctor|Jumpspace Cloud" docs/src/content/docs
      evidence:
        - Added advanced and reference docs for bootstrap, durable planning, verification, retrieval, graph queries, semantic search, drift, CI, repair, agent skills, JSON schemas/SDKs, CLI reference, and Jumpspace Cloud. Coverage check passed with rg -n "bootstrap|verify|semantic|query|drift|ci|repair|add-skill|schema|release install-doctor|Jumpspace Cloud" docs/src/content/docs.
    - id: final-verify
      outcome: Docs module files, Jumpspace scan/audit/doctor, plan validation, handoff, and available docs build checks pass or report truthful dependency constraints.
      status: complete
      depends_on:
        - advanced-reference-docs
      source_files:
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
        - docs/specs/jumpspace-v0.md
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs run build
        - npm --prefix docs test
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js audit --json
        - node dist/cli.js doctor --json
        - node dist/cli.js plan validate JS-049 --json
        - node dist/cli.js handoff --task JS-049 --json
      evidence:
        - "Latest verification passed for the available checks: npm test in docs passed the docs structure check; npm run build in docs built the static site; source grep found no stale host references; node dist/cli.js scan indexed 49 tasks; semantic build refreshed 49 documents using local-task-vector-v1 fallback because optional LanceDB/ONNX dependencies are not installed; audit --json returned ok true with no issues; doctor --json returned ok true with no warnings or suggestions; plan validate JS-049 --json returned ok true; handoff --task JS-049 --json returned ready. jumpspace verify was attempted previously and correctly refused to write a verification record with GIT_COMMIT_UNAVAILABLE because /Users/christopherrote/jumpspace is not a Git repository."
acceptance_criteria:
  - id: AC-1
    description: A separate Astro Starlight docs module exists under docs with its own package, config, content collection, and static build scripts.
  - id: AC-2
    description: The docs site starts with a beginner quickstart covering installation, init, scan, task blocks, context, and the first agent workflow.
  - id: AC-3
    description: Advanced docs cover bootstrap, durable planning, verification, retrieval, graph queries, drift, CI/PR assistant, repair, agent skills, schemas, SDKs, and release/install diagnostics.
  - id: AC-4
    description: The docs include a CLI reference page organized by workflow and a Jumpspace Cloud page for early design partners.
  - id: AC-5
    description: The root Jumpspace graph indexes the docs-site task and final verification includes build or a truthful explanation if dependency installation is unavailable.
-->

Jumpspace needs a hosted documentation site that teaches humans and agents how to use the tool without making the README carry every explanation. The first version should be a separate Astro Starlight module rooted at `docs/`, keep the existing spec docs intact, and provide a static documentation site with beginner and advanced paths.

### OSS launch readiness

<!-- jumpspace
id: JS-050
type: engineering
status: partial
module: launch
space: repo
keywords:
  - oss launch
  - github templates
  - docs hosting
  - npm publish
  - release readiness
code:
  - CHANGELOG.md
  - CONTRIBUTING.md
  - SECURITY.md
  - SUPPORT.md
  - CODE_OF_CONDUCT.md
  - LICENSE
  - NOTICE
  - TRADEMARKS.md
  - package.json
  - package-lock.json
  - .github/PULL_REQUEST_TEMPLATE.md
  - .github/ISSUE_TEMPLATE/config.yml
  - .github/ISSUE_TEMPLATE/bug_report.yml
  - .github/ISSUE_TEMPLATE/feature_request.yml
  - .github/workflows/ci.yml
  - .github/workflows/jumpspace.yml
  - .github/workflows/publish.yml
  - .github/dependabot.yml
  - docs/astro.config.mjs
  - docs/src/content/docs/jumpspace-cloud.md
  - launch/jumpspace-launch-readiness.md
tests:
  - src/packageHygiene.test.ts
  - src/core/releaseDoctor.test.ts
  - src/cli.test.ts
  - docs/scripts/check-docs.mjs
gaps:
  - Docs canonical URL is https://docs.jumpspace.ai, but local and escalated curl could not resolve docs.jumpspace.ai on 2026-06-28, so deployed route verification remains pending.
  - npm public publish and install smoke test require npm credentials; the package is now scoped as @jumpspace/cli and registry publish/install verification remains pending.
  - GitHub public repository and latest main CI run are visible for Jumpspace-AI/jumpspace, but branch protection, private security advisories, labels, release notes, and Dependabot PR failures still require hosted GitHub follow-up.
depends_on:
  - JS-033
  - JS-042
  - JS-048
  - JS-049
refs:
  - type: related_to
    id: JS-031
    note: Launch readiness includes the repo-local GitHub Actions workflow installed by Jumpspace.
plan:
  task_id: JS-050
  goal: Prepare Jumpspace for an OSS launch with local hygiene, docs deployment configuration, roadmap tracking, and explicit external release checks.
  status: in_progress
  steps:
    - id: local-oss-hygiene
      outcome: Repo-local OSS launch files and GitHub templates/workflows exist for contributors and CI.
      status: complete
      depends_on: []
      source_files:
        - CHANGELOG.md
        - CONTRIBUTING.md
        - SECURITY.md
        - SUPPORT.md
        - CODE_OF_CONDUCT.md
        - LICENSE
        - NOTICE
        - TRADEMARKS.md
        - .github/PULL_REQUEST_TEMPLATE.md
        - .github/ISSUE_TEMPLATE/config.yml
        - .github/ISSUE_TEMPLATE/bug_report.yml
        - .github/ISSUE_TEMPLATE/feature_request.yml
        - .github/workflows/ci.yml
        - .github/workflows/jumpspace.yml
        - .github/workflows/publish.yml
        - .github/dependabot.yml
        - package.json
        - package-lock.json
      tests:
        - src/packageHygiene.test.ts
        - src/core/releaseDoctor.test.ts
        - src/cli.test.ts
      checks:
        - npm run build
        - npm test
        - node dist/cli.js release doctor --json
      evidence:
        - Added OSS hygiene docs, GitHub issue and PR templates, CI, Jumpspace PR assistant workflow, Dependabot config, tag-triggered npm publish workflow, and included CHANGELOG.md in the npm package files list. Package metadata now points at https://github.com/Jumpspace-AI/jumpspace. Jumpspace Core is Apache-2.0 and Jumpspace name/logo trademark notice files are included in source and package metadata. Root build and full test suite passed locally.
    - id: docs-cloud-page
      outcome: The docs module has canonical site URL configuration and a Jumpspace Cloud design-partner page.
      status: complete
      depends_on:
        - local-oss-hygiene
      source_files:
        - docs/astro.config.mjs
        - docs/src/content/docs/jumpspace-cloud.md
        - docs/netlify.toml
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs test
        - npm --prefix docs run build
      evidence:
        - Updated Astro config to prefer DOCS_SITE_URL, then hosted build URL, then the docs.jumpspace.ai fallback. The docs site now includes a Jumpspace Cloud design-partner page with the hi@jumpspace.ai contact. Docs structure check and Starlight build passed locally.
    - id: jumpspace-launch-tracker
      outcome: Launch readiness is tracked as Jumpspace-specific roadmap/workbook data instead of the earlier generic document-ticket framing.
      status: complete
      depends_on:
        - local-oss-hygiene
      source_files:
        - launch/jumpspace-launch-readiness.md
        - launch/jumpspace_oss_launch_plan.xlsx
        - docs/specs/jumpspace-v0.md
      tests: []
      checks:
        - node dist/cli.js scan
        - node dist/cli.js audit --json
      evidence:
        - Added a Jumpspace-specific launch readiness tracker and generated launch/jumpspace_oss_launch_plan.xlsx from the launch checklist. Jumpspace scan indexed 50 tasks.
    - id: external-docs-hosting-verify
      outcome: The docs site is deployed and the production URL is recorded.
      status: pending
      depends_on:
        - docs-cloud-page
      source_files:
        - docs/netlify.toml
        - docs/astro.config.mjs
      tests: []
      checks:
        - npm --prefix docs run build
        - curl -I <production-docs-url>
      evidence:
        - Canonical docs URL is https://docs.jumpspace.ai. Local sandbox curl and escalated curl both failed DNS resolution for docs.jumpspace.ai on 2026-06-28, so deployed route verification remains pending.
    - id: external-npm-verify
      outcome: The npm package name/version, publish path, and clean public install are verified against the registry.
      status: pending
      depends_on:
        - local-oss-hygiene
      source_files:
        - package.json
        - dist/cli.js
      tests: []
      checks:
        - node dist/cli.js release doctor --check-registry --json
        - npm pack --dry-run --json
        - npm install -g @jumpspace/cli@<version>
      evidence:
        - Package publication and clean public install for @jumpspace/cli remain blocked until npm credentials and a semver release tag are available.
    - id: external-github-verify
      outcome: GitHub CI, release notes, labels, branch protection, and security settings are verified in the hosted repository.
      status: pending
      depends_on:
        - local-oss-hygiene
      source_files:
        - .github/workflows/ci.yml
        - .github/workflows/jumpspace.yml
        - .github/ISSUE_TEMPLATE/config.yml
        - .github/PULL_REQUEST_TEMPLATE.md
      tests: []
      checks:
        - gh pr checks
        - gh release view
        - gh api repos/<owner>/<repo>/branches/main/protection
      evidence:
        - The local workspace is now a git repository with origin https://github.com/Jumpspace-AI/jumpspace.git and a clean worktree before metadata updates. Public GitHub API returned 200 for Jumpspace-AI/jumpspace. The latest main CI run was successful at https://github.com/Jumpspace-AI/jumpspace/actions/runs/28322339496, but Dependabot PR CI runs were failing, branch protection API returned 401 without valid credentials, and gh auth tokens were invalid locally, so release/admin settings remain unverified.
acceptance_criteria:
  - id: AC-1
    description: Repo-local OSS hygiene files exist for changelog, contributing, security, support, and conduct.
  - id: AC-2
    description: GitHub PR, issue, CI, PR assistant, and dependency update templates exist locally.
  - id: AC-3
    description: Docs build has a configured Astro site URL path suitable for hosted static docs and local verification.
  - id: AC-4
    description: A Jumpspace-specific launch tracker replaces the generic document-ticket spreadsheet assumptions.
  - id: AC-5
    description: External launch blockers are explicit rather than marked complete without credentials or hosted evidence.
-->

The OSS launch checklist should describe Jumpspace as it exists now, not the earlier generic document-ticket CLI. Local readiness includes the package, docs, OSS files, and GitHub workflow scaffolding. Hosted readiness remains external until docs hosting, npm, and GitHub repository checks can be verified with live credentials.

### Apache core license and trademark policy

<!-- jumpspace
id: JS-051
type: engineering
status: implemented
module: launch
space: repo
keywords:
  - apache license
  - trademark policy
  - oss launch
  - package metadata
code:
  - LICENSE
  - NOTICE
  - TRADEMARKS.md
  - README.md
  - package.json
  - package-lock.json
  - src/core/releaseDoctor.ts
  - docs/specs/jumpspace-v0.md
  - launch/jumpspace-launch-readiness.md
tests:
  - src/packageHygiene.test.ts
  - src/core/releaseDoctor.test.ts
  - src/cli.test.ts
gaps: []
depends_on:
  - JS-033
  - JS-050
refs:
  - type: related_to
    id: JS-033
    note: Package hygiene and release doctor should report the current core license and required notice files.
  - type: related_to
    id: JS-050
    note: OSS launch readiness needs a clear split between open-source core code and controlled brand assets.
plan:
  task_id: JS-051
  goal: Change Jumpspace Core to Apache-2.0 while making the Jumpspace name and logo trademark-controlled by the company.
  status: complete
  steps:
    - id: license-files
      outcome: Source license files express Apache-2.0 for Jumpspace Core and trademark control for the Jumpspace name/logo.
      status: complete
      depends_on: []
      source_files:
        - LICENSE
        - NOTICE
        - TRADEMARKS.md
        - README.md
      tests: []
      checks:
        - rg -n "Apache-2.0|Trademark|TRADEMARKS|NOTICE" LICENSE NOTICE TRADEMARKS.md README.md
      evidence:
        - Replaced the prior license file with Apache License 2.0 text, added NOTICE for Jumpspace Core and brand notice, added TRADEMARKS.md stating the Jumpspace name/logo are controlled by Jumpspace AI, and added a README License and Trademarks section.
    - id: package-metadata
      outcome: Package metadata, package contents, and release doctor required files include the Apache license and trademark/notice files.
      status: complete
      depends_on:
        - license-files
      source_files:
        - package.json
        - package-lock.json
        - src/core/releaseDoctor.ts
      tests:
        - src/packageHygiene.test.ts
        - src/core/releaseDoctor.test.ts
        - src/cli.test.ts
      checks:
        - npx vitest run src/packageHygiene.test.ts src/core/releaseDoctor.test.ts src/cli.test.ts
        - npm run build
        - node dist/cli.js release doctor --json
      evidence:
        - Set package license to Apache-2.0, included NOTICE and TRADEMARKS.md in package files, required those files in release doctor package checks, and updated package hygiene, release doctor, and CLI fixtures.
    - id: roadmap-and-launch
      outcome: Jumpspace task metadata and launch tracker reflect the Apache core and controlled trademark policy.
      status: complete
      depends_on:
        - package-metadata
      source_files:
        - docs/specs/jumpspace-v0.md
        - launch/jumpspace-launch-readiness.md
        - launch/jumpspace_oss_launch_plan.xlsx
      tests: []
      checks:
        - node dist/cli.js scan
        - node dist/cli.js audit --json
        - node dist/cli.js plan validate JS-051 --json
      evidence:
        - Added JS-051 and updated JS-050 launch metadata so the roadmap tracks Apache-2.0 core licensing and Jumpspace trademark controls.
acceptance_criteria:
  - id: AC-1
    description: package.json uses SPDX license Apache-2.0 for Jumpspace Core.
  - id: AC-2
    description: LICENSE contains Apache License 2.0 terms.
  - id: AC-3
    description: NOTICE and TRADEMARKS.md state that the Jumpspace name/logo and related brand assets are controlled by Jumpspace AI and are not granted by Apache-2.0.
  - id: AC-4
    description: npm package files and release doctor required-file checks include LICENSE, NOTICE, and TRADEMARKS.md.
  - id: AC-5
    description: README and launch tracking explain the license/trademark split.
-->

Jumpspace Core should be licensed as Apache-2.0 while the Jumpspace name, logo, and related brand assets remain trademark-controlled by Jumpspace AI. Package metadata, package dry-run checks, source notices, and launch docs should make that split clear before public release.

### First-contact docs and agent skills experience

<!-- jumpspace
id: JS-052
type: engineering
status: implemented
module: docs
space: repo
keywords:
  - README
  - documentation
  - first contact
  - agent skills
  - quickstart
code:
  - README.md
  - skills/README.md
  - docs/astro.config.mjs
  - docs/scripts/check-docs.mjs
  - docs/public/llms.txt
  - docs/public/llms-full.txt
  - docs/src/content/docs/index.md
  - docs/src/content/docs/start-here/welcome.md
  - docs/src/content/docs/start-here/quickstart.md
  - docs/src/content/docs/start-here/existing-repo-bootstrap.md
  - docs/src/content/docs/start-here/agent-setup.md
  - docs/src/content/docs/start-here/why-jumpspace.md
  - docs/src/content/docs/start-here/faq.md
  - docs/src/content/docs/workflows/add-jumpspace-to-a-repo.md
  - docs/src/content/docs/workflows/bootstrap-existing-docs.md
  - docs/src/content/docs/workflows/canonical-demo.md
  - docs/src/content/docs/workflows/ask-questions-with-evidence.md
  - docs/src/content/docs/workflows/start-agent-work.md
  - docs/src/content/docs/workflows/verify-work.md
  - docs/src/content/docs/workflows/review-pr-drift.md
  - docs/src/content/docs/workflows/handoff-between-agents.md
  - docs/src/content/docs/agent-skills/overview.md
  - docs/src/content/docs/agent-skills/claude-code.md
  - docs/src/content/docs/agent-skills/codex.md
  - docs/src/content/docs/agent-skills/cursor.md
  - docs/src/content/docs/agent-skills/github-copilot.md
  - docs/src/content/docs/agent-skills/opencode.md
  - docs/src/content/docs/agent-skills/manual-install.md
  - docs/src/content/docs/agent-skills/skill-authoring.md
  - docs/src/content/docs/core-concepts/task-blocks.md
  - docs/src/content/docs/core-concepts/source-backed-memory.md
  - docs/src/content/docs/core-concepts/plans.md
  - docs/src/content/docs/core-concepts/acceptance-criteria.md
  - docs/src/content/docs/core-concepts/verification-records.md
  - docs/src/content/docs/core-concepts/dependencies-and-refs.md
  - docs/src/content/docs/core-concepts/drift-and-repair.md
  - docs/src/content/docs/core-concepts/semantic-retrieval.md
  - docs/src/content/docs/reference/cli.md
  - docs/src/content/docs/reference/json-schemas.md
  - docs/src/content/docs/reference/config.md
  - docs/src/content/docs/reference/status-lifecycle.md
  - docs/src/content/docs/reference/error-envelopes.md
  - docs/src/content/docs/reference/ci.md
  - docs/src/content/docs/reference/sdks.md
  - docs/src/content/docs/contribute/development-setup.md
  - docs/src/content/docs/contribute/adding-commands.md
  - docs/src/content/docs/contribute/adding-schemas.md
  - docs/src/content/docs/contribute/adding-skills.md
  - docs/src/content/docs/contribute/future-improvements.md
  - docs/src/content/docs/contribute/release-checklist.md
tests:
  - docs/scripts/check-docs.mjs
gaps: []
depends_on:
  - JS-007
  - JS-049
  - JS-050
refs:
  - type: related_to
    id: JS-049
    note: The existing Starlight docs site is expanded into a first-contact documentation IA.
  - type: related_to
    id: JS-007
    note: The README quickstart is rewritten as a landing page and detailed command material moves into docs.
plan:
  task_id: JS-052
  goal: Upgrade the README, docs information architecture, and agent skills experience so skeptical developers understand Jumpspace quickly and agents have clear workflow routing.
  status: complete
  steps:
    - id: orient
      outcome: Existing README, Starlight docs, agent guidance, docs scripts, and CLI help are audited before edits.
      status: complete
      depends_on: []
      source_files:
        - README.md
        - docs/astro.config.mjs
        - docs/scripts/check-docs.mjs
        - docs/src/content/docs/reference/cli.md
      tests: []
      checks:
        - node dist/cli.js find docs README documentation agents getting started --mode any --json --compact
        - node dist/cli.js context JS-049 --json
        - node dist/cli.js --help
        - node dist/cli.js add-skill --help
        - node dist/cli.js bootstrap --help
        - node dist/cli.js work --help
      evidence:
        - Used Jumpspace find/context plus CLI help to confirm JS-049/JS-007 were the guiding docs tasks, identify the current command surface, and avoid documenting unsupported named skill installers.
    - id: readme-landing
      outcome: README is a concise landing page with a prominent Why Jumpspace section, first demo path, quick routes, generic example task block, and docs links.
      status: complete
      depends_on:
        - orient
      source_files:
        - README.md
      tests: []
      checks:
        - rg -n "Why Jumpspace|30-Second Demo|DOC-PROJECT-001|implementation memory" README.md
      evidence:
        - Rewrote README from a command encyclopedia into a landing page that positions Jumpspace as implementation memory for AI coding agents and routes exhaustive command detail to the docs.
    - id: docs-ia
      outcome: Starlight navigation exposes Start Here, Workflows, Agent Skills, Core Concepts, Reference, and Contribute sections with useful non-stub pages.
      status: complete
      depends_on:
        - readme-landing
      source_files:
        - docs/astro.config.mjs
        - docs/src/content/docs/index.md
        - docs/src/content/docs/start-here/quickstart.md
        - docs/src/content/docs/workflows/start-agent-work.md
        - docs/src/content/docs/workflows/canonical-demo.md
        - docs/src/content/docs/reference/cli.md
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs test
        - npm --prefix docs run build
      evidence:
        - Added the requested docs IA, expanded workflow/reference pages with copy-pasteable current commands, added a canonical demo flow and clearly marked future improvements page, updated Starlight sidebar, and passed docs structure check plus static docs build.
    - id: agent-skills
      outcome: Agent skills docs explain supported Codex/Claude installers, named pipeline skills, and manual paths for other agents without overclaiming unsupported integrations.
      status: complete
      depends_on:
        - docs-ia
      source_files:
        - skills/README.md
        - docs/src/content/docs/agent-skills/overview.md
        - docs/src/content/docs/agent-skills/claude-code.md
        - docs/src/content/docs/agent-skills/codex.md
        - docs/src/content/docs/agent-skills/manual-install.md
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - rg -n "does not ship a dedicated|jumpspace-work --agent|add-skill --all" skills docs/src/content/docs/agent-skills
      evidence:
        - Documented add-skill --all, --codex, --claude, and named pipeline installs as current support; Cursor, GitHub Copilot, and OpenCode remain described as manual or future native integrations.
    - id: final-verify
      outcome: Docs, README, task metadata, and package-facing docs checks pass after scan/audit/build.
      status: complete
      depends_on:
        - agent-skills
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
        - .jumpspace/semantic-index.json
      tests:
        - docs/scripts/check-docs.mjs
        - src/packageHygiene.test.ts
      checks:
        - npm --prefix docs test
        - npm --prefix docs run build
        - npm test -- src/packageHygiene.test.ts
        - node dist/cli.js scan
        - node dist/cli.js semantic build --json
        - node dist/cli.js plan validate JS-052 --json
        - node dist/cli.js audit --json
      evidence:
        - Final verification passed for docs test/build, package hygiene focused test, Jumpspace scan, semantic build, plan validation, and audit. Audit remains ok with only pre-existing JS-050 external launch gaps.
acceptance_criteria:
  - id: AC-1
    description: README acts as a concise landing page with a strong Why Jumpspace section, first demo path, generic example, and links into docs.
  - id: AC-2
    description: Docs sidebar exposes Start Here, Workflows, Agent Skills, Core Concepts, Reference, and Contribute sections.
  - id: AC-3
    description: CLI reference preserves exhaustive command coverage with supported commands and examples rather than unsupported promises.
  - id: AC-4
    description: Agent skills docs explain current Codex/Claude/add-skill support including named pipeline skills, and clearly mark unsupported native installers for other agents as manual/future paths.
  - id: AC-5
    description: llms.txt/llms-full.txt, canonical demo docs, future-improvement TODOs, and docs tests/build support agent-facing navigation and validation.
-->

Jumpspace should make first contact feel obvious: one clear promise, one first win, and direct routes for new repos, existing repo bootstrap, agents, workflows, and reference material. The README should sell the category without becoming the manual, and the docs site should carry the detailed command and agent workflow guidance.

## Named pipeline agent skills

<!-- jumpspace
id: JS-053
type: spec
status: verified
module: core-cli
space: repo
keywords:
  - add-skill
  - named skills
  - pipeline skills
  - codex
  - claude
code:
  - src/cli.ts
  - src/commands/addSkill.ts
  - src/core/agentSkills.ts
  - skills/README.md
  - docs/src/content/docs/agent-skills/overview.md
  - docs/src/content/docs/agent-skills/skill-authoring.md
  - docs/src/content/docs/agent-skills/codex.md
  - docs/src/content/docs/agent-skills/claude-code.md
  - docs/src/content/docs/start-here/agent-setup.md
  - docs/src/content/docs/reference/cli.md
tests:
  - src/core/agentSkills.test.ts
  - src/cli.test.ts
  - docs/scripts/check-docs.mjs
gaps: []
depends_on:
  - JS-014
  - JS-052
refs:
  - type: related_to
    id: JS-013
    note: Bootstrap work should be packaged as a named skill so an agent can build the first graph from existing docs.
  - type: related_to
    id: JS-017
    note: Work-packet execution should be packaged as a named skill for implementation starts.
  - type: related_to
    id: JS-046
    note: Handoff packet generation should be packaged as a named skill for agent switching.
plan:
  task_id: JS-053
  goal: Implement named pipeline agent skills so add-skill can install bootstrap, work, review, and handoff workflows for Codex or Claude Code.
  status: complete
  steps:
    - id: orient
      outcome: Existing agent skill installer, CLI command shape, docs references, and tests are inspected before edits.
      status: complete
      depends_on: []
      source_files:
        - src/core/agentSkills.ts
        - src/commands/addSkill.ts
        - src/cli.ts
        - src/core/agentSkills.test.ts
        - src/cli.test.ts
      tests: []
      checks:
        - node dist/cli.js find agent skills add-skill pipeline bootstrap work review handoff --mode any --json --compact
      evidence:
        - Used Jumpspace find plus focused source reads to identify JS-014, JS-052, JS-013, JS-017, and JS-046 as the guiding tasks for named pipeline skill installation.
    - id: core-installer
      outcome: add-skill installs the full reference-plus-pipeline bundle by default and supports named skill installs with --agent.
      status: complete
      depends_on:
        - orient
      source_files:
        - src/core/agentSkills.ts
        - src/commands/addSkill.ts
        - src/cli.ts
      tests:
        - src/core/agentSkills.test.ts
        - src/cli.test.ts
      checks:
        - npm test -- src/core/agentSkills.test.ts src/cli.test.ts
      evidence:
        - Added pipeline skill definitions for jumpspace-bootstrap, jumpspace-work, jumpspace-review, and jumpspace-handoff; wired optional skill arguments and --agent into add-skill; focused unit and CLI integration tests passed.
    - id: docs
      outcome: Skill docs, CLI reference, and agent setup pages describe named pipeline installs as current behavior.
      status: complete
      depends_on:
        - core-installer
      source_files:
        - skills/README.md
        - docs/src/content/docs/agent-skills/overview.md
        - docs/src/content/docs/agent-skills/skill-authoring.md
        - docs/src/content/docs/agent-skills/codex.md
        - docs/src/content/docs/agent-skills/claude-code.md
        - docs/src/content/docs/start-here/agent-setup.md
        - docs/src/content/docs/reference/cli.md
        - docs/scripts/check-docs.mjs
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs test
      evidence:
        - Updated the skill docs and docs checker so named pipeline installs are current, while native installers for unsupported agents remain future/manual.
    - id: final-verify
      outcome: Build, docs, tests, scan, plan validation, and audit pass after the named skill implementation.
      status: complete
      depends_on:
        - docs
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - src/core/agentSkills.test.ts
        - src/cli.test.ts
        - docs/scripts/check-docs.mjs
      checks:
        - npm test -- src/core/agentSkills.test.ts src/cli.test.ts
        - npm --prefix docs test
        - npm --prefix docs run build
        - npm run build
        - node dist/cli.js scan
        - node dist/cli.js plan validate JS-053 --json
        - node dist/cli.js audit --json
      evidence:
        - Focused installer tests passed (26 tests), full npm test passed (43 files / 173 tests), docs test and docs build passed, npm run build passed, dist add-skill smoke tests passed, semantic build refreshed 53 tasks, scan indexed 53 tasks, plan validate JS-053 passed, and audit/doctor were ok with only existing JS-050 launch gaps.
acceptance_criteria:
  - id: AC-1
    description: add-skill --codex, --claude, and --all install the reference workflow skill plus bootstrap, work, review, and handoff pipeline skills.
  - id: AC-2
    description: add-skill <skill> --agent <codex|claude> installs the selected named skill plus the reference workflow skill.
  - id: AC-3
    description: Named skill aliases such as bootstrap, work, review, and handoff resolve to their jumpspace-* skill names.
  - id: AC-4
    description: Unknown agents and unknown skill names return structured JSON errors when --json is used.
  - id: AC-5
    description: Installer writes remain additive, idempotent, and limited to Jumpspace-managed blocks.
  - id: AC-6
    description: Docs and agent-facing skill README describe named pipeline installs as current behavior and keep unsupported native agent installers marked manual or future.
verification_records:
  - id: verify-20260629125916
    verified_at: 2026-06-29T12:59:16.422Z
    commit: 5b205a0bd911abac61d0909a38a5217982c4c81a
    checks:
      - command: npm test -- src/core/agentSkills.test.ts src/cli.test.ts
        exit_code: 0
      - command: npm --prefix docs test
        exit_code: 0
      - command: npm run build
        exit_code: 0
      - command: node dist/cli.js plan validate JS-053 --json
        exit_code: 0
    acceptance_criteria_covered:
      - AC-1
      - AC-2
      - AC-3
      - AC-4
      - AC-5
      - AC-6
    evidence:
      - Named pipeline skills are implemented for Codex and Claude add-skill flows, docs describe them as current behavior, and focused installer/docs/build checks pass.
-->

Jumpspace should package the workflow skills described in the docs as real repo-local skill files. The default installer should give Codex and Claude Code the full reference-plus-pipeline bundle, while named installs let a human or agent add a narrower skill such as `jumpspace-work` or `jumpspace-handoff` to one supported agent target.

## Jumpspace Cloud docs page

<!-- jumpspace
id: JS-054
type: engineering
status: verified
module: docs
space: repo
keywords:
  - Jumpspace Cloud
  - docs
  - design partners
  - Netlify page removal
code:
  - docs/astro.config.mjs
  - docs/scripts/check-docs.mjs
  - docs/public/llms.txt
  - docs/public/llms-full.txt
  - docs/src/content/docs/index.md
  - docs/src/content/docs/jumpspace-cloud.md
  - docs/specs/jumpspace-v0.md
tests:
  - docs/scripts/check-docs.mjs
gaps: []
depends_on:
  - JS-049
  - JS-052
refs:
  - type: related_to
    id: JS-050
    note: Launch docs should avoid exposing provider-specific deployment instructions while keeping hosted-readiness gaps explicit.
plan:
  task_id: JS-054
  goal: Remove the public Netlify deployment guide from the docs and add a Jumpspace Cloud design-partner page.
  status: complete
  steps:
    - id: orient
      outcome: Existing docs tasks and public Netlify references are located before editing.
      status: complete
      depends_on: []
      source_files:
        - docs/astro.config.mjs
        - docs/scripts/check-docs.mjs
        - docs/specs/jumpspace-v0.md
      tests: []
      checks:
        - node dist/cli.js find netlify cloud docs deploy --mode any --json --compact
        - rg -n "Netlify|netlify|deploy/netlify|Jumpspace Cloud|Cloud" docs README.md skills docs/specs/jumpspace-v0.md
      evidence:
        - Used Jumpspace find and source search to identify JS-049, JS-050, and JS-052 plus the public Netlify deployment page, sidebar item, docs checker requirement, and source-backed code links.
    - id: docs-update
      outcome: Public docs no longer expose a Netlify deployment guide and include a Jumpspace Cloud page with design-partner contact copy.
      status: complete
      depends_on:
        - orient
      source_files:
        - docs/astro.config.mjs
        - docs/scripts/check-docs.mjs
        - docs/public/llms.txt
        - docs/public/llms-full.txt
        - docs/src/content/docs/index.md
        - docs/src/content/docs/jumpspace-cloud.md
        - docs/specs/jumpspace-v0.md
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - rg -n "Netlify|netlify|deploy/netlify" docs/src/content/docs docs/public docs/scripts/check-docs.mjs docs/astro.config.mjs
        - rg -n "Jumpspace Cloud|jumpspace-cloud|hi@jumpspace.ai" docs/src/content/docs docs/public docs/astro.config.mjs docs/scripts/check-docs.mjs
      evidence:
        - Deleted docs/src/content/docs/deploy/netlify.md, removed the sidebar entry and docs checker requirement, added docs/src/content/docs/jumpspace-cloud.md, linked it from the docs homepage and agent routing files, and updated task code links away from the deleted page.
    - id: final-verify
      outcome: Docs checks, docs build, scan, plan validation, and audit pass after the Cloud docs change.
      status: complete
      depends_on:
        - docs-update
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs test
        - npm --prefix docs run build
        - node dist/cli.js scan
        - node dist/cli.js plan validate JS-054 --json
        - node dist/cli.js audit --json
      evidence:
        - Docs structure check passed for 53 files, Starlight docs build passed and generated /jumpspace-cloud/ with no /deploy/netlify/ route, scan indexed 54 tasks, plan validate JS-054 passed, semantic build refreshed 54 tasks, and audit/doctor were ok apart from existing JS-050 external launch gaps.
acceptance_criteria:
  - id: AC-1
    description: The public docs sidebar no longer links to a Netlify deployment page.
  - id: AC-2
    description: The Netlify deployment guide page is removed from the Starlight docs content.
  - id: AC-3
    description: The docs include a Jumpspace Cloud section/page that invites early design partners.
  - id: AC-4
    description: The Jumpspace Cloud page includes hi@jumpspace.ai as the contact address.
  - id: AC-5
    description: Docs checks and Jumpspace audit do not reference the deleted deployment guide as a required or linked source file.
verification_records:
  - id: verify-20260629140541
    verified_at: 2026-06-29T14:05:41.215Z
    commit: 5b205a0bd911abac61d0909a38a5217982c4c81a
    checks:
      - command: npm --prefix docs test
        exit_code: 0
      - command: npm --prefix docs run build
        exit_code: 0
      - command: node dist/cli.js plan validate JS-054 --json
        exit_code: 0
      - command: node dist/cli.js audit --json
        exit_code: 0
    acceptance_criteria_covered:
      - AC-1
      - AC-2
      - AC-3
      - AC-4
      - AC-5
    evidence:
      - Public Netlify deployment docs were removed, the Jumpspace Cloud design-partner page was added with hi@jumpspace.ai, docs checks/build passed, and Jumpspace plan/audit checks passed.
-->

Jumpspace should keep public docs focused on product usage and agent workflows rather than provider-specific deployment instructions. The docs should also expose a simple Jumpspace Cloud design-partner callout for teams that want a cloud version.

## Alpha release stability notice

<!-- jumpspace
id: JS-055
type: engineering
status: verified
module: docs
space: repo
keywords:
  - alpha release
  - API stability
  - README
  - docs
  - schemas
code:
  - README.md
  - docs/scripts/check-docs.mjs
  - docs/src/content/docs/index.md
  - docs/src/content/docs/start-here/quickstart.md
  - docs/src/content/docs/reference/json-schemas.md
  - docs/src/content/docs/reference/sdks.md
  - docs/src/content/docs/contribute/release-checklist.md
  - docs/specs/jumpspace-v0.md
tests:
  - docs/scripts/check-docs.mjs
gaps: []
depends_on:
  - JS-052
  - JS-023
  - JS-029
refs:
  - type: related_to
    id: JS-033
    note: OSS launch hygiene should set honest expectations for pre-1.0 API and schema stability.
plan:
  task_id: JS-055
  goal: Add alpha release warnings to the README and docs so users know CLI, schema, metadata, SDK, and generated guidance contracts may change before 1.0.
  status: complete
  steps:
    - id: orient
      outcome: Existing docs, README, schema/SDK references, and release checklist are inspected before editing.
      status: complete
      depends_on: []
      source_files:
        - README.md
        - docs/src/content/docs/index.md
        - docs/src/content/docs/start-here/quickstart.md
        - docs/src/content/docs/reference/json-schemas.md
        - docs/src/content/docs/reference/sdks.md
        - docs/src/content/docs/contribute/release-checklist.md
      tests: []
      checks:
        - node dist/cli.js find alpha release README docs schemas SDK --mode any --json --compact
      evidence:
        - Used Jumpspace find plus focused source reads to identify JS-052, JS-023, JS-029, JS-033, and JS-042 as relevant to alpha release messaging, schema contracts, SDK contracts, and launch positioning.
    - id: alpha-copy
      outcome: README and docs clearly state that Jumpspace is alpha software and contracts may change before 1.0.
      status: complete
      depends_on:
        - orient
      source_files:
        - README.md
        - docs/src/content/docs/index.md
        - docs/src/content/docs/start-here/quickstart.md
        - docs/src/content/docs/reference/json-schemas.md
        - docs/src/content/docs/reference/sdks.md
        - docs/src/content/docs/contribute/release-checklist.md
        - docs/scripts/check-docs.mjs
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - rg -n "alpha software|stable 1.0|Pin versions|Alpha Compatibility" README.md docs/src/content/docs docs/scripts/check-docs.mjs
      evidence:
        - Added alpha notices to the README, docs homepage, quickstart, JSON schemas, SDKs, and release checklist; updated the docs checker to require alpha wording in public docs.
    - id: final-verify
      outcome: Docs checks, docs build, scan, plan validation, and audit pass after the alpha notice change.
      status: complete
      depends_on:
        - alpha-copy
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs test
        - npm --prefix docs run build
        - node dist/cli.js scan
        - node dist/cli.js plan validate JS-055 --json
        - node dist/cli.js audit --json
      evidence:
        - Alpha notice grep passed across README and docs, docs structure check passed for 53 files, Starlight docs build passed, scan indexed 55 tasks, plan validate JS-055 passed, semantic build refreshed 55 tasks, and audit/doctor were ok apart from existing JS-050 external launch gaps.
acceptance_criteria:
  - id: AC-1
    description: README includes an alpha release warning before users reach install/demo commands.
  - id: AC-2
    description: Docs homepage and quickstart include alpha release warnings near the top of each page.
  - id: AC-3
    description: JSON schema and SDK reference docs warn that contracts may change before 1.0.
  - id: AC-4
    description: Release checklist reminds maintainers to call out CLI, schema, metadata, SDK, and generated guidance changes.
  - id: AC-5
    description: Docs structure check enforces the alpha notice on the high-risk docs pages.
verification_records:
  - id: verify-20260629142141
    verified_at: 2026-06-29T14:21:41.211Z
    commit: 5b205a0bd911abac61d0909a38a5217982c4c81a
    checks:
      - command: npm --prefix docs test
        exit_code: 0
      - command: npm --prefix docs run build
        exit_code: 0
      - command: node dist/cli.js plan validate JS-055 --json
        exit_code: 0
      - command: node dist/cli.js audit --json
        exit_code: 0
    acceptance_criteria_covered:
      - AC-1
      - AC-2
      - AC-3
      - AC-4
      - AC-5
    evidence:
      - Alpha release warnings are present in README, docs homepage, quickstart, schema docs, SDK docs, and release checklist; docs checks/build and Jumpspace plan/audit checks pass.
-->

Jumpspace should set expectations honestly while it is pre-1.0. Users can still adopt it, but they should know to pin versions in CI and review changelogs before upgrading because CLI commands, JSON schemas, task metadata fields, SDKs, and generated agent guidance may change.

## Scoped npm package and tag publish workflow

<!-- jumpspace
id: JS-056
type: engineering
status: verified
module: packaging
space: repo
keywords:
  - npm
  - scoped package
  - semver
  - git tags
  - publish workflow
code:
  - package.json
  - package-lock.json
  - .github/workflows/publish.yml
  - src/core/releaseDoctor.ts
  - src/core/installDoctor.ts
  - README.md
  - docs/scripts/check-docs.mjs
  - docs/src/content/docs/contribute/release-checklist.md
  - docs/src/content/docs/reference/sdks.md
  - docs/src/content/docs/core-concepts/json-contracts.md
  - src/templates/AGENTS.md
  - src/templates/SKILL.md
  - src/core/agentSkills.ts
  - docs/specs/jumpspace-v0.md
tests:
  - src/packageHygiene.test.ts
  - src/core/releaseDoctor.test.ts
  - src/core/installDoctor.test.ts
  - src/core/agentSkills.test.ts
  - docs/scripts/check-docs.mjs
gaps: []
depends_on:
  - JS-023
  - JS-025
  - JS-042
  - JS-050
refs:
  - type: related_to
    id: JS-033
    note: OSS package hygiene should keep the npm package scoped while preserving the jumpspace CLI command.
plan:
  task_id: JS-056
  goal: Rename the npm package to @jumpspace/cli, preserve the jumpspace command, and add semver git-tag publishing to npm.
  status: complete
  steps:
    - id: orient
      outcome: Existing package, release, docs, and Jumpspace launch tasks are identified.
      status: complete
      depends_on: []
      source_files:
        - package.json
        - src/core/releaseDoctor.ts
        - docs/specs/jumpspace-v0.md
      tests: []
      checks:
        - node dist/cli.js find npm package publish semver tag release workflow --mode any --json --compact
        - rg -n "@jumpspace/cli|npm install -D jumpspace|jumpspace/sdk|jumpspace/schemas|jumpspace@0.1.0|jumpspace-0.1.0|package name jumpspace" package.json package-lock.json README.md docs src sdk .github
      evidence:
        - Jumpspace find identified JS-025, JS-042, JS-050, JS-048, JS-029, JS-031, JS-051, JS-023, and JS-033 as the relevant release/package/docs tasks and linked files.
    - id: scoped-package
      outcome: package.json and package-lock.json use @jumpspace/cli while package.json still exposes the jumpspace command.
      status: complete
      depends_on:
        - orient
      source_files:
        - package.json
        - package-lock.json
        - src/packageHygiene.test.ts
        - src/core/releaseDoctor.ts
        - src/core/releaseDoctor.test.ts
        - src/core/installDoctor.test.ts
      tests:
        - src/packageHygiene.test.ts
        - src/core/releaseDoctor.test.ts
        - src/core/installDoctor.test.ts
      checks:
        - npm test -- src/packageHygiene.test.ts src/core/releaseDoctor.test.ts src/core/installDoctor.test.ts
      evidence:
        - package.json and package-lock.json now use @jumpspace/cli, package.json keeps bin jumpspace -> ./dist/cli.js, package hygiene/release-doctor/install-doctor/CLI focused tests passed, and install-doctor recognizes scoped checkouts.
    - id: publish-workflow
      outcome: A GitHub Actions workflow publishes @jumpspace/cli from matching semver git tags.
      status: complete
      depends_on:
        - scoped-package
      source_files:
        - .github/workflows/publish.yml
        - docs/src/content/docs/contribute/release-checklist.md
        - docs/scripts/check-docs.mjs
      tests:
        - docs/scripts/check-docs.mjs
      checks:
        - npm --prefix docs test
      evidence:
        - Added .github/workflows/publish.yml for v*.*.* tags, verified semver tag format and tag/package version match before npm publish --access public --provenance, documented npm version release scripts and NPM_TOKEN requirement, and docs structure check passed.
    - id: docs-agent-contracts
      outcome: README, docs, SDK imports, and generated agent guidance refer to @jumpspace/cli package surfaces.
      status: complete
      depends_on:
        - scoped-package
      source_files:
        - README.md
        - docs/src/content/docs/reference/sdks.md
        - docs/src/content/docs/core-concepts/json-contracts.md
        - src/templates/AGENTS.md
        - src/templates/SKILL.md
        - src/core/agentSkills.ts
      tests:
        - src/core/agentSkills.test.ts
        - docs/scripts/check-docs.mjs
      checks:
        - rg -n "npm install -D jumpspace|jumpspace/sdk|jumpspace/schemas" README.md docs/src/content/docs src/templates src/core/agentSkills.ts
        - npm test -- src/core/agentSkills.test.ts
      evidence:
        - README and docs install examples now use npm install -D @jumpspace/cli, SDK docs and JSON contract docs import @jumpspace/cli/sdk, generated AGENTS/SKILL guidance points to @jumpspace/cli/sdk and @jumpspace/cli/schemas, and focused agent-skill/docs checks passed.
    - id: final-verify
      outcome: Build, package dry-run, release diagnostics, docs checks, scan, plan validation, and audit pass.
      status: complete
      depends_on:
        - publish-workflow
        - docs-agent-contracts
      source_files:
        - docs/specs/jumpspace-v0.md
        - .jumpspace/index.json
      tests:
        - src/packageHygiene.test.ts
        - src/core/releaseDoctor.test.ts
        - src/core/installDoctor.test.ts
        - src/core/agentSkills.test.ts
        - docs/scripts/check-docs.mjs
      checks:
        - npm test -- src/packageHygiene.test.ts src/core/releaseDoctor.test.ts src/core/installDoctor.test.ts src/core/agentSkills.test.ts
        - npm run build
        - npm --prefix docs test
        - npm pack --dry-run --json
        - node dist/cli.js release doctor --json
        - node dist/cli.js scan
        - node dist/cli.js plan validate JS-056 --json
        - node dist/cli.js audit --json
      evidence:
        - Focused package/release/install/agent/CLI tests passed (5 files, 33 tests); full npm test passed (43 files, 173 tests); python SDK tests passed (3 tests); npm run build passed; docs test and docs build passed; env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json produced @jumpspace/cli@0.1.0 as jumpspace-cli-0.1.0.tgz with executable dist/cli.js; release doctor and install-doctor returned ok; schema coverage and plan validate JS-056 returned ok.
acceptance_criteria:
  - id: AC-1
    description: package.json and package-lock.json use the npm package name @jumpspace/cli.
  - id: AC-2
    description: The package bin still exposes the jumpspace command at ./dist/cli.js.
  - id: AC-3
    description: package.json has public scoped publish configuration and semver bump scripts.
  - id: AC-4
    description: A GitHub Actions publish workflow runs on semver git tags and rejects tag/package-version mismatches before npm publish.
  - id: AC-5
    description: Docs and agent guidance show @jumpspace/cli install, SDK, and schema package surfaces while retaining jumpspace CLI commands.
  - id: AC-6
    description: Release doctor and package hygiene tests validate scoped package publication requirements.
verification_records:
  - id: verify-20260629145345
    verified_at: 2026-06-29T14:53:45.332Z
    commit: 5b205a0bd911abac61d0909a38a5217982c4c81a
    checks:
      - command: npm test -- src/packageHygiene.test.ts src/core/releaseDoctor.test.ts src/core/installDoctor.test.ts src/core/agentSkills.test.ts src/cli.test.ts
        exit_code: 0
      - command: npm run build
        exit_code: 0
      - command: npm --prefix docs test
        exit_code: 0
      - command: env npm_config_cache=/private/tmp/jumpspace-npm-cache npm pack --dry-run --json
        exit_code: 0
      - command: node dist/cli.js release doctor --json
        exit_code: 0
      - command: node dist/cli.js plan validate JS-056 --json
        exit_code: 0
      - command: node dist/cli.js audit --json
        exit_code: 0
    acceptance_criteria_covered:
      - AC-1
      - AC-2
      - AC-3
      - AC-4
      - AC-5
      - AC-6
    evidence:
      - Scoped npm package, preserved jumpspace command, semver release scripts, tag-triggered npm publish workflow, public scoped publish config, docs/SDK/agent guidance updates, package dry-run, release doctor, plan validation, and audit all verified locally. Actual npm publish remains an external JS-050 launch step requiring credentials and a pushed tag.
-->

Jumpspace should publish to npm as `@jumpspace/cli` while preserving the installed `jumpspace` command. Releases should use semver package versions and git tags, with a tag-triggered GitHub Actions workflow publishing only when the tag matches `package.json`.
