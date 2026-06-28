# Jumpspace

Jumpspace is repo-local implementation memory for AI coding agents.

Coding agents lose context across sessions. Jumpspace lets docs remember which code/tests implement which behavior.

## Quickstart

```bash
npm install -D jumpspace
npx jumpspace init --auto
npx jumpspace init --ci github --dry-run --json
npx jumpspace init --ci github
npx jumpspace add-skill --codex
npx jumpspace add-skill --claude
npx jumpspace schema list --json
npx jumpspace bootstrap discover --json
npx jumpspace bootstrap context README.md docs/**/*.md --json
npx jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json --json
npx jumpspace bootstrap validate --file jumpspace-bootstrap.json --json
npx jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run --json
npx jumpspace bootstrap apply --file jumpspace-bootstrap.json
npx jumpspace scan
npx jumpspace find approval
npx jumpspace semantic build
npx jumpspace semantic status --json
npx jumpspace semantic eval --json
npx jumpspace ask "How does approval work?"
npx jumpspace plan review DOC-EXAMPLE-001
npx jumpspace plan save DOC-EXAMPLE-001 --file plan.yml
npx jumpspace plan show DOC-EXAMPLE-001
npx jumpspace plan validate DOC-EXAMPLE-001
npx jumpspace next DOC-EXAMPLE-001
npx jumpspace work DOC-EXAMPLE-001 --json
npx jumpspace ready
npx jumpspace list
npx jumpspace context DOC-EXAMPLE-001
npx jumpspace execute DOC-EXAMPLE-001
npx jumpspace step complete DOC-EXAMPLE-001 design --evidence "Human approved the design."
npx jumpspace verify DOC-EXAMPLE-001 --check "npm test" --criteria AC-1
npx jumpspace changed --since main
npx jumpspace drift --since main
npx jumpspace ci --since main --json
npx jumpspace pr comment --since main
npx jumpspace last --json
npx jumpspace doctor --json
npx jumpspace related DOC-EXAMPLE-001
npx jumpspace audit
```

## Markdown Task Blocks

Add a `jumpspace` HTML comment under the Markdown heading that describes the behavior.

```md
## Metric approval flow

<!-- jumpspace
id: DOC-MON-001
type: spec
status: approved
module: portfolio-monitoring
space: module
keywords:
  - approval
  - review
code:
  - apps/web/components/ApprovalPanel.tsx
tests:
  - tests/approval-flow.spec.ts
depends_on:
  - DOC-MON-000
sources:
  - type: linear
    id: KOD-123
    url: https://linear.app/example/issue/KOD-123
acceptance_criteria:
  - id: AC-1
    description: Analysts can approve extracted metrics.
-->

Analysts can approve extracted metrics after reviewing source citations.

Approved metrics are locked unless an admin unlocks the reporting period.
```

Then index the task and inspect the source-backed context:

```bash
npx jumpspace scan
npx jumpspace context DOC-MON-001
```

After the task has an approved durable plan, start implementation with `npx jumpspace work DOC-MON-001 --json`.

## Commands

```bash
jumpspace init
jumpspace init --auto
jumpspace init --ci github --dry-run --json
jumpspace init --ci github
jumpspace add-skill --codex
jumpspace add-skill --claude
jumpspace add-skill --all
jumpspace add-skill --codex --json
jumpspace schema list
jumpspace schema list --json
jumpspace schema show find --json
jumpspace schema show work --json
jumpspace schema show plan.save --json
jumpspace schema show step.complete --json
jumpspace schema show verify --json
jumpspace schema show last --json
jumpspace schema show init.ci --json
jumpspace schema show doctor --json
jumpspace schema show semantic.build --json
jumpspace schema show semantic.status --json
jumpspace schema show semantic.search --json
jumpspace schema show semantic.eval --json
jumpspace schema show link.eval --json
jumpspace schema show pr.comment --json
jumpspace schema show bootstrap.discover --json
jumpspace schema show bootstrap.propose --json
jumpspace schema show bootstrap.apply --json
jumpspace bootstrap discover
jumpspace bootstrap discover --json
jumpspace bootstrap context README.md docs/**/*.md --json
jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json
jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json --json
jumpspace bootstrap validate --file jumpspace-bootstrap.json
jumpspace bootstrap validate --file jumpspace-bootstrap.json --json
jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run
jumpspace bootstrap apply --file jumpspace-bootstrap.json --dry-run --json
jumpspace bootstrap apply --file jumpspace-bootstrap.json
jumpspace bootstrap apply --file jumpspace-bootstrap.json --json
jumpspace scan
jumpspace list
jumpspace list --status approved
jumpspace list --type spec
jumpspace list --module portfolio-monitoring
jumpspace list --space module
jumpspace list --json
jumpspace find approval
jumpspace find approval review --mode any
jumpspace find approval --module portfolio-monitoring --json
jumpspace semantic build
jumpspace semantic status
jumpspace semantic status --json
jumpspace semantic search approval flow
jumpspace semantic search approval flow --json
jumpspace semantic eval
jumpspace semantic eval --json
jumpspace ask "How does approval work?"
jumpspace ask "How does approval work?" --json
jumpspace plan review DOC-MON-001
jumpspace plan review DOC-MON-001 --json
jumpspace plan save DOC-MON-001 --file plan.yml
jumpspace plan save DOC-MON-001 --file plan.yml --json
jumpspace plan show DOC-MON-001
jumpspace plan show DOC-MON-001 --json
jumpspace plan validate DOC-MON-001
jumpspace plan validate DOC-MON-001 --json
jumpspace next DOC-MON-001
jumpspace next DOC-MON-001 --json
jumpspace work DOC-MON-001
jumpspace work DOC-MON-001 --json
jumpspace work DOC-MON-001 --since main --json
jumpspace ready
jumpspace ready --include-blocked
jumpspace ready --module portfolio-monitoring --json
jumpspace context DOC-MON-001
jumpspace context DOC-MON-001 --json
jumpspace query --depends-on-transitive ADR-0017 --no-tests --json
jumpspace query --where module=portfolio-monitoring --where tests=none
jumpspace execute DOC-MON-001
jumpspace execute DOC-MON-001 --json
jumpspace execute DOC-MON-001 --force
jumpspace status DOC-MON-001 implemented
jumpspace verify DOC-MON-001 --check "npm test" --criteria AC-1 --evidence "Focused tests passed."
jumpspace verify DOC-MON-001 --check "npm test" --criteria AC-1 --json
jumpspace step complete DOC-MON-001 design --evidence "Human approved the design."
jumpspace step complete DOC-MON-001 design --evidence "Human approved the design." --json
jumpspace changed --since main
jumpspace changed --since main --json
jumpspace drift --since main
jumpspace drift --since main --json
jumpspace link eval
jumpspace link eval --json
jumpspace link eval --file fixtures/link-eval.json --json
jumpspace ci --since main
jumpspace ci --since main --json
jumpspace pr comment --since main
jumpspace pr comment --since main --json
jumpspace repair --since main
jumpspace repair --since main --apply
jumpspace repair --since main --json
jumpspace last
jumpspace last --json
jumpspace handoff
jumpspace handoff --task DOC-MON-001 --json
jumpspace doctor
jumpspace doctor --since main
jumpspace doctor --json
jumpspace release doctor --json
jumpspace release doctor --check-registry --json
jumpspace release install-doctor --json
jumpspace related DOC-MON-001
jumpspace related DOC-MON-001 --json
jumpspace audit
jumpspace audit --json
```

`jumpspace work <id>` is the main implementation handoff command. It gates on audit health, a valid durable plan, task approval, and completed dependencies, then returns one packet with intent, links, acceptance criteria, plan state, next unblocked steps, verification records, schema names, guardrails, and optional drift. Use `--since <ref>` when you want drift facts and warnings included in the same packet.

`jumpspace context <id>` prints lower-level task context. Use it when you need raw task, plan, and execution state without the full work gate.

`jumpspace find <query>` is the discovery command. It searches task IDs, titles, specs, modules, linked files, dependencies, refs, sources, and external metadata. It uses strict all-term matching by default; use `--mode any` for broader recall.

`jumpspace semantic build` explicitly enables and writes the optional generated local semantic index at `.jumpspace/semantic-index.json`. The default build uses the deterministic `local-task-vector-v1` backend. Use `jumpspace semantic build --backend lancedb+onnx --model <local-model>` only when optional LanceDB and ONNX/Transformers packages plus a local model are available; otherwise Jumpspace records a degraded fallback reason and keeps semantic retrieval local and deterministic. The generated index records active backend, selected backend, model, vector kind, store metadata, source hash, and optional dependency availability, and is intended to be ignored by source control. Use `jumpspace semantic status --json` to check readiness or staleness, `jumpspace semantic search <query> --json` for direct semantic retrieval, and `jumpspace semantic eval --json` to compare lexical, deterministic task-vector, and active semantic recall. Semantic results include `graph_expansion` paths and `connected_tasks` so a conceptual match can be followed through dependencies, refs, supersession chains, modules, and spaces.

`jumpspace ask <question>` returns an evidence summary, not an authoritative answer. It includes task IDs, paths, retrieval sources, match reasons, scores, graph expansion paths, connected tasks, coverage, unanswered terms, and linked code/tests. After `jumpspace semantic build`, ask uses hybrid lexical plus semantic retrieval when the generated index is ready; otherwise it degrades to forgiving lexical retrieval and reports semantic index issues in JSON.

Use `--compact` with `--json` on high-volume orientation commands when an agent needs a cheap first pass before requesting a full work packet. `jumpspace find --json --compact`, `jumpspace ask --json --compact`, and `jumpspace related --json --compact` preserve task IDs, source paths, scores, match reasons, relationship edges, and link counts while omitting durable plans, verification records, long specs, excerpts, and graph expansions. Exact contracts are available as `find.compact`, `ask.compact`, `related`, and `related.compact`.

`jumpspace query` answers deterministic graph questions that text search cannot express cleanly. Use it for structural filters such as `--depends-on-transitive ADR-0017 --no-tests`, `--ref implements:JS-008`, `--module metrics --has-tests`, `--verified`, `--has-gaps`, or compact predicates like `--where module=metrics --where tests=none`. JSON output includes applied filters, matched tasks, matched graph paths, and unanswered constraints.

`jumpspace link suggest <id>` proposes code/test links from changed files or explicit candidate paths without mutating source. Use `--since <ref>` for Git-based candidates or repeat `--path <path>` for hand-picked candidates. Changed-file status is candidate context, not enough evidence by itself: suggestions require matched task-intent terms from path, basename, identifier, phrase, or bounded local file content evidence. JSON suggestions include `evidence.path_terms`, `evidence.basename_terms`, `evidence.identifier_terms`, `evidence.content_terms`, `evidence.phrase_matches`, and coverage so agents can inspect why a candidate ranked. JSON also includes `rejected_candidates` with `NO_SOURCE_EVIDENCE` when touched files were considered but not linked. `jumpspace link update <id>` atomically adds or removes code, test, dependency, ref, and gap metadata; use `--dry-run --json` before applying suggestions.

`jumpspace link eval --json` runs built-in local ranking fixtures for the link suggestion scorer. Use it after scorer, stop-word, evidence, or PR-assistant changes; it reports pass/fail, expected path/field, rank, top candidate, rejected candidates, top-1 accuracy, mean reciprocal rank, suite name, and fixture path. It does not require Git, network access, or hosted services. When a real repo exposes a bad ranking, store it as JSON and run `jumpspace link eval --file fixtures/link-eval.json --json`; fixture files can define `shared_candidates` plus multiple task cases so the same candidate pool must rank differently per heading or be rejected when no heading has source evidence.

Task metadata mutations are serialized through the repo-local `.jumpspace/locks/mutation.lock` file. It is fine to run read commands in parallel, but commands that rewrite task blocks, such as `status`, `plan save`, `step complete`, `verify`, `link update`, and `repair --apply`, take the shared lock so concurrent agents do not lose each other's metadata changes. JSON lock failures use the standard error envelope with code `MUTATION_LOCK_TIMEOUT`; stale locks are recovered after a bounded interval.

`jumpspace schema list`, `jumpspace schema show <name>`, and `jumpspace schema coverage --json` publish and verify stable JSON contracts for agent-facing output. Use these before scripting against a command shape. `schema show work --json` documents the agent start packet, and write-side schemas such as `plan.save`, `plan.show`, `plan.validate`, `step.complete`, `status`, `verify`, `ready`, `next`, and `execute` document mutation and execution outputs. `schema coverage --json` fails when declared JSON commands, the schema catalog, generated artifacts, or SDK schema names drift apart. JSON failures use the standard `{ "ok": false, "errors": [...] }` envelope.

`jumpspace release doctor --json` runs package release-readiness diagnostics before npm publish or launch validation. It reports package metadata, LICENSE presence, bin target and executable mode, `npm pack --dry-run --json` contents, required README/LICENSE/dist/templates/SDK/schema package files, local blockers, and external npm registry state. By default it stays local-only and marks registry availability as `unknown`; add `--check-registry` when network access is available and you want npm name availability checked. JSON output follows the `release.doctor` schema.

`jumpspace release install-doctor --json` checks the active install rather than release readiness. It reports the binary that invoked the command, the first `jumpspace` found on `PATH`, realpaths, package roots, CLI-visible versions, schema counts, workspace comparisons, factual stale-install warnings, and repair commands such as `npm run build`, `npm link`, or `hash -r`. Use it when an agent or shell appears to be running an older linked build than the current checkout. JSON output follows the `release.install-doctor` schema.

The npm package also ships versioned schema artifacts generated from the same catalog: `schemas/catalog.json` lists every contract, and `schemas/<name>.schema.json` contains one command schema. Import them through package exports such as `jumpspace/schemas/catalog.json` or pin the files from the package tarball when building integrations.

For TypeScript integrations, import the SDK contract surface:

```ts
import { assertOk, getSdkSchema, isJumpspaceErrorEnvelope } from "jumpspace/sdk";
```

For Python integrations, use the stdlib dataclass package under `sdk/python`:

```py
from jumpspace_sdk import SCHEMA_NAMES, assert_ok, is_error_envelope
```

Both SDKs expose `CONTRACT_VERSION`, the published schema names, command result models, and error helpers. The SDK tests compare their schema names against `jumpspace schema list --json` and the generated schema artifacts so contract drift is caught in CI.

`jumpspace bootstrap discover` inspects common Markdown locations such as README, PRODUCT, docs, documentation, adr/adrs, architecture, apps/package READMEs, infrastructure, and skills. It reports recommended config globs, detected files, profile hints, and ignored generated or noisy paths such as node_modules, dist, .git, .next, coverage, and .claude/worktrees.

`jumpspace init --auto` uses the same discovery pass to write a starter `.jumpspace/config.json` for an existing repo. Plain `jumpspace init` keeps the conservative default `docs/**/*.md` behavior.

`jumpspace bootstrap context <paths...> --json` exports Markdown headings, own and descendant excerpts, existing task IDs, suggested IDs, scoped linked-file hints, source line numbers, heading levels, parent heading chains, and proposal instructions so an AI agent can propose the first source-backed graph for an existing repo.

`jumpspace bootstrap propose [paths...] --file <proposal-file> --json` creates a deterministic draft proposal from discovered docs or supplied paths. It separates extraction from agent reasoning with `mode: "deterministic_extraction"`, writes only the proposal JSON when `--file` is provided, refuses to overwrite an existing proposal file, and still requires human review before `bootstrap apply`.

`jumpspace bootstrap validate --file <proposal-file>` checks an AI-generated proposal before mutation. Proposal tasks must cite source path and heading evidence, use `draft` or `proposed` status, avoid duplicate IDs, resolve dependencies, and leave code/test links empty unless explicitly evidenced. If a document has duplicate heading titles, include `source.line`, `source.level`, and `source.parent_headings` from `bootstrap context`; title-only proposals are rejected when ambiguous.

`jumpspace bootstrap apply --file <proposal-file> --dry-run` previews intended insertions without mutating Markdown, config, or the generated index.

`jumpspace bootstrap apply --file <proposal-file>` writes approved proposal tasks as `<!-- jumpspace ... -->` blocks under their source headings, adds applied Markdown paths to `.jumpspace/config.json` when needed, and refreshes the index.

`jumpspace related <id>` shows the task's dependencies, dependents, structured refs, and inbound structured refs. Use `--json --compact` for relationship task briefs without full task payloads.

`jumpspace plan review <id>` prints a human approval packet from the task's intent, links, and dependencies.

`jumpspace plan save <id> --file <plan-file>` validates and persists a durable ordered plan into the source Markdown task block.

`jumpspace plan show <id>` displays the persisted plan.

`jumpspace plan validate <id>` validates step IDs, step dependencies, dependency cycles, and completed-step evidence.

`jumpspace next <id>` lists pending unblocked plan steps.

`jumpspace work <id>` combines audit gating, execution readiness, durable plan state, next unblocked steps, recent task mutation history, verification state, schema references, and guardrails into a single agent start packet.

`jumpspace step complete <task-id> <step-id> --evidence <evidence>` marks a step complete and records evidence. It refuses to complete blocked steps or steps without evidence.

`jumpspace ready` lists approved or partial tasks whose dependencies are implemented or verified.

`jumpspace execute <id>` prints a narrower agent execution packet. It blocks unless the task is `approved` or `partial` and dependencies are complete. Use `work` for the full start packet and `--force` only when a human intentionally wants to override the gate.

`jumpspace status <id> <status>` updates task status, except `verified`. Verified status must be earned by `jumpspace verify`.

`jumpspace verify <id> --check <cmd> --criteria <criterion-id>` runs checks, records exit codes, commit SHA, timestamp, covered acceptance criteria, and evidence, and sets the task to `verified` only when every check passes.

Metadata-writing commands use `.jumpspace/locks/mutation.lock` to serialize read-modify-write updates. When multiple agents are working, parallelize discovery and checks, but sequence task-block mutations when practical and handle structured `MUTATION_LOCK_TIMEOUT` errors if a lock cannot be acquired.

`jumpspace init --ci github` installs or refreshes a Jumpspace-managed `.github/workflows/jumpspace.yml` workflow without requiring full repo initialization. Use `--dry-run --json` first in existing repositories. The workflow runs scan, `pr comment --since <base>`, audit, and doctor, adds the comment to the GitHub step summary, and upserts a PR comment by the Jumpspace assistant marker so reruns do not stack duplicates. Existing user-owned workflow files at the same path are left unchanged with a warning.

`jumpspace changed --since <ref>` reports committed changes since the ref plus staged, unstaged, and untracked files. Renames include old and new paths.

`jumpspace drift --since <ref>` separates factual drift, such as linked code changing, from heuristic warnings, such as docs possibly needing updates.

`jumpspace ci --since <ref>` is local-only and review-oriented. It refreshes the index, runs audit, doctor, drift, repair checks, graph queries, and task-block suggestions, then emits a Markdown PR report or JSON packet without requiring GitHub or hosted services. Suggested task blocks rank code/test candidates per heading using the same weighted source-evidence scorer as `link suggest` and include `linked_code_candidate_matches` / `linked_test_candidate_matches` with evidence details in JSON. They also include `rejected_candidate_matches` and Markdown rejected-candidate lines so agents can see touched files that were considered but not linked. Run `jumpspace link eval --json` after changing scorer behavior to keep ranking quality measurable, and add `--file <fixture.json>` when the change came from a real repo ranking failure.

`jumpspace pr comment --since <ref>` wraps the CI packet into an idempotent review-only assistant comment. It includes the `&lt;!-- jumpspace-pr-assistant:v1 --&gt;` marker, a fingerprint, mutation policy, review items with evidence, and the embedded CI report. The command does not post to GitHub or mutate source; replace an existing PR comment with the same marker only after human review. JSON output follows the `pr.comment` schema.

`jumpspace repair --since <ref>` previews safe task-memory repairs. Git renames become mechanical linked-path fixes; deleted or missing linked code/test files are removed from active links and preserved as explicit task gaps for human review. Source document renames and deletions are reported as lifecycle warnings because task source paths are generated from Markdown location and need scan/review rather than blind metadata rewriting. Add `--apply` only after reviewing the dry-run output.

`jumpspace last` shows the most recent successful Jumpspace mutation summary: command, timestamp, touched files, task IDs, config changes, index changes, and warnings.

`jumpspace history` shows the generated mutation trail from `.jumpspace/mutations.jsonl`, newest first. Use `jumpspace history --task <id> --limit <n> --json` when an agent needs to review what Jumpspace changed during a session or for one task.

`jumpspace handoff` returns the post-work recap packet for agents and humans. It combines recent mutation history, touched files, task IDs, config changes, mutation warnings, audit and doctor health, and concrete suggested next commands. Add `--task <id>` to include task status, plan status, pending unblocked steps, required checks, and task-filtered mutation history. JSON output follows the `handoff` schema and is the quickest way for the next agent to know what just happened.

`jumpspace doctor` runs post-mutation diagnostics. It wraps audit results, duplicate-heading checks, ambiguous task source-heading checks, config-glob checks, ignored/generated path checks, last-mutation context, source-document lifecycle warnings, and suggested repairs while keeping errors, warnings, and suggestions separate. Add `--since <ref>` to include repair opportunities and the exact `jumpspace repair --since <ref> --apply` command when drift is repairable.

`jumpspace init --agent codex` creates or updates only Jumpspace-managed blocks in repo-local agent guidance.

`jumpspace add-skill --codex` appends Codex repo guidance in `AGENTS.md`, @-mentions the repo-local skill, and creates or appends `.codex/skills/jumpspace-workflow/SKILL.md`.

`jumpspace add-skill --claude` appends Claude repo guidance in `CLAUDE.md`, @-mentions the repo-local skill, and creates or appends `.claude/skills/jumpspace-workflow/SKILL.md`.

`jumpspace add-skill --all` installs every supported agent skill. Skill installation is idempotent and non-destructive: Jumpspace creates missing files, appends managed blocks to existing files, or updates only clearly marked managed blocks.

Use `--json` with `init --ci github`, `list`, `find`, `ask`, `semantic build`, `semantic status`, `semantic search`, `semantic eval`, `link eval`, `query`, `plan review`, `plan save`, `plan show`, `plan validate`, `ready`, `next`, `work`, `execute`, `status`, `verify`, `step complete`, `context`, `changed`, `drift`, `ci`, `pr comment`, `repair`, `last`, `history`, `handoff`, `doctor`, `release doctor`, `release install-doctor`, `related`, `schema list`, `schema show`, `schema coverage`, `add-skill`, `bootstrap discover`, `bootstrap context`, `bootstrap propose`, `bootstrap validate`, `bootstrap apply`, or `audit` when another tool or AI assistant should consume the output directly. Add `--compact` to `find`, `ask`, and `related` when the consumer needs bounded orientation output. JSON failures use `{ "ok": false, "errors": [...] }`.

## Modules, Spaces, and References

`module` is an optional domain or bounded-context label, such as `portfolio-monitoring`, `ingestion`, or `data-platform`.

`space` is optional and can be `repo`, `module`, or `global`. If omitted, Jumpspace treats the task as `repo` space.

`keywords` is optional and helps `jumpspace find` connect product vocabulary, shorthand, or synonyms to a task.

`plan` is optional durable execution state for a task. It belongs in the Markdown task block and is copied into `.jumpspace/index.json` by `jumpspace scan`.

`acceptance_criteria` is optional structured verification intent. Each criterion has a stable `id` and `description`.

`verification_records` are written by `jumpspace verify` after checks pass. They record commit SHA, timestamp, check exit codes, covered acceptance criteria, and evidence.

`depends_on` is the simple v0 dependency field. Dependencies must point at known Jumpspace task IDs.

`refs` is the future-proof structured reference field for relationships such as `related_to`, `implements`, `supersedes`, `conflicts_with`, and `informs`.

Jumpspace v0 does not automatically load module or global context yet. It records those labels so future versions can use them without changing the task block format.

## Task Lifecycle

Task identity lives in the task ID, not the Markdown heading title. The generated `doc` object includes `path`, `heading`, `line`, `level`, and `parent_headings` so agents can disambiguate repeated headings such as multiple `Local development` sections.

For heading renames or moves, run `jumpspace scan`, then `jumpspace audit --json` and `jumpspace doctor --json`. Duplicate source headings produce `AMBIGUOUS_TASK_HEADING` warnings when indexed tasks share a path and title.

For Git path drift, run `jumpspace doctor --since <ref> --json` before handoff. Renamed source docs produce `TASK_SOURCE_DOC_RENAMED` warnings and should be followed by `jumpspace scan` plus config review. Deleted source docs produce `TASK_SOURCE_DOC_DELETED` warnings; restore the doc, recreate the task from surviving evidence, or mark a surviving task as `stale`, superseded, or replaced with an explicit gap.

```md
<!-- jumpspace
id: KOD-MON-018
type: spec
status: approved
module: portfolio-monitoring
space: module
keywords:
  - approval
  - review
depends_on:
  - GLOBAL-PROV-001
refs:
  - type: related_to
    id: KOD-MON-012
    note: Approval depends on the metric review workflow.
plan:
  task_id: KOD-MON-018
  goal: Implement the approval workflow.
  status: planned
  steps:
    - id: design
      outcome: Human-approved plan exists.
      status: pending
      depends_on: []
      source_files:
        - docs/specs/approval.md
      tests: []
      checks:
        - jumpspace plan validate KOD-MON-018
      evidence: []
code: []
tests: []
-->
```

## Statuses

- `draft`: early thinking, not ready for implementation.
- `proposed`: ready for review, but not approved.
- `approved`: accepted source of truth for future implementation.
- `partial`: implementation has started but is not complete.
- `implemented`: code exists and is linked.
- `verified`: implementation is tested or otherwise checked. Use `jumpspace verify`; `jumpspace status <id> verified` is rejected.
- `stale`: no longer trusted as current behavior.

## Task Types

- `spec`: durable behavior/product/system intent.
- `engineering`: technical implementation work.
- `hotfix`: urgent fix.
- `adr`: architectural decision.

## Dogfooding

Jumpspace uses Jumpspace. The core v0 roadmap lives in:

```txt
docs/specs/jumpspace-v0.md
```

Run this repo against itself:

```bash
npm run build
node dist/cli.js scan
node dist/cli.js list
node dist/cli.js context JS-004
node dist/cli.js audit
node dist/cli.js doctor
node dist/cli.js ci --since <ref>
npm test
```

## Agent Workflow

Before implementing feature behavior:

1. Run `jumpspace scan`.
2. Run `jumpspace find <keywords>` or `jumpspace list` to find the relevant Jumpspace task ID.
3. Run `jumpspace plan review <TASK_ID>` while the task is still `draft` or `proposed`.
4. Have a human review the docs and change the task status to `approved`.
5. Run `jumpspace plan save <TASK_ID> --file <plan-file>` to persist the approved plan.
6. Run `jumpspace scan`.
7. Run `jumpspace ready` to find approved dependency-unblocked work.
8. Run `jumpspace work <TASK_ID> --json` as the implementation start packet.
9. Add `--since <ref>` when a Git baseline is available and drift should be included.
10. Treat the work packet's intent, links, next steps, recent task mutation history, verification records, schemas, and guardrails as the source of truth.
11. Inspect linked code and tests before editing.
12. Update code and tests.
13. Run relevant checks.
14. Record step evidence with `jumpspace step complete <TASK_ID> <STEP_ID> --evidence "<evidence>"`.
15. Use the work packet's `mutation_history` for recent task context; use `jumpspace last --json` to confirm the latest mutation summary and `jumpspace history --task <TASK_ID> --json` when you need a deeper task/session trail.
16. When a Git baseline is available, run `jumpspace ci --since <ref> --json` for the packet or `jumpspace pr comment --since <ref>` for an idempotent review-comment handoff with drift, repair suggestions, graph queries, and suggested task blocks.
17. Use `jumpspace link suggest <TASK_ID> --since <ref> --json` and `jumpspace link update <TASK_ID> --dry-run --json` before applying code/test/dependency/ref/gap link changes.
18. Run `jumpspace scan`, `jumpspace audit --json`, `jumpspace doctor --json`, and `jumpspace handoff --task <TASK_ID> --json`.
19. In the final response, mention changed or verified Jumpspace IDs and the handoff packet status.

`jumpspace ci --since <ref>` is local-only and review-oriented. It refreshes the index, runs audit/doctor/drift/repair checks, executes graph queries, drafts task blocks for changed Markdown headings, and emits a Markdown PR report or JSON packet without requiring GitHub or hosted services. Suggested task blocks use per-heading weighted source evidence for code/test candidates instead of copying the whole changed-file list into every block.

`jumpspace pr comment --since <ref>` turns that CI packet into an idempotent assistant comment with a stable Jumpspace marker, fingerprint, mutation policy, review items, and embedded CI report. It is still local-only: it prints text for a human or wrapper to post, and suggestions must be applied only after review.

`jumpspace init --ci github` is the adoption shortcut for that loop. It creates a managed GitHub Actions workflow that runs the local PR assistant against the pull-request base ref and updates an existing Jumpspace PR comment when the marker is already present.

For scripted agents or CI, use:

```bash
jumpspace scan
jumpspace find "<keywords>" --json
jumpspace find "<keywords>" --mode any --json
jumpspace ask "<question>" --json
jumpspace plan review <TASK_ID> --json
jumpspace plan save <TASK_ID> --file <plan-file> --json
jumpspace plan validate <TASK_ID> --json
jumpspace ready --json
jumpspace next <TASK_ID> --json
jumpspace work <TASK_ID> --json
jumpspace work <TASK_ID> --since <ref> --json
jumpspace execute <TASK_ID> --json
jumpspace step complete <TASK_ID> <STEP_ID> --evidence "<evidence>" --json
jumpspace context <TASK_ID> --json
jumpspace changed --since <ref> --json
jumpspace drift --since <ref> --json
jumpspace ci --since <ref> --json
jumpspace ci --since <ref> --query module=<module> --json
jumpspace pr comment --since <ref>
jumpspace pr comment --since <ref> --json
jumpspace init --ci github --dry-run --json
jumpspace init --ci github --json
jumpspace link suggest <TASK_ID> --since <ref> --json
jumpspace link eval --json
jumpspace link eval --file fixtures/link-eval.json --json
jumpspace link update <TASK_ID> --code <path> --test <path> --dry-run --json
jumpspace schema coverage --json
jumpspace bootstrap propose README.md docs/**/*.md --file jumpspace-bootstrap.json --json
jumpspace verify <TASK_ID> --check "<command>" --criteria <CRITERION_ID> --json
jumpspace last --json
jumpspace handoff --task <TASK_ID> --json
jumpspace doctor --json
jumpspace audit --json
```

## v0 Scope

Jumpspace v0 is for one repo, local Markdown docs, and small teams. It is not a hosted knowledge graph, Jira replacement, or Confluence replacement.
