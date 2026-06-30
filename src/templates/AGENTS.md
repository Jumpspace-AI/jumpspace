# Jumpspace workflow

This repo uses Jumpspace for repo-local intent memory.

Use this workflow by default for repo questions, feature work, branch review, and handoffs. The user should not have to say "use Jumpspace" on every request once this file is installed. If Jumpspace evidence is missing, weak, or stale, say that clearly and then fall back to normal code search.

Before implementing feature behavior:

1. Run `jumpspace intent check --for <paths...> --json` once likely edit paths are known. Treat matching active intents as binding constraints.
2. If task memory is relevant, run `jumpspace task scan`.
3. Use `jumpspace task find <keywords>` or `jumpspace task list` only when task graph evidence is useful.
4. Inspect linked code and tests before editing.
5. Update code and tests.
6. Run relevant checks.
7. If a Git baseline is available, run `jumpspace task ci --since <ref> --json` for the packet or `jumpspace task pr comment --since <ref>` for an idempotent review-comment handoff with drift, repair suggestions, graph queries, and suggested task blocks.
8. To install the PR assistant loop in a GitHub repo, preview `jumpspace init --ci github --dry-run --json`, then run `jumpspace init --ci github` only when the managed workflow change is intended.
9. If a Git baseline is available, run `jumpspace task doctor --since <ref> --json` and review any `jumpspace task repair --since <ref>` dry-run before applying repairs.
10. Run `jumpspace task audit --json`, `jumpspace task doctor --json`, and `jumpspace task handoff --json`.
11. In the final response, mention matching intents, checks, and any handoff packet status.

For the advanced task workflow:

1. Run `jumpspace task plan review <TASK_ID>` while the task is still `draft` or `proposed`.
2. Have a human review the docs and change the task status to `approved`.
3. Run `jumpspace task plan save <TASK_ID> --file <plan-file>` to persist the approved plan.
4. Run `jumpspace task scan`.
5. Run `jumpspace task ready` to find approved dependency-unblocked work.
6. Run `jumpspace task work <TASK_ID> --json` as the implementation start packet.
7. Add `--since <ref>` to `jumpspace task work` when a Git baseline is available and drift should be included.
8. Treat the work packet's intent, links, next steps, recent task mutation history, verification records, schemas, and guardrails as the source of truth.
9. Record step evidence with `jumpspace task step complete <TASK_ID> <STEP_ID> --evidence "<evidence>"`.
10. Use the work packet's `mutation_history` for recent task context; use `jumpspace task last --json` to confirm the latest mutation summary and `jumpspace task history --task <TASK_ID> --json` when you need a deeper task/session trail.
11. Use `jumpspace task verify <TASK_ID> --check "<command>" --criteria <CRITERION_ID>` to earn `verified`; do not set `verified` with `jumpspace task status`.
12. Update the Jumpspace block if code/test links, status, or behavior changed.
13. Treat task identity as the task ID. When headings repeat, use `doc.line`, `doc.level`, and `doc.parent_headings`; do not rely on title-only anchors.
14. If doctor reports `TASK_SOURCE_DOC_RENAMED`, run `jumpspace task scan` and review config docs. If it reports `TASK_SOURCE_DOC_DELETED`, restore the doc, recreate the task from surviving evidence, or mark a surviving task stale/superseded with an explicit gap.

Use `jumpspace add-skill --codex`, `jumpspace add-skill --claude`, or `jumpspace add-skill --all` to install repo-local skill definitions for coding agents.

Use `jumpspace schema list --json`, `jumpspace schema show <name> --json`, and `jumpspace schema coverage --json` before scripting against command output. `jumpspace schema show task.work --json` documents the agent start packet, and write-side schemas such as `task.plan.save`, `task.step.complete`, `task.status`, `task.verify`, `task.ready`, `task.next`, and `task.execute` document mutation and execution outputs. JSON failures use `{ "ok": false, "errors": [...] }`.

Use `jumpspace release doctor --json` before npm publish or launch validation. It separates local release blockers from external npm registry warnings; add `--check-registry` only when network access is available and you explicitly want registry availability checked.
Use `jumpspace release install-doctor --json` when an agent or shell appears to be running an old linked build. It compares the invoked binary and PATH-resolved `jumpspace` against the current checkout and reports repair commands such as `npm run build`, `npm link`, or `hash -r`.

For repeated integrations, prefer the published SDK contracts over ad hoc JSON parsing: TypeScript can import from `@jumpspace/cli/sdk`, Python can use the dataclass package in `sdk/python/jumpspace_sdk`, and package consumers can pin generated schema artifacts from `@jumpspace/cli/schemas/catalog.json` plus `@jumpspace/cli/schemas/<name>.schema.json`.

Use `jumpspace task semantic build --json` when the repo wants optional local hybrid retrieval. It explicitly enables the generated `.jumpspace/semantic-index.json` task-vector index; generated semantic data should be ignored by source control. The default backend is deterministic `local-task-vector-v1`. Use `jumpspace task semantic build --backend lancedb+onnx --model <local-model> --json` only when optional local LanceDB/ONNX packages and model files are available. Use `jumpspace task semantic status --json` to check readiness or degraded fallback, `jumpspace task semantic search "<query>" --json` for direct semantic evidence with `graph_expansion` paths and `connected_tasks`, and `jumpspace task semantic eval --json` to compare lexical, local task-vector, and active semantic recall.

Use `jumpspace task bootstrap discover --json` before advanced first-graph proposal work in an existing repo. It reports recommended doc globs, detected files, profile hints, and generated/noisy paths that Jumpspace ignores. `jumpspace init --auto` uses the same discovery pass to write starter config; plain `jumpspace init` keeps the conservative default.

Use `jumpspace task bootstrap context <paths...> --json` to export existing Markdown docs for advanced first-graph proposal work. Prefer paths from `bootstrap discover` when the repo layout is unknown. Prefer `source.path`, `source.heading`, `source.line`, `source.level`, and `source.parent_headings` from the context packet when proposing tasks. Duplicate heading titles are ambiguous without those fields.

Use `jumpspace task bootstrap propose [paths...] --file <proposal-file> --json` when you want a deterministic draft proposal before doing agent reasoning. Treat its `mode: "deterministic_extraction"` output as review evidence, not a finished graph. Validate AI-generated or edited proposals with `jumpspace task bootstrap validate --file <proposal-file> --json`, preview approved changes with `jumpspace task bootstrap apply --file <proposal-file> --dry-run --json`, then only apply after human approval with `jumpspace task bootstrap apply --file <proposal-file>`.

Use the `jumpspace-intent-review` skill when CI or a human says changed files match active intents. Run `jumpspace intent validate --since <ref> --json`, run `jumpspace intent verify --since <ref> --json`, inspect local diff hunks, and report `possible_violation` only with quoted intent text plus quoted changed diff evidence.

Use `--json` with `init --ci github`, `intent list`, `intent check`, `intent validate`, `intent validate --since <ref>`, `intent verify`, task commands such as `task find`, `task ask`, `task work`, `task verify`, `task ci`, `task pr comment`, `task handoff`, `task bootstrap propose`, and `task audit`, plus `changed`, `release doctor`, `release install-doctor`, `schema list`, `schema show`, `schema coverage`, and `add-skill` when another tool needs machine-readable output.
Use `--compact` with `--json` on `task find`, `task ask`, and `task related` when you need bounded orientation output before requesting a full `task work` packet.

Use `jumpspace task ask "<question>" --json` for evidence summaries, not authoritative answers. If a ready semantic index exists, ask uses hybrid lexical plus semantic retrieval and reports retrieval sources, graph expansion paths, and connected tasks; otherwise it falls back to forgiving lexical retrieval.
Use `jumpspace task query --json` for deterministic graph questions, such as tasks that depend on an ADR and have no tests linked. Prefer `query` over grep when filtering by dependencies, refs, modules, linked files, verification state, or gaps.
Use `jumpspace task link suggest <id> --json` for working-tree candidates, or add `--since <ref>` / repeated `--path <path>` for a baseline or explicit candidate set. It previews code/test link candidates without mutating source. Treat changed-file status as candidate context, not proof; inspect `evidence.path_terms`, `evidence.basename_terms`, `evidence.identifier_terms`, `evidence.content_terms`, `evidence.phrase_matches`, and coverage before trusting a suggestion. Inspect `rejected_candidates` too; `NO_SOURCE_EVIDENCE` means the file was considered and deliberately not linked. Run `jumpspace task link eval --json` after scorer or PR-assistant ranking changes; when a real repo exposes a bad ranking, add a JSON fixture and run `jumpspace task link eval --file <fixture.json> --json`. Use `jumpspace task link update <id> --dry-run --json` before applying explicit code, test, dependency, ref, or gap changes.
Parallelize read-only discovery and checks when useful, but sequence task-block mutations when practical. Jumpspace serializes `task status`, `task plan save`, `task step complete`, `task verify`, `task link update`, and `task repair --apply` through `.jumpspace/locks/mutation.lock`; JSON lock failures use `MUTATION_LOCK_TIMEOUT`.
Use `jumpspace changed --since <ref> --json` and `jumpspace task drift --since <ref> --json` to check factual drift and recommendations separately.
Use `jumpspace task ci --since <ref> --json` before PR handoff when you want one packet containing scan, audit, doctor, drift, repair suggestions, graph query results, and proposed task blocks. Task-block code/test candidates are ranked per heading with the same weighted source-evidence details as `link suggest`; treat those candidates as suggestions, not applied links, and inspect `rejected_candidate_matches` before assuming touched files were missed.
Use `jumpspace task pr comment --since <ref>` before PR handoff when you want an idempotent review-only comment with the Jumpspace marker, mutation policy, evidence-backed review items, and embedded CI report. Replace an existing comment with the same marker only after human review.
Use `jumpspace init --ci github --dry-run --json` before installing the GitHub workflow. It creates or updates only the Jumpspace-managed workflow, leaves unrelated user-authored workflows unchanged, and uses marker-based PR comment upserts.
Use `jumpspace task repair --since <ref> --json` to preview self-healing path repairs. Only run `jumpspace task repair --since <ref> --apply` after reviewing the dry-run; renames become mechanical fixes, while deleted or missing linked files become explicit gaps.
Use task `doc.line`, `doc.level`, and `doc.parent_headings` when duplicate headings make title-only references ambiguous. Source document renames require scan/config review; source document deletions require restore, recreate, stale/supersede, or explicit gap handling.
Use `jumpspace task last --json` after Jumpspace mutations, `jumpspace task history --task <id> --json` when you need a task/session trail, and `jumpspace task handoff --task <id> --json` before handing work to another agent or human. It summarizes recent mutations, health, task state, and suggested next commands.

Do not mark a task `implemented` unless code and tests are linked.
Do not create task blocks when a small durable intent is enough.
If `jumpspace intent validate --since <ref> --json` reports more than 3 new active intents, challenge whether the feature is over-capturing before adding more durable memory.
Do not claim intent violations from path overlap alone; use `unknown` unless local diff evidence contradicts quoted intent text.
