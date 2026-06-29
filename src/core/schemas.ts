export type JsonSchemaDefinition = {
  name: string;
  command: string;
  description: string;
  schema: Record<string, unknown>;
};

export type SchemaListEntry = Omit<JsonSchemaDefinition, "schema">;

export const SCHEMA_CONTRACT_VERSION = 1 as const;

export type JsonCommandContractDeclaration = {
  name: string;
  command: string;
  description: string;
};

export const jsonCommandContracts: JsonCommandContractDeclaration[] = [
  { name: "error", command: "all --json failures", description: "Standard JSON failure envelope emitted by command failures." },
  { name: "schema.list", command: "jumpspace schema list --json", description: "Lists available JSON schema contracts." },
  { name: "schema.show", command: "jumpspace schema show <name> --json", description: "Returns one named JSON schema contract." },
  { name: "schema.coverage", command: "jumpspace schema coverage --json", description: "Reports schema coverage across declared JSON commands, the live catalog, generated artifacts, and SDK contract surfaces." },
  { name: "list", command: "jumpspace list --json", description: "Indexed task list." },
  { name: "find", command: "jumpspace find <query...> --json", description: "Task search results with matched and unmatched terms." },
  { name: "find.compact", command: "jumpspace find <query...> --json --compact", description: "Compact task search results for agent orientation without embedded plans or long specs." },
  { name: "audit", command: "jumpspace audit --json", description: "Validation issues for task metadata and graph references." },
  { name: "last", command: "jumpspace last --json", description: "Most recent successful mutation summary." },
  { name: "history", command: "jumpspace history [--task <id>] [--limit <n>] --json", description: "Generated mutation history entries, newest first, with task and limit filters." },
  { name: "handoff", command: "jumpspace handoff [--task <id>] [--limit <n>] --json", description: "Agent handoff recap with recent mutations, graph health, optional task state, and suggested next commands." },
  { name: "init.ci", command: "jumpspace init --ci github --json", description: "Installs or previews a repo-local Jumpspace-managed GitHub Actions PR assistant workflow." },
  { name: "doctor", command: "jumpspace doctor [--since <ref>] --json", description: "Post-mutation diagnostics that separate blocking errors, factual warnings, and suggested repairs." },
  { name: "release.doctor", command: "jumpspace release doctor [--check-registry] --json", description: "Package release-readiness diagnostics with local blockers separated from external npm registry state." },
  { name: "release.install-doctor", command: "jumpspace release install-doctor --json", description: "Active install freshness diagnostics for the invoked and PATH-resolved Jumpspace binaries." },
  { name: "context", command: "jumpspace context <id> --json", description: "Agent-ready task context packet." },
  { name: "related", command: "jumpspace related <id> --json", description: "Full dependency and reference relationships for a task." },
  { name: "related.compact", command: "jumpspace related <id> --json --compact", description: "Compact dependency and reference relationships for agent orientation without embedded plans or long specs." },
  { name: "plan.review", command: "jumpspace plan review <id> --json", description: "Human approval and execution-readiness packet for a documented task." },
  { name: "plan.save", command: "jumpspace plan save <id> --file <plan-file> --json", description: "Successful durable plan persistence result." },
  { name: "plan.show", command: "jumpspace plan show <id> --json", description: "Persisted durable plan for a task." },
  { name: "plan.validate", command: "jumpspace plan validate <id> --json", description: "Durable plan validation result with issues and structured errors." },
  { name: "ready", command: "jumpspace ready --json", description: "Approved or partial tasks ready for agent execution." },
  { name: "execute", command: "jumpspace execute <id> --json", description: "Execution gate packet for an approved or partial task." },
  { name: "next", command: "jumpspace next <id> --json", description: "Pending unblocked durable plan steps for a task." },
  { name: "step.complete", command: "jumpspace step complete <task-id> <step-id> --evidence <evidence> --json", description: "Successful durable plan step completion result." },
  { name: "status", command: "jumpspace status <id> <status> --json", description: "Successful task status update result. Verified status is excluded and must be earned with verify." },
  { name: "verify", command: "jumpspace verify <id> --check <cmd> --criteria <criterion-id> --json", description: "Successful earned verification result with commit, checks, criteria coverage, and evidence." },
  { name: "work", command: "jumpspace work <id> [--since <ref>] --json", description: "Complete agent start packet for a ready task, including plan state, next steps, verification, schemas, guardrails, and optional drift." },
  { name: "ask", command: "jumpspace ask <question...> --json", description: "Evidence summary for a repo-local question. This is retrieval evidence, not an authoritative answer." },
  { name: "ask.compact", command: "jumpspace ask <question...> --json --compact", description: "Compact evidence summary for agent orientation. This is retrieval evidence, not an authoritative answer." },
  { name: "semantic.build", command: "jumpspace semantic build --json", description: "Builds and enables the optional local semantic task index." },
  { name: "semantic.status", command: "jumpspace semantic status --json", description: "Reports semantic index readiness, staleness, backend, and non-blocking issues." },
  { name: "semantic.search", command: "jumpspace semantic search <query...> --json", description: "Searches the generated local semantic task index." },
  { name: "semantic.eval", command: "jumpspace semantic eval --json", description: "Compares lexical, deterministic task-vector, and active semantic retrieval on built-in evaluation fixtures." },
  { name: "query", command: "jumpspace query [filters] --json", description: "Deterministic graph query results with applied filters, matched graph paths, and unanswered constraints." },
  { name: "drift", command: "jumpspace drift --since <ref> --json", description: "Factual task-memory drift separated from heuristic maintenance warnings." },
  { name: "ci", command: "jumpspace ci --since <ref> [--query <field=value>] --json", description: "Local CI/PR report with scan, audit, doctor, drift, repair suggestions, graph query packets, task-block suggestions, and a Markdown PR comment." },
  { name: "pr.comment", command: "jumpspace pr comment --since <ref> --json", description: "Idempotent, review-only PR assistant comment packet built from the local CI report." },
  { name: "repair", command: "jumpspace repair --since <ref> [--apply] --json", description: "Dry-run or applied task-memory repairs for Git path drift. Renames are mechanical fixes; missing/deleted linked files become explicit gaps." },
  { name: "link", command: "jumpspace link update <id> [link options] --json", description: "Dry-run or applied task metadata link updates for code, tests, dependencies, refs, and gaps." },
  { name: "link.suggest", command: "jumpspace link suggest <id> [--since <ref>] [--path <path>] --json", description: "Evidence-backed code/test link suggestions from working-tree changes, changed files, or explicit candidate paths. This command never mutates source." },
  { name: "link.eval", command: "jumpspace link eval [--file <fixture-file>] --json", description: "Built-in or file-based ranking quality evaluation for link suggestion fixtures." },
  { name: "bootstrap.context", command: "jumpspace bootstrap context [paths...] --json", description: "Markdown heading context packet for AI-assisted graph bootstrap proposals." },
  { name: "bootstrap.discover", command: "jumpspace bootstrap discover --json", description: "Discovers common Markdown docs, recommended config globs, profile hints, and ignored noisy paths." },
  { name: "bootstrap.propose", command: "jumpspace bootstrap propose [paths...] [--file <proposal-file>] --json", description: "Deterministic bootstrap proposal draft packet. This is extraction evidence, not agent reasoning, and apply still requires human approval." },
  { name: "bootstrap.validate", command: "jumpspace bootstrap validate --file <proposal-file> --json", description: "Bootstrap proposal validation result." },
  { name: "bootstrap.apply", command: "jumpspace bootstrap apply --file <proposal-file> [--dry-run] --json", description: "Bootstrap apply or dry-run result." },
];

const schemaVersion = "https://json-schema.org/draft/2020-12/schema";

const taskSummarySchema = {
  type: "object",
  required: ["id", "title", "type", "status", "doc", "spec", "code", "tests", "depends_on"],
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    type: { enum: ["spec", "engineering", "hotfix", "adr"] },
    status: { enum: ["draft", "proposed", "approved", "partial", "implemented", "verified", "stale"] },
    module: { type: "string" },
    space: { enum: ["repo", "module", "global"] },
    doc: {
      type: "object",
      required: ["path", "heading"],
      properties: {
        path: { type: "string" },
        heading: { type: "string" },
        line: { type: "number" },
        level: { type: "number" },
        parent_headings: { type: "array", items: { type: "string" } },
      },
    },
    spec: { type: "string" },
    code: { type: "array", items: { type: "string" } },
    tests: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    depends_on: { type: "array", items: { type: "string" } },
  },
};

const compactTaskSchema = {
  type: "object",
  required: ["id", "title", "type", "status", "doc", "links", "code", "tests", "gaps", "depends_on"],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    type: { enum: ["spec", "engineering", "hotfix", "adr"] },
    status: { enum: ["draft", "proposed", "approved", "partial", "implemented", "verified", "stale"] },
    module: { type: "string" },
    space: { enum: ["repo", "module", "global"] },
    doc: {
      type: "object",
      required: ["path", "heading"],
      additionalProperties: false,
      properties: {
        path: { type: "string" },
        heading: { type: "string" },
        line: { type: "number" },
        level: { type: "number" },
        parent_headings: { type: "array", items: { type: "string" } },
      },
    },
    links: {
      type: "object",
      required: ["code", "tests", "gaps", "depends_on", "refs"],
      additionalProperties: false,
      properties: {
        code: { type: "number" },
        tests: { type: "number" },
        gaps: { type: "number" },
        depends_on: { type: "number" },
        refs: { type: "number" },
      },
    },
    code: { type: "array", items: { type: "string" } },
    tests: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    depends_on: { type: "array", items: { type: "string" } },
  },
};

const compactSearchResultSchema = {
  type: "object",
  required: ["task", "score", "matchedTerms", "unmatchedTerms", "matchReasons"],
  additionalProperties: false,
  properties: {
    task: compactTaskSchema,
    score: { type: "number" },
    matchedTerms: { type: "array", items: { type: "string" } },
    unmatchedTerms: { type: "array", items: { type: "string" } },
    matchReasons: { type: "array", items: { type: "string" } },
  },
};

const taskRefSchema = {
  type: "object",
  required: ["type", "id"],
  additionalProperties: false,
  properties: {
    type: { enum: ["depends_on", "related_to", "implements", "supersedes", "conflicts_with", "informs"] },
    id: { type: "string" },
    note: { type: "string" },
  },
};

const issueSchema = {
  type: "object",
  required: ["severity", "code", "message"],
  additionalProperties: false,
  properties: {
    severity: { enum: ["warning", "error"] },
    code: { type: "string" },
    message: { type: "string" },
    path: { type: "string" },
    line: { type: "number" },
    taskId: { type: "string" },
    stepId: { type: "string" },
  },
};

const releaseDoctorIssueSchema = {
  type: "object",
  required: ["code", "message", "category"],
  additionalProperties: false,
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    category: { enum: ["local", "external"] },
    path: { type: "string" },
    field: { type: "string" },
    expected: { type: "string" },
    actual: { type: "string" },
  },
};

const releaseDoctorCheckSchema = {
  type: "object",
  required: ["name", "status", "message"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    status: { enum: ["pass", "fail", "warning"] },
    message: { type: "string" },
    path: { type: "string" },
    expected: { type: "string" },
    actual: { type: "string" },
  },
};

const releaseDoctorFileSchema = {
  type: "object",
  required: ["path"],
  additionalProperties: false,
  properties: {
    path: { type: "string" },
    size: { type: "number" },
    mode: { type: "number" },
  },
};

const installDoctorWarningSchema = {
  type: "object",
  required: ["code", "message"],
  additionalProperties: false,
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    path: { type: "string" },
    expected: { type: "string" },
    actual: { type: "string" },
    command: { type: "string" },
  },
};

const installDoctorBinarySchema = {
  type: "object",
  required: [
    "label",
    "path",
    "realpath",
    "exists",
    "mode",
    "executable",
    "package_root",
    "package_name",
    "package_version",
    "cli_version",
    "schema_count",
    "schema_contract_version",
    "probe_errors",
  ],
  additionalProperties: false,
  properties: {
    label: { enum: ["invoked", "path"] },
    path: { anyOf: [{ type: "string" }, { type: "null" }] },
    realpath: { anyOf: [{ type: "string" }, { type: "null" }] },
    exists: { type: "boolean" },
    mode: { anyOf: [{ type: "string" }, { type: "null" }] },
    executable: { anyOf: [{ type: "boolean" }, { type: "null" }] },
    package_root: { anyOf: [{ type: "string" }, { type: "null" }] },
    package_name: { anyOf: [{ type: "string" }, { type: "null" }] },
    package_version: { anyOf: [{ type: "string" }, { type: "null" }] },
    cli_version: { anyOf: [{ type: "string" }, { type: "null" }] },
    schema_count: { anyOf: [{ type: "number" }, { type: "null" }] },
    schema_contract_version: { anyOf: [{ type: "number" }, { type: "null" }] },
    probe_errors: { type: "array", items: { type: "string" } },
  },
};

const schemaCoverageIssueSchema = {
  type: "object",
  required: ["severity", "code", "message"],
  additionalProperties: false,
  properties: {
    severity: { enum: ["error", "warning"] },
    code: { type: "string" },
    message: { type: "string" },
    name: { type: "string" },
    path: { type: "string" },
    command: { type: "string" },
  },
};

const commandErrorSchema = {
  type: "object",
  required: ["code", "message"],
  additionalProperties: false,
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    taskId: { type: "string" },
    path: { type: "string" },
    stepId: { type: "string" },
  },
};

const mutationSummarySchema = {
  type: "object",
  required: ["version", "command", "recorded_at", "touched_files", "task_ids", "config_changes", "index_changed", "warnings"],
  additionalProperties: false,
  properties: {
    version: { const: 1 },
    command: { type: "string" },
    recorded_at: { type: "string" },
    touched_files: { type: "array", items: { type: "string" } },
    task_ids: { type: "array", items: { type: "string" } },
    config_changes: { type: "array", items: { type: "string" } },
    index_changed: { type: "boolean" },
    warnings: { type: "array", items: commandErrorSchema },
  },
};

const planStepSchema = {
  type: "object",
  required: ["id", "outcome", "status", "depends_on", "source_files", "tests", "checks", "evidence"],
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    outcome: { type: "string" },
    status: { enum: ["pending", "in_progress", "complete", "blocked"] },
    depends_on: { type: "array", items: { type: "string" } },
    source_files: { type: "array", items: { type: "string" } },
    tests: { type: "array", items: { type: "string" } },
    checks: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
  },
};

const planSchema = {
  type: "object",
  required: ["task_id", "goal", "status", "steps"],
  additionalProperties: true,
  properties: {
    task_id: { type: "string" },
    goal: { type: "string" },
    status: { enum: ["pending", "in_progress", "complete", "blocked"] },
    steps: { type: "array", items: planStepSchema },
  },
};

const executionBlockerSchema = {
  type: "object",
  required: ["type", "message"],
  additionalProperties: false,
  properties: {
    type: { enum: ["status", "dependency"] },
    message: { type: "string" },
    taskId: { type: "string" },
    status: { type: "string" },
  },
};

const executionStateSchema = {
  type: "object",
  required: ["task", "ready", "blockers", "dependencies", "missingDependencies"],
  additionalProperties: true,
  properties: {
    task: taskSummarySchema,
    ready: { type: "boolean" },
    blockers: { type: "array", items: executionBlockerSchema },
    dependencies: { type: "array", items: taskSummarySchema },
    missingDependencies: { type: "array", items: { type: "string" } },
  },
};

const mutationHistorySchema = {
  type: "object",
  required: ["history_path", "total", "returned", "filters", "entries"],
  additionalProperties: false,
  properties: {
    history_path: { type: "string" },
    total: { type: "number" },
    returned: { type: "number" },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        task_id: { type: "string" },
        limit: { type: "number" },
      },
    },
    entries: { type: "array", items: mutationSummarySchema },
  },
};

const handoffHealthSummarySchema = {
  type: "object",
  required: ["ok", "error_count", "warning_count"],
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    error_count: { type: "number" },
    warning_count: { type: "number" },
  },
};

const handoffTaskStateSchema = {
  type: "object",
  required: ["id", "title", "status", "type", "doc", "plan_status", "execution_ready", "blockers", "pending_step_ids", "required_checks"],
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    status: { enum: ["draft", "proposed", "approved", "partial", "implemented", "verified", "stale"] },
    type: { enum: ["spec", "engineering", "hotfix", "adr"] },
    module: { type: "string" },
    space: { enum: ["repo", "module", "global"] },
    doc: {
      type: "object",
      required: ["path", "heading"],
      additionalProperties: false,
      properties: {
        path: { type: "string" },
        heading: { type: "string" },
        line: { type: "number" },
        level: { type: "number" },
        parent_headings: { type: "array", items: { type: "string" } },
      },
    },
    plan_status: { anyOf: [{ enum: ["pending", "in_progress", "complete", "blocked"] }, { type: "null" }] },
    execution_ready: { type: "boolean" },
    blockers: { type: "array", items: executionBlockerSchema },
    pending_step_ids: { type: "array", items: { type: "string" } },
    required_checks: { type: "array", items: { type: "string" } },
  },
};

const verificationRecordSchema = {
  type: "object",
  required: ["id", "verified_at", "commit", "checks", "acceptance_criteria_covered", "evidence"],
  additionalProperties: true,
  properties: {
    id: { type: "string" },
    verified_at: { type: "string" },
    commit: { type: "string" },
    checks: {
      type: "array",
      items: {
        type: "object",
        required: ["command", "exit_code"],
        additionalProperties: false,
        properties: {
          command: { type: "string" },
          exit_code: { type: "number" },
        },
      },
    },
    acceptance_criteria_covered: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
  },
};

const repairReportSchema = {
  type: "object",
  required: ["ok", "since", "mode", "applied", "mechanical_fixes", "gaps", "warnings", "touched_files", "task_ids"],
  additionalProperties: false,
  properties: {
    ok: { const: true },
    since: { type: "string" },
    mode: { enum: ["dry-run", "apply"] },
    applied: { type: "boolean" },
    mechanical_fixes: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "task_id", "field", "old_path", "new_path", "sources"],
        additionalProperties: false,
        properties: {
          type: { const: "replace_linked_path" },
          task_id: { type: "string" },
          field: { enum: ["code", "tests", "sources"] },
          old_path: { type: "string" },
          new_path: { type: "string" },
          sources: { type: "array", items: { type: "string" } },
        },
      },
    },
    gaps: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "task_id", "field", "path", "reason", "message", "removes_link"],
        additionalProperties: false,
        properties: {
          type: { const: "record_gap" },
          task_id: { type: "string" },
          field: { enum: ["code", "tests"] },
          path: { type: "string" },
          reason: { enum: ["deleted", "missing"] },
          message: { type: "string" },
          removes_link: { type: "boolean" },
        },
      },
    },
    warnings: {
      type: "array",
      items: {
        type: "object",
        required: ["code", "message"],
        additionalProperties: false,
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          taskId: { type: "string" },
          path: { type: "string" },
        },
      },
    },
    touched_files: { type: "array", items: { type: "string" } },
    task_ids: { type: "array", items: { type: "string" } },
  },
};

const linkOperationSchema = {
  type: "object",
  required: ["action", "field", "value", "changed", "reason"],
  additionalProperties: false,
  properties: {
    action: { enum: ["add", "remove"] },
    field: { enum: ["code", "test", "depends_on", "ref", "gap"] },
    value: { type: "string" },
    changed: { type: "boolean" },
    reason: { enum: ["added", "removed", "already_present", "not_present"] },
    ref: taskRefSchema,
  },
};

const linkSuggestionEvidenceSchema = {
  type: "object",
  required: ["path_terms", "basename_terms", "content_terms", "identifier_terms", "phrase_matches", "coverage"],
  additionalProperties: false,
  properties: {
    path_terms: { type: "array", items: { type: "string" } },
    basename_terms: { type: "array", items: { type: "string" } },
    content_terms: { type: "array", items: { type: "string" } },
    identifier_terms: { type: "array", items: { type: "string" } },
    phrase_matches: { type: "array", items: { type: "string" } },
    coverage: {
      type: "object",
      required: ["matched_terms", "total_terms", "ratio"],
      additionalProperties: false,
      properties: {
        matched_terms: { type: "number" },
        total_terms: { type: "number" },
        ratio: { type: "number" },
      },
    },
  },
};

const linkSuggestionSchema = {
  type: "object",
  required: ["task_id", "field", "path", "score", "match_reasons", "matched_terms", "evidence", "sources", "statuses"],
  additionalProperties: false,
  properties: {
    task_id: { type: "string" },
    field: { enum: ["code", "tests"] },
    path: { type: "string" },
    score: { type: "number" },
    match_reasons: { type: "array", items: { type: "string" } },
    matched_terms: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
    sources: { type: "array", items: { type: "string" } },
    statuses: { type: "array", items: { type: "string" } },
  },
};

const linkRejectedCandidateSchema = {
  type: "object",
  required: ["task_id", "field", "path", "reason", "match_reasons", "matched_terms", "evidence", "sources", "statuses"],
  additionalProperties: false,
  properties: {
    task_id: { type: "string" },
    field: { enum: ["code", "tests"] },
    path: { type: "string" },
    reason: { const: "NO_SOURCE_EVIDENCE" },
    match_reasons: { type: "array", items: { type: "string" } },
    matched_terms: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
    sources: { type: "array", items: { type: "string" } },
    statuses: { type: "array", items: { type: "string" } },
  },
};

const ciTaskBlockCandidateMatchSchema = {
  type: "object",
  required: ["path", "score", "match_reasons", "matched_terms", "evidence", "sources", "statuses"],
  additionalProperties: false,
  properties: {
    path: { type: "string" },
    score: { type: "number" },
    match_reasons: { type: "array", items: { type: "string" } },
    matched_terms: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
    sources: { type: "array", items: { type: "string" } },
    statuses: { type: "array", items: { type: "string" } },
  },
};

const ciTaskBlockRejectedCandidateSchema = {
  type: "object",
  required: ["path", "field", "reason", "match_reasons", "matched_terms", "evidence", "sources", "statuses"],
  additionalProperties: false,
  properties: {
    path: { type: "string" },
    field: { enum: ["code", "tests"] },
    reason: { const: "NO_SOURCE_EVIDENCE" },
    match_reasons: { type: "array", items: { type: "string" } },
    matched_terms: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
    sources: { type: "array", items: { type: "string" } },
    statuses: { type: "array", items: { type: "string" } },
  },
};

const prAssistantTaskBlockCandidateSchema = {
  type: "object",
  required: ["field", "path", "score", "match_reasons", "matched_terms", "evidence", "sources", "statuses"],
  additionalProperties: false,
  properties: {
    field: { enum: ["code", "tests"] },
    path: { type: "string" },
    score: { type: "number" },
    match_reasons: { type: "array", items: { type: "string" } },
    matched_terms: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
    sources: { type: "array", items: { type: "string" } },
    statuses: { type: "array", items: { type: "string" } },
  },
};

const linkEvalSuggestionBriefSchema = {
  type: "object",
  required: ["field", "path", "score", "matched_terms", "match_reasons", "evidence"],
  additionalProperties: false,
  properties: {
    field: { enum: ["code", "tests"] },
    path: { type: "string" },
    score: { type: "number" },
    matched_terms: { type: "array", items: { type: "string" } },
    match_reasons: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
  },
};

const linkEvalExpectedSchema = {
  type: "object",
  required: ["path", "field", "max_rank"],
  additionalProperties: false,
  properties: {
    path: { anyOf: [{ type: "string" }, { type: "null" }] },
    field: { anyOf: [{ enum: ["code", "tests"] }, { type: "null" }] },
    max_rank: { anyOf: [{ type: "number" }, { type: "null" }] },
    min_matched_terms: { type: "number" },
  },
};

const graphQueryReportSchema = {
  type: "object",
  required: ["ok", "query", "results", "unanswered_constraints"],
  additionalProperties: false,
  properties: {
    ok: { const: true },
    query: {
      type: "object",
      required: ["filters"],
      additionalProperties: false,
      properties: {
        filters: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "op", "value"],
            additionalProperties: false,
            properties: {
              field: { type: "string" },
              op: { type: "string" },
              value: { type: "string" },
            },
          },
        },
      },
    },
    results: {
      type: "array",
      items: {
        type: "object",
        required: ["task", "matched_graph_paths"],
        additionalProperties: false,
        properties: {
          task: taskSummarySchema,
          matched_graph_paths: {
            type: "array",
            items: {
              type: "object",
              required: ["kind"],
              additionalProperties: true,
              properties: {
                kind: { enum: ["field", "depends_on", "depends_on_transitive", "ref", "referenced_by"] },
                field: { type: "string" },
                from: { type: "string" },
                to: { type: "string" },
                via: { type: "array", items: { type: "string" } },
                refType: { type: "string" },
                value: { type: "string" },
              },
            },
          },
        },
      },
    },
    unanswered_constraints: {
      type: "array",
      items: {
        type: "object",
        required: ["field", "op", "value"],
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          op: { type: "string" },
          value: { type: "string" },
        },
      },
    },
  },
};

const linkEvalRejectedCandidateBriefSchema = {
  type: "object",
  required: ["field", "path", "reason", "matched_terms", "match_reasons", "evidence"],
  additionalProperties: false,
  properties: {
    field: { enum: ["code", "tests"] },
    path: { type: "string" },
    reason: { const: "NO_SOURCE_EVIDENCE" },
    matched_terms: { type: "array", items: { type: "string" } },
    match_reasons: { type: "array", items: { type: "string" } },
    evidence: linkSuggestionEvidenceSchema,
  },
};

const semanticBackendSchema = {
  type: "object",
  required: ["active", "preferred", "selected", "optional_dependencies", "model", "vector_kind", "store", "degraded", "reason"],
  additionalProperties: false,
  properties: {
    active: { enum: ["local-task-vector-v1", "lancedb-onnx-v1"] },
    preferred: { const: "lancedb+onnx" },
    selected: { enum: ["auto", "local-task-vector-v1", "lancedb-onnx-v1"] },
    optional_dependencies: {
      type: "object",
      required: ["lancedb", "onnx"],
      additionalProperties: false,
      properties: {
        lancedb: { type: "boolean" },
        onnx: { type: "boolean" },
      },
    },
    model: {
      type: "object",
      required: ["name", "source"],
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        source: { enum: ["default", "config", "option", "provider"] },
        dimensions: { type: "number" },
      },
    },
    vector_kind: { enum: ["sparse_terms", "dense_embedding"] },
    store: {
      type: "object",
      required: ["kind", "path", "available"],
      additionalProperties: false,
      properties: {
        kind: { enum: ["json", "lancedb"] },
        path: { type: "string" },
        table: { type: "string" },
        available: { type: "boolean" },
        reason: { type: "string" },
      },
    },
    degraded: { type: "boolean" },
    reason: { type: "string" },
  },
};

const semanticSourceIndexSchema = {
  type: "object",
  required: ["path", "generated_at", "task_count", "task_ids", "hash"],
  additionalProperties: false,
  properties: {
    path: { type: "string" },
    generated_at: { type: "string" },
    task_count: { type: "number" },
    task_ids: { type: "array", items: { type: "string" } },
    hash: { type: "string" },
  },
};

const semanticSearchResultSchema = {
  type: "object",
  required: [
    "task_id",
    "title",
    "path",
    "heading",
    "score",
    "matched_terms",
    "semantic_terms",
    "match_reasons",
    "graph_expansion",
    "connected_tasks",
  ],
  additionalProperties: false,
  properties: {
    task_id: { type: "string" },
    title: { type: "string" },
    path: { type: "string" },
    heading: { type: "string" },
    score: { type: "number" },
    matched_terms: { type: "array", items: { type: "string" } },
    semantic_terms: { type: "array", items: { type: "string" } },
    match_reasons: { type: "array", items: { type: "string" } },
    graph_expansion: {
      type: "array",
      items: {
        type: "object",
        required: ["kind", "from", "to", "via"],
        additionalProperties: false,
        properties: {
          kind: {
            enum: [
              "dependency",
              "dependent",
              "ref",
              "referenced_by",
              "supersedes",
              "superseded_by",
              "supersession_chain",
              "module",
              "space",
            ],
          },
          from: { type: "string" },
          to: { type: "string" },
          via: { type: "array", items: { type: "string" } },
          ref_type: { type: "string" },
          field: { enum: ["module", "space"] },
          value: { type: "string" },
        },
      },
    },
    connected_tasks: {
      type: "array",
      items: {
        type: "object",
        required: ["task_id", "title", "status", "path", "heading", "relation", "via"],
        additionalProperties: false,
        properties: {
          task_id: { type: "string" },
          title: { type: "string" },
          status: { type: "string" },
          path: { type: "string" },
          heading: { type: "string" },
          relation: { type: "string" },
          via: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const initCiWorkflowSchema = {
  type: "object",
  required: ["ok", "provider", "dry_run", "files", "warnings"],
  additionalProperties: false,
  properties: {
    ok: { const: true },
    provider: { const: "github" },
    dry_run: { type: "boolean" },
    files: {
      type: "array",
      items: {
        type: "object",
        required: ["provider", "path", "action", "changed", "managed", "reason"],
        additionalProperties: false,
        properties: {
          provider: { const: "github" },
          path: { type: "string" },
          action: { enum: ["created", "updated", "unchanged"] },
          changed: { type: "boolean" },
          managed: { type: "boolean" },
          reason: {
            enum: ["missing", "managed_block", "legacy_jumpspace_template", "already_current", "user_owned"],
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: {
        type: "object",
        required: ["code", "message"],
        additionalProperties: false,
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          path: { type: "string" },
        },
      },
    },
  },
};

const ciReportSchema = {
  type: "object",
  required: [
    "ok",
    "since",
    "scan",
    "changed",
    "audit",
    "doctor",
    "drift",
    "repair",
    "graph_queries",
    "suggestions",
    "summary",
    "pr_comment",
  ],
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    since: { type: "string" },
    scan: {
      type: "object",
      required: ["indexed_tasks", "index_path"],
      additionalProperties: false,
      properties: {
        indexed_tasks: { type: "number" },
        index_path: { type: "string" },
      },
    },
    changed: { type: "array", items: { type: "object" } },
    audit: { type: "object" },
    doctor: { type: "object" },
    drift: { type: "object" },
    repair: repairReportSchema,
    graph_queries: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "result"],
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          result: graphQueryReportSchema,
        },
      },
    },
    suggestions: {
      type: "object",
      required: ["task_blocks", "repair"],
      additionalProperties: false,
      properties: {
        task_blocks: {
          type: "array",
          items: {
            type: "object",
            required: [
              "type",
              "id",
              "path",
              "heading",
              "line",
              "reason",
              "linked_code_candidates",
              "linked_test_candidates",
              "linked_code_candidate_matches",
              "linked_test_candidate_matches",
              "rejected_candidate_matches",
              "block",
            ],
            additionalProperties: false,
            properties: {
              type: { const: "task_block" },
              id: { type: "string" },
              path: { type: "string" },
              heading: { type: "string" },
              line: { type: "number" },
              reason: { type: "string" },
              linked_code_candidates: { type: "array", items: { type: "string" } },
              linked_test_candidates: { type: "array", items: { type: "string" } },
              linked_code_candidate_matches: { type: "array", items: ciTaskBlockCandidateMatchSchema },
              linked_test_candidate_matches: { type: "array", items: ciTaskBlockCandidateMatchSchema },
              rejected_candidate_matches: { type: "array", items: ciTaskBlockRejectedCandidateSchema },
              block: { type: "string" },
            },
          },
        },
        repair: {
          type: "object",
          required: ["mechanical_fixes", "gaps"],
          additionalProperties: false,
          properties: {
            mechanical_fixes: { type: "array", items: { type: "object" } },
            gaps: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
    summary: {
      type: "object",
      required: ["blocking_errors", "warnings", "changed_files", "suggested_task_blocks", "repair_fixes", "repair_gaps", "graph_query_results"],
      additionalProperties: false,
      properties: {
        blocking_errors: { type: "number" },
        warnings: { type: "number" },
        changed_files: { type: "number" },
        suggested_task_blocks: { type: "number" },
        repair_fixes: { type: "number" },
        repair_gaps: { type: "number" },
        graph_query_results: { type: "number" },
      },
    },
    pr_comment: { type: "string" },
  },
};

const prAssistantReviewItemSchema = {
  anyOf: [
    {
      type: "object",
      required: ["type", "id", "path", "line", "heading", "useful_candidates", "rejected_candidates", "evidence", "body"],
      additionalProperties: false,
      properties: {
        type: { const: "task_block" },
        id: { type: "string" },
        path: { type: "string" },
        line: { type: "number" },
        heading: { type: "string" },
        useful_candidates: { type: "array", items: prAssistantTaskBlockCandidateSchema },
        rejected_candidates: { type: "array", items: ciTaskBlockRejectedCandidateSchema },
        evidence: { type: "array", items: { type: "string" } },
        body: { type: "string" },
      },
    },
    {
      type: "object",
      required: ["type", "task_id", "field", "old_path", "new_path", "evidence", "command"],
      additionalProperties: false,
      properties: {
        type: { const: "repair" },
        task_id: { type: "string" },
        field: { enum: ["code", "tests", "sources"] },
        old_path: { type: "string" },
        new_path: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
        command: { type: "string" },
      },
    },
    {
      type: "object",
      required: ["type", "task_id", "field", "path", "evidence", "command"],
      additionalProperties: false,
      properties: {
        type: { const: "gap" },
        task_id: { type: "string" },
        field: { enum: ["code", "tests"] },
        path: { type: "string" },
        evidence: { type: "array", items: { type: "string" } },
        command: { type: "string" },
      },
    },
  ],
};

const prAssistantReportSchema = {
  type: "object",
  required: [
    "ok",
    "assistant_version",
    "since",
    "mode",
    "idempotency",
    "mutation_policy",
    "schemas",
    "ci",
    "review_items",
    "summary",
    "review_comment",
  ],
  additionalProperties: false,
  properties: {
    ok: { type: "boolean" },
    assistant_version: { const: 1 },
    since: { type: "string" },
    mode: { const: "local" },
    idempotency: {
      type: "object",
      required: ["marker", "strategy", "fingerprint"],
      additionalProperties: false,
      properties: {
        marker: { const: "<!-- jumpspace-pr-assistant:v1 -->" },
        strategy: { const: "replace_existing_comment_with_same_marker" },
        fingerprint: { type: "string" },
      },
    },
    mutation_policy: {
      type: "object",
      required: ["mutates", "requires_human_approval", "allowed_follow_up_commands"],
      additionalProperties: false,
      properties: {
        mutates: { const: false },
        requires_human_approval: { const: true },
        allowed_follow_up_commands: { type: "array", items: { type: "string" } },
      },
    },
    schemas: {
      type: "object",
      required: ["packet", "ci", "errors"],
      additionalProperties: false,
      properties: {
        packet: { const: "pr.comment" },
        ci: { const: "ci" },
        errors: { const: "error" },
      },
    },
    ci: ciReportSchema,
    review_items: { type: "array", items: prAssistantReviewItemSchema },
    summary: {
      type: "object",
      required: ["review_items", "task_blocks", "repair_fixes", "repair_gaps", "blocking_errors", "warnings"],
      additionalProperties: false,
      properties: {
        review_items: { type: "number" },
        task_blocks: { type: "number" },
        repair_fixes: { type: "number" },
        repair_gaps: { type: "number" },
        blocking_errors: { type: "number" },
        warnings: { type: "number" },
      },
    },
    review_comment: { type: "string" },
  },
};

export const schemaCatalog: JsonSchemaDefinition[] = [
  {
    name: "error",
    command: "all --json failures",
    description: "Standard JSON failure envelope emitted by command failures.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "errors"],
      additionalProperties: false,
      properties: {
        ok: { const: false },
        errors: { type: "array", minItems: 1, items: commandErrorSchema },
      },
    },
  },
  {
    name: "schema.list",
    command: "jumpspace schema list --json",
    description: "Lists available JSON schema contracts.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "contract_version", "schemas"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        contract_version: { const: 1 },
        schemas: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "command", "description"],
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              command: { type: "string" },
              description: { type: "string" },
            },
          },
        },
      },
    },
  },
  {
    name: "schema.show",
    command: "jumpspace schema show <name> --json",
    description: "Returns one named JSON schema contract.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "contract_version", "schema"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        contract_version: { const: 1 },
        schema: { type: "object" },
      },
    },
  },
  {
    name: "schema.coverage",
    command: "jumpspace schema coverage --json",
    description: "Reports schema coverage across declared JSON commands, the live catalog, generated artifacts, and SDK contract surfaces.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "contract_version", "summary", "declared", "catalog", "generated", "sdk", "issues"],
      additionalProperties: false,
      properties: {
        ok: { type: "boolean" },
        contract_version: { const: 1 },
        summary: {
          type: "object",
          required: ["declared", "catalog", "artifacts", "sdk_names", "missing", "orphaned", "stale", "issues", "errors"],
          additionalProperties: false,
          properties: {
            declared: { type: "number" },
            catalog: { type: "number" },
            artifacts: { type: "number" },
            sdk_names: { type: "number" },
            missing: { type: "number" },
            orphaned: { type: "number" },
            stale: { type: "number" },
            issues: { type: "number" },
            errors: { type: "number" },
          },
        },
        declared: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "command", "description"],
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              command: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        catalog: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "command", "description"],
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              command: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        generated: {
          type: "object",
          required: ["schema_dir", "catalog_path", "artifact_count"],
          additionalProperties: false,
          properties: {
            schema_dir: { type: "string" },
            catalog_path: { type: "string" },
            artifact_count: { type: "number" },
          },
        },
        sdk: {
          type: "object",
          required: ["name_count", "schema_names"],
          additionalProperties: false,
          properties: {
            name_count: { type: "number" },
            schema_names: { type: "array", items: { type: "string" } },
          },
        },
        issues: { type: "array", items: schemaCoverageIssueSchema },
      },
    },
  },
  {
    name: "list",
    command: "jumpspace list --json",
    description: "Indexed task list.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["tasks"],
      additionalProperties: false,
      properties: {
        tasks: { type: "array", items: taskSummarySchema },
      },
    },
  },
  {
    name: "find",
    command: "jumpspace find <query...> --json",
    description: "Task search results with matched and unmatched terms.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["query", "mode", "results"],
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        mode: { enum: ["all", "any"] },
        results: {
          type: "array",
          items: {
            type: "object",
            required: ["task", "score", "matchedTerms", "unmatchedTerms", "matchReasons"],
            additionalProperties: false,
            properties: {
              task: taskSummarySchema,
              score: { type: "number" },
              matchedTerms: { type: "array", items: { type: "string" } },
              unmatchedTerms: { type: "array", items: { type: "string" } },
              matchReasons: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  },
  {
    name: "find.compact",
    command: "jumpspace find <query...> --json --compact",
    description: "Compact task search results for agent orientation without embedded plans or long specs.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "query", "mode", "compact", "results"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        query: { type: "string" },
        mode: { enum: ["all", "any"] },
        compact: { const: true },
        results: { type: "array", items: compactSearchResultSchema },
      },
    },
  },
  {
    name: "audit",
    command: "jumpspace audit --json",
    description: "Validation issues for task metadata and graph references.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["issues", "ok", "errors", "warnings"],
      additionalProperties: false,
      properties: {
        issues: { type: "array", items: issueSchema },
        ok: { type: "boolean" },
        errors: { type: "array", items: issueSchema },
        warnings: { type: "array", items: issueSchema },
      },
    },
  },
  {
    name: "last",
    command: "jumpspace last --json",
    description: "Most recent successful mutation summary.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "summary"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        summary: mutationSummarySchema,
      },
    },
  },
  {
    name: "history",
    command: "jumpspace history [--task <id>] [--limit <n>] --json",
    description: "Generated mutation history entries, newest first, with task and limit filters.",
    schema: {
      $schema: schemaVersion,
      ...mutationHistorySchema,
      required: ["ok", ...mutationHistorySchema.required],
      properties: {
        ok: { const: true },
        ...mutationHistorySchema.properties,
      },
    },
  },
  {
    name: "handoff",
    command: "jumpspace handoff [--task <id>] [--limit <n>] --json",
    description: "Agent handoff recap with recent mutations, graph health, optional task state, and suggested next commands.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: [
        "ok",
        "packet_version",
        "generated_at",
        "status",
        "filters",
        "summary",
        "recent_mutations",
        "last_mutation",
        "touched_files",
        "task_ids",
        "config_changes",
        "mutation_warnings",
        "health",
        "task",
        "suggested_commands",
        "schemas",
      ],
      additionalProperties: false,
      properties: {
        ok: { type: "boolean" },
        packet_version: { const: 1 },
        generated_at: { type: "string" },
        status: { enum: ["ready", "attention", "blocked"] },
        filters: {
          type: "object",
          required: ["limit"],
          additionalProperties: false,
          properties: {
            task_id: { type: "string" },
            limit: { type: "number" },
          },
        },
        summary: {
          type: "object",
          required: [
            "audit_errors",
            "audit_warnings",
            "doctor_errors",
            "doctor_warnings",
            "doctor_suggestions",
            "mutations_returned",
            "touched_files",
            "task_ids",
            "config_changes",
            "mutation_warnings",
          ],
          additionalProperties: false,
          properties: {
            audit_errors: { type: "number" },
            audit_warnings: { type: "number" },
            doctor_errors: { type: "number" },
            doctor_warnings: { type: "number" },
            doctor_suggestions: { type: "number" },
            mutations_returned: { type: "number" },
            touched_files: { type: "number" },
            task_ids: { type: "number" },
            config_changes: { type: "number" },
            mutation_warnings: { type: "number" },
          },
        },
        recent_mutations: mutationHistorySchema,
        last_mutation: { anyOf: [mutationSummarySchema, { type: "null" }] },
        touched_files: { type: "array", items: { type: "string" } },
        task_ids: { type: "array", items: { type: "string" } },
        config_changes: { type: "array", items: { type: "string" } },
        mutation_warnings: { type: "array", items: commandErrorSchema },
        health: {
          type: "object",
          required: ["audit", "doctor"],
          additionalProperties: false,
          properties: {
            audit: {
              ...handoffHealthSummarySchema,
              required: [...handoffHealthSummarySchema.required, "errors", "warnings"],
              properties: {
                ...handoffHealthSummarySchema.properties,
                errors: { type: "array", items: issueSchema },
                warnings: { type: "array", items: issueSchema },
              },
            },
            doctor: {
              ...handoffHealthSummarySchema,
              required: [...handoffHealthSummarySchema.required, "suggestions"],
              properties: {
                ...handoffHealthSummarySchema.properties,
                suggestions: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        task: { anyOf: [handoffTaskStateSchema, { type: "null" }] },
        suggested_commands: { type: "array", items: { type: "string" } },
        schemas: {
          type: "object",
          required: ["packet", "failures", "history", "doctor", "audit", "context", "next", "schema_coverage"],
          additionalProperties: false,
          properties: {
            packet: { const: "handoff" },
            failures: { const: "error" },
            history: { const: "history" },
            doctor: { const: "doctor" },
            audit: { const: "audit" },
            context: { const: "context" },
            next: { const: "next" },
            schema_coverage: { const: "schema.coverage" },
          },
        },
      },
    },
  },
  {
    name: "init.ci",
    command: "jumpspace init --ci github --json",
    description: "Installs or previews a repo-local Jumpspace-managed GitHub Actions PR assistant workflow.",
    schema: {
      $schema: schemaVersion,
      ...initCiWorkflowSchema,
    },
  },
  {
    name: "doctor",
    command: "jumpspace doctor [--since <ref>] --json",
    description: "Post-mutation diagnostics that separate blocking errors, factual warnings, and suggested repairs.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "errors", "warnings", "suggestions", "checked", "last_mutation", "repair"],
      additionalProperties: false,
      properties: {
        ok: { type: "boolean" },
        errors: { type: "array", items: issueSchema },
        warnings: { type: "array", items: issueSchema },
        suggestions: { type: "array", items: { type: "object" } },
        checked: {
          type: "object",
          required: ["config_docs", "ignored_patterns", "semantic_index"],
          additionalProperties: false,
          properties: {
            config_docs: { type: "array", items: { type: "string" } },
            ignored_patterns: { type: "array", items: { type: "string" } },
            repair_since: { type: "string" },
            semantic_index: {
              type: "object",
              required: ["enabled", "path"],
              additionalProperties: false,
              properties: {
                enabled: { type: "boolean" },
                path: { type: "string" },
              },
            },
          },
        },
        last_mutation: { anyOf: [{ type: "object" }, { type: "null" }] },
        repair: { anyOf: [repairReportSchema, { type: "null" }] },
      },
    },
  },
  {
    name: "release.doctor",
    command: "jumpspace release doctor [--check-registry] --json",
    description: "Package release-readiness diagnostics with local blockers separated from external npm registry state.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: [
        "ok",
        "checked_at",
        "status",
        "summary",
        "package",
        "package_dry_run",
        "schemas",
        "registry",
        "local_blockers",
        "local_warnings",
        "external_warnings",
      ],
      additionalProperties: false,
      properties: {
        ok: { type: "boolean" },
        checked_at: { type: "string" },
        status: { enum: ["ready", "blocked"] },
        summary: {
          type: "object",
          required: ["local_blockers", "local_warnings", "external_warnings"],
          additionalProperties: false,
          properties: {
            local_blockers: { type: "number" },
            local_warnings: { type: "number" },
            external_warnings: { type: "number" },
          },
        },
        package: {
          type: "object",
          required: [
            "name",
            "version",
            "license",
            "repository",
            "homepage",
            "bugs",
            "keywords",
            "metadata_checks",
            "license_file",
            "bin",
          ],
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            license: { anyOf: [{ type: "string" }, { type: "null" }] },
            repository: {},
            homepage: { anyOf: [{ type: "string" }, { type: "null" }] },
            bugs: {},
            keywords: { type: "array", items: { type: "string" } },
            metadata_checks: { type: "array", items: releaseDoctorCheckSchema },
            license_file: {
              type: "object",
              required: ["path", "exists"],
              additionalProperties: false,
              properties: {
                path: { type: "string" },
                exists: { type: "boolean" },
              },
            },
            bin: {
              anyOf: [
                {
                  type: "object",
                  required: ["name", "target", "path", "exists", "mode", "executable"],
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    target: { type: "string" },
                    path: { type: "string" },
                    exists: { type: "boolean" },
                    mode: { anyOf: [{ type: "string" }, { type: "null" }] },
                    executable: { type: "boolean" },
                  },
                },
                { type: "null" },
              ],
            },
          },
        },
        package_dry_run: {
          type: "object",
          required: ["ok", "command", "exit_code", "stderr", "error", "filename", "entry_count", "files", "required_files"],
          additionalProperties: false,
          properties: {
            ok: { type: "boolean" },
            command: { type: "string" },
            exit_code: { type: "number" },
            stderr: { type: "string" },
            error: { anyOf: [{ type: "string" }, { type: "null" }] },
            filename: { anyOf: [{ type: "string" }, { type: "null" }] },
            entry_count: { type: "number" },
            files: { type: "array", items: releaseDoctorFileSchema },
            required_files: { type: "array", items: releaseDoctorCheckSchema },
          },
        },
        schemas: {
          type: "object",
          required: ["expected", "included", "missing"],
          additionalProperties: false,
          properties: {
            expected: { type: "number" },
            included: { type: "number" },
            missing: { type: "array", items: { type: "string" } },
          },
        },
        registry: {
          type: "object",
          required: ["package_name", "status", "check", "checked", "command", "exit_code", "version", "reason"],
          additionalProperties: false,
          properties: {
            package_name: { type: "string" },
            status: { enum: ["available", "unavailable", "unknown"] },
            check: { enum: ["checked", "not_requested", "failed"] },
            checked: { type: "boolean" },
            command: { anyOf: [{ type: "string" }, { type: "null" }] },
            exit_code: { anyOf: [{ type: "number" }, { type: "null" }] },
            version: { anyOf: [{ type: "string" }, { type: "null" }] },
            reason: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
        },
        local_blockers: { type: "array", items: releaseDoctorIssueSchema },
        local_warnings: { type: "array", items: releaseDoctorIssueSchema },
        external_warnings: { type: "array", items: releaseDoctorIssueSchema },
      },
    },
  },
  {
    name: "release.install-doctor",
    command: "jumpspace release install-doctor --json",
    description: "Active install freshness diagnostics for the invoked and PATH-resolved Jumpspace binaries.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: [
        "ok",
        "checked_at",
        "status",
        "summary",
        "invocation",
        "binaries",
        "workspace",
        "comparisons",
        "warnings",
        "blockers",
        "repair_commands",
      ],
      additionalProperties: false,
      properties: {
        ok: { type: "boolean" },
        checked_at: { type: "string" },
        status: { enum: ["current", "attention", "blocked"] },
        summary: {
          type: "object",
          required: ["blockers", "warnings", "repair_commands"],
          additionalProperties: false,
          properties: {
            blockers: { type: "number" },
            warnings: { type: "number" },
            repair_commands: { type: "number" },
          },
        },
        invocation: {
          type: "object",
          required: ["argv1", "exec_path", "cwd"],
          additionalProperties: false,
          properties: {
            argv1: { anyOf: [{ type: "string" }, { type: "null" }] },
            exec_path: { type: "string" },
            cwd: { type: "string" },
          },
        },
        binaries: {
          type: "object",
          required: ["invoked", "path"],
          additionalProperties: false,
          properties: {
            invoked: installDoctorBinarySchema,
            path: installDoctorBinarySchema,
          },
        },
        workspace: {
          type: "object",
          required: [
            "root",
            "is_jumpspace_checkout",
            "package_name",
            "package_version",
            "dist_cli_path",
            "dist_cli_realpath",
            "dist_cli_exists",
            "dist_cli_executable",
            "schema_count",
          ],
          additionalProperties: false,
          properties: {
            root: { type: "string" },
            is_jumpspace_checkout: { type: "boolean" },
            package_name: { anyOf: [{ type: "string" }, { type: "null" }] },
            package_version: { anyOf: [{ type: "string" }, { type: "null" }] },
            dist_cli_path: { type: "string" },
            dist_cli_realpath: { anyOf: [{ type: "string" }, { type: "null" }] },
            dist_cli_exists: { type: "boolean" },
            dist_cli_executable: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            schema_count: { type: "number" },
          },
        },
        comparisons: {
          type: "object",
          required: [
            "invoked_matches_workspace_dist",
            "path_matches_workspace_dist",
            "invoked_matches_path_binary",
            "invoked_cli_version_matches_workspace",
            "path_cli_version_matches_workspace",
            "invoked_schema_count_matches_workspace",
            "path_schema_count_matches_workspace",
          ],
          additionalProperties: false,
          properties: {
            invoked_matches_workspace_dist: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            path_matches_workspace_dist: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            invoked_matches_path_binary: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            invoked_cli_version_matches_workspace: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            path_cli_version_matches_workspace: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            invoked_schema_count_matches_workspace: { anyOf: [{ type: "boolean" }, { type: "null" }] },
            path_schema_count_matches_workspace: { anyOf: [{ type: "boolean" }, { type: "null" }] },
          },
        },
        warnings: { type: "array", items: installDoctorWarningSchema },
        blockers: { type: "array", items: installDoctorWarningSchema },
        repair_commands: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "context",
    command: "jumpspace context <id> --json",
    description: "Agent-ready task context packet.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["task", "plan", "execution"],
      additionalProperties: false,
      properties: {
        task: taskSummarySchema,
        plan: { anyOf: [{ type: "object" }, { type: "null" }] },
        execution: { type: "object" },
      },
    },
  },
  {
    name: "related",
    command: "jumpspace related <id> --json",
    description: "Full dependency and reference relationships for a task.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["task", "dependencies", "dependents", "references", "referencedBy"],
      additionalProperties: false,
      properties: {
        task: taskSummarySchema,
        dependencies: { type: "array", items: taskSummarySchema },
        dependents: { type: "array", items: taskSummarySchema },
        references: {
          type: "array",
          items: {
            type: "object",
            required: ["ref"],
            additionalProperties: false,
            properties: {
              ref: taskRefSchema,
              task: taskSummarySchema,
            },
          },
        },
        referencedBy: {
          type: "array",
          items: {
            type: "object",
            required: ["task", "ref"],
            additionalProperties: false,
            properties: {
              task: taskSummarySchema,
              ref: taskRefSchema,
            },
          },
        },
      },
    },
  },
  {
    name: "related.compact",
    command: "jumpspace related <id> --json --compact",
    description: "Compact dependency and reference relationships for agent orientation without embedded plans or long specs.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "compact", "task", "dependencies", "dependents", "references", "referencedBy"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        compact: { const: true },
        task: compactTaskSchema,
        dependencies: { type: "array", items: compactTaskSchema },
        dependents: { type: "array", items: compactTaskSchema },
        references: {
          type: "array",
          items: {
            type: "object",
            required: ["ref", "task"],
            additionalProperties: false,
            properties: {
              ref: taskRefSchema,
              task: { anyOf: [compactTaskSchema, { type: "null" }] },
            },
          },
        },
        referencedBy: {
          type: "array",
          items: {
            type: "object",
            required: ["task", "ref"],
            additionalProperties: false,
            properties: {
              task: compactTaskSchema,
              ref: taskRefSchema,
            },
          },
        },
      },
    },
  },
  {
    name: "plan.review",
    command: "jumpspace plan review <id> --json",
    description: "Human approval and execution-readiness packet for a documented task.",
    schema: {
      $schema: schemaVersion,
      ...executionStateSchema,
    },
  },
  {
    name: "plan.save",
    command: "jumpspace plan save <id> --file <plan-file> --json",
    description: "Successful durable plan persistence result.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "task_id", "plan"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        task_id: { type: "string" },
        plan: planSchema,
      },
    },
  },
  {
    name: "plan.show",
    command: "jumpspace plan show <id> --json",
    description: "Persisted durable plan for a task.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["task_id", "plan"],
      additionalProperties: false,
      properties: {
        task_id: { type: "string" },
        plan: planSchema,
      },
    },
  },
  {
    name: "plan.validate",
    command: "jumpspace plan validate <id> --json",
    description: "Durable plan validation result with issues and structured errors.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["task_id", "ok", "issues", "errors"],
      additionalProperties: false,
      properties: {
        task_id: { type: "string" },
        ok: { type: "boolean" },
        issues: { type: "array", items: issueSchema },
        errors: { type: "array", items: commandErrorSchema },
      },
    },
  },
  {
    name: "ready",
    command: "jumpspace ready --json",
    description: "Approved or partial tasks ready for agent execution.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["tasks"],
      additionalProperties: false,
      properties: {
        tasks: { type: "array", items: executionStateSchema },
      },
    },
  },
  {
    name: "execute",
    command: "jumpspace execute <id> --json",
    description: "Execution gate packet for an approved or partial task.",
    schema: {
      $schema: schemaVersion,
      allOf: [
        executionStateSchema,
        {
          type: "object",
          required: ["ok", "forced"],
          properties: {
            ok: { type: "boolean" },
            forced: { type: "boolean" },
            errors: { type: "array", items: commandErrorSchema },
          },
        },
      ],
    },
  },
  {
    name: "next",
    command: "jumpspace next <id> --json",
    description: "Pending unblocked durable plan steps for a task.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["task_id", "steps"],
      additionalProperties: false,
      properties: {
        task_id: { type: "string" },
        steps: { type: "array", items: planStepSchema },
      },
    },
  },
  {
    name: "step.complete",
    command: "jumpspace step complete <task-id> <step-id> --evidence <evidence> --json",
    description: "Successful durable plan step completion result.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "task_id", "step", "plan"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        task_id: { type: "string" },
        step: planStepSchema,
        plan: planSchema,
      },
    },
  },
  {
    name: "status",
    command: "jumpspace status <id> <status> --json",
    description: "Successful task status update result. Verified status is excluded and must be earned with verify.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "task_id", "status"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        task_id: { type: "string" },
        status: { enum: ["draft", "proposed", "approved", "partial", "implemented", "stale"] },
      },
    },
  },
  {
    name: "verify",
    command: "jumpspace verify <id> --check <cmd> --criteria <criterion-id> --json",
    description: "Successful earned verification result with commit, checks, criteria coverage, and evidence.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "task_id", "status", "record"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        task_id: { type: "string" },
        status: { const: "verified" },
        record: verificationRecordSchema,
      },
    },
  },
  {
    name: "work",
    command: "jumpspace work <id> [--since <ref>] --json",
    description: "Complete agent start packet for a ready task, including plan state, next steps, verification, schemas, guardrails, and optional drift.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: [
        "ok",
        "packet_version",
        "task",
        "intent",
        "links",
        "acceptance_criteria",
        "plan",
        "next_steps",
        "execution",
        "dependencies",
        "refs",
        "verification",
        "mutation_history",
        "required_checks",
        "drift",
        "schemas",
        "guardrails",
        "next_action",
      ],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        packet_version: { const: 1 },
        task: taskSummarySchema,
        intent: {
          type: "object",
          required: ["title", "spec", "status", "type", "keywords", "doc"],
          additionalProperties: true,
          properties: {
            title: { type: "string" },
            spec: { type: "string" },
            status: { type: "string" },
            type: { type: "string" },
            module: { type: "string" },
            space: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            doc: { type: "object" },
          },
        },
        links: {
          type: "object",
          required: ["code", "tests", "doc"],
          additionalProperties: false,
          properties: {
            code: { type: "array", items: { type: "string" } },
            tests: { type: "array", items: { type: "string" } },
            doc: { type: "object" },
          },
        },
        acceptance_criteria: { type: "array", items: { type: "object" } },
        plan: { type: "object" },
        next_steps: { type: "array", items: { type: "object" } },
        execution: { type: "object" },
        dependencies: { type: "array", items: taskSummarySchema },
        refs: { type: "array", items: { type: "object" } },
        verification: {
          type: "object",
          required: ["status", "records"],
          additionalProperties: false,
          properties: {
            status: { type: "string" },
            records: { type: "array", items: { type: "object" } },
          },
        },
        mutation_history: {
          type: "object",
          required: ["history_path", "total", "returned", "filters", "entries"],
          additionalProperties: false,
          properties: {
            history_path: { type: "string" },
            total: { type: "number" },
            returned: { type: "number" },
            filters: {
              type: "object",
              additionalProperties: false,
              properties: {
                task_id: { type: "string" },
                limit: { type: "number" },
              },
            },
            entries: { type: "array", items: mutationSummarySchema },
          },
        },
        required_checks: { type: "array", items: { type: "string" } },
        drift: {
          type: "object",
          required: ["requested", "since", "facts", "warnings"],
          additionalProperties: false,
          properties: {
            requested: { type: "boolean" },
            since: { anyOf: [{ type: "string" }, { type: "null" }] },
            facts: { type: "array", items: { type: "object" } },
            warnings: { type: "array", items: { type: "object" } },
          },
        },
        schemas: {
          type: "object",
          required: ["packet", "failures", "context", "audit", "drift", "history"],
          additionalProperties: false,
          properties: {
            packet: { const: "work" },
            failures: { const: "error" },
            context: { const: "context" },
            audit: { const: "audit" },
            drift: { const: "drift" },
            history: { const: "history" },
          },
        },
        guardrails: { type: "array", items: { type: "string" } },
        next_action: { type: "string" },
      },
    },
  },
  {
    name: "ask",
    command: "jumpspace ask <question...> --json",
    description: "Evidence summary for a repo-local question. This is retrieval evidence, not an authoritative answer.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "question", "retrieval_mode", "evidence", "coverage", "unanswered_terms"],
      additionalProperties: true,
      properties: {
        ok: { const: true },
        question: { type: "string" },
        retrieval_mode: { type: "string" },
        evidence: { type: "array", items: { type: "object" } },
        coverage: { type: "object" },
        unanswered_terms: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "ask.compact",
    command: "jumpspace ask <question...> --json --compact",
    description: "Compact evidence summary for agent orientation. This is retrieval evidence, not an authoritative answer.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "compact", "question", "retrieval_mode", "evidence", "coverage", "unanswered_terms", "retrieval", "weak_evidence"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        compact: { const: true },
        question: { type: "string" },
        retrieval_mode: { type: "string" },
        terms: { type: "array", items: { type: "string" } },
        coverage: { type: "object" },
        unanswered_terms: { type: "array", items: { type: "string" } },
        retrieval: { type: "object" },
        weak_evidence: { type: "boolean" },
        evidence: {
          type: "array",
          items: {
            type: "object",
            required: [
              "task_id",
              "title",
              "status",
              "path",
              "heading",
              "match_reasons",
              "matched_terms",
              "semantic_terms",
              "retrieval_sources",
              "scores",
              "linked_code_count",
              "linked_test_count",
              "connected_task_ids",
              "graph_path_count",
            ],
            additionalProperties: false,
            properties: {
              task_id: { type: "string" },
              title: { type: "string" },
              status: { type: "string" },
              path: { type: "string" },
              heading: { type: "string" },
              match_reasons: { type: "array", items: { type: "string" } },
              matched_terms: { type: "array", items: { type: "string" } },
              semantic_terms: { type: "array", items: { type: "string" } },
              retrieval_sources: { type: "array", items: { enum: ["lexical", "semantic"] } },
              scores: { type: "object" },
              linked_code_count: { type: "number" },
              linked_test_count: { type: "number" },
              connected_task_ids: { type: "array", items: { type: "string" } },
              graph_path_count: { type: "number" },
            },
          },
        },
      },
    },
  },
  {
    name: "semantic.build",
    command: "jumpspace semantic build --json",
    description: "Builds and enables the optional local semantic task index.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "index_path", "task_count", "document_count", "source_index", "backend", "config_updated"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        index_path: { type: "string" },
        task_count: { type: "number" },
        document_count: { type: "number" },
        source_index: semanticSourceIndexSchema,
        backend: semanticBackendSchema,
        config_updated: { type: "boolean" },
      },
    },
  },
  {
    name: "semantic.status",
    command: "jumpspace semantic status --json",
    description: "Reports semantic index readiness, staleness, backend, and non-blocking issues.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "enabled", "path", "exists", "ready", "stale", "issues", "source_index", "backend", "document_count"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        enabled: { type: "boolean" },
        path: { type: "string" },
        exists: { type: "boolean" },
        ready: { type: "boolean" },
        stale: { type: "boolean" },
        issues: { type: "array", items: issueSchema },
        source_index: { anyOf: [semanticSourceIndexSchema, { type: "null" }] },
        backend: { anyOf: [semanticBackendSchema, { type: "null" }] },
        document_count: { type: "number" },
      },
    },
  },
  {
    name: "semantic.search",
    command: "jumpspace semantic search <query...> --json",
    description: "Searches the generated local semantic task index.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "query", "index_path", "backend", "results"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        query: { type: "string" },
        index_path: { type: "string" },
        backend: semanticBackendSchema,
        results: { type: "array", items: semanticSearchResultSchema },
      },
    },
  },
  {
    name: "semantic.eval",
    command: "jumpspace semantic eval --json",
    description: "Compares lexical, deterministic task-vector, and active semantic retrieval on built-in evaluation fixtures.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "query_count", "summary", "active_backend", "results"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        query_count: { type: "number" },
        summary: {
          type: "object",
          required: ["lexical_hits", "local_hits", "active_hits"],
          additionalProperties: false,
          properties: {
            lexical_hits: { type: "number" },
            local_hits: { type: "number" },
            active_hits: { type: "number" },
          },
        },
        active_backend: { anyOf: [semanticBackendSchema, { type: "null" }] },
        results: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "query", "expected_task_ids", "lexical", "local", "active"],
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              query: { type: "string" },
              expected_task_ids: { type: "array", items: { type: "string" } },
              lexical: { type: "object" },
              local: { type: "object" },
              active: { type: "object" },
            },
          },
        },
      },
    },
  },
  {
    name: "query",
    command: "jumpspace query [filters] --json",
    description: "Deterministic graph query results with applied filters, matched graph paths, and unanswered constraints.",
    schema: {
      $schema: schemaVersion,
      ...graphQueryReportSchema,
    },
  },
  {
    name: "drift",
    command: "jumpspace drift --since <ref> --json",
    description: "Factual task-memory drift separated from heuristic maintenance warnings.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "since", "changed", "facts", "warnings"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        since: { type: "string" },
        changed: { type: "array", items: { type: "object" } },
        facts: { type: "array", items: { type: "object" } },
        warnings: { type: "array", items: { type: "object" } },
      },
    },
  },
  {
    name: "ci",
    command: "jumpspace ci --since <ref> [--query <field=value>] --json",
    description: "Local CI/PR report with scan, audit, doctor, drift, repair suggestions, graph query packets, task-block suggestions, and a Markdown PR comment.",
    schema: {
      $schema: schemaVersion,
      ...ciReportSchema,
    },
  },
  {
    name: "pr.comment",
    command: "jumpspace pr comment --since <ref> --json",
    description: "Idempotent, review-only PR assistant comment packet built from the local CI report.",
    schema: {
      $schema: schemaVersion,
      ...prAssistantReportSchema,
    },
  },
  {
    name: "repair",
    command: "jumpspace repair --since <ref> [--apply] --json",
    description: "Dry-run or applied task-memory repairs for Git path drift. Renames are mechanical fixes; missing/deleted linked files become explicit gaps.",
    schema: {
      $schema: schemaVersion,
      ...repairReportSchema,
    },
  },
  {
    name: "link",
    command: "jumpspace link update <id> [link options] --json",
    description: "Dry-run or applied task metadata link updates for code, tests, dependencies, refs, and gaps.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "task_id", "dry_run", "applied", "changed", "operations", "touched_files"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        task_id: { type: "string" },
        dry_run: { type: "boolean" },
        applied: { type: "boolean" },
        changed: { type: "boolean" },
        operations: { type: "array", items: linkOperationSchema },
        touched_files: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "link.suggest",
    command: "jumpspace link suggest <id> [--since <ref>] [--path <path>] --json",
    description: "Evidence-backed code/test link suggestions from working-tree changes, changed files, or explicit candidate paths. This command never mutates source.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "task_id", "since", "suggestions", "rejected_candidates", "candidates_considered", "mutated"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        task_id: { type: "string" },
        since: { anyOf: [{ type: "string" }, { type: "null" }] },
        suggestions: { type: "array", items: linkSuggestionSchema },
        rejected_candidates: { type: "array", items: linkRejectedCandidateSchema },
        candidates_considered: { type: "number" },
        mutated: { const: false },
      },
    },
  },
  {
    name: "link.eval",
    command: "jumpspace link eval [--file <fixture-file>] --json",
    description: "Built-in or file-based ranking quality evaluation for link suggestion fixtures.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "suite", "fixture_path", "case_count", "summary", "cases"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        suite: { type: "string" },
        fixture_path: { anyOf: [{ type: "string" }, { type: "null" }] },
        case_count: { type: "number" },
        summary: {
          type: "object",
          required: ["passed", "failed", "top1_accuracy", "mean_reciprocal_rank"],
          additionalProperties: false,
          properties: {
            passed: { type: "number" },
            failed: { type: "number" },
            top1_accuracy: { type: "number" },
            mean_reciprocal_rank: { type: "number" },
          },
        },
        cases: {
          type: "array",
          items: {
            type: "object",
            required: [
              "id",
              "description",
              "expected",
              "passed",
              "rank",
              "reciprocal_rank",
              "top",
              "suggestions",
              "rejected_candidates",
              "failure_reason",
            ],
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              description: { type: "string" },
              expected: linkEvalExpectedSchema,
              passed: { type: "boolean" },
              rank: { anyOf: [{ type: "number" }, { type: "null" }] },
              reciprocal_rank: { type: "number" },
              top: { anyOf: [linkEvalSuggestionBriefSchema, { type: "null" }] },
              suggestions: { type: "array", items: linkEvalSuggestionBriefSchema },
              rejected_candidates: { type: "array", items: linkEvalRejectedCandidateBriefSchema },
              failure_reason: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
          },
        },
      },
    },
  },
  {
    name: "bootstrap.context",
    command: "jumpspace bootstrap context [paths...] --json",
    description: "Markdown heading context packet for AI-assisted graph bootstrap proposals.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "context_version", "paths", "existing_task_ids", "headings", "proposal_schema", "instructions", "evidence_gaps"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        context_version: { const: 1 },
        paths: { type: "array", items: { type: "string" } },
        existing_task_ids: { type: "array", items: { type: "string" } },
        headings: { type: "array", items: { type: "object" } },
        proposal_schema: { type: "object" },
        instructions: { type: "array", items: { type: "string" } },
        evidence_gaps: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "bootstrap.discover",
    command: "jumpspace bootstrap discover --json",
    description: "Discovers common Markdown docs, recommended config globs, profile hints, and ignored noisy paths.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "recommended_docs", "profile_hints", "candidates", "ignored_patterns"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        recommended_docs: { type: "array", items: { type: "string" } },
        profile_hints: { type: "array", items: { type: "string" } },
        candidates: {
          type: "array",
          items: {
            type: "object",
            required: ["pattern", "reason", "files", "sample_paths", "recommended"],
            additionalProperties: false,
            properties: {
              pattern: { type: "string" },
              reason: { type: "string" },
              files: { type: "number" },
              sample_paths: { type: "array", items: { type: "string" } },
              recommended: { type: "boolean" },
            },
          },
        },
        ignored_patterns: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "bootstrap.propose",
    command: "jumpspace bootstrap propose [paths...] [--file <proposal-file>] --json",
    description: "Deterministic bootstrap proposal draft packet. This is extraction evidence, not agent reasoning, and apply still requires human approval.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: [
        "ok",
        "propose_version",
        "mode",
        "agent_generated",
        "human_approval_required",
        "inputs",
        "summary",
        "proposal",
        "validation",
        "next_commands",
        "notes",
      ],
      additionalProperties: true,
      properties: {
        ok: { const: true },
        propose_version: { const: 1 },
        mode: { const: "deterministic_extraction" },
        agent_generated: { const: false },
        human_approval_required: { const: true },
        proposal_file: { type: "string" },
        inputs: {
          type: "object",
          required: ["pattern_source", "patterns", "discovered_docs"],
          additionalProperties: false,
          properties: {
            pattern_source: { enum: ["arguments", "discovery", "config"] },
            patterns: { type: "array", items: { type: "string" } },
            discovered_docs: { type: "array", items: { type: "string" } },
          },
        },
        summary: {
          type: "object",
          required: [
            "documents",
            "headings",
            "proposed_tasks",
            "skipped_headings",
            "existing_tasks",
            "validation_errors",
            "validation_warnings",
          ],
          additionalProperties: false,
          properties: {
            documents: { type: "number" },
            headings: { type: "number" },
            proposed_tasks: { type: "number" },
            skipped_headings: { type: "number" },
            existing_tasks: { type: "number" },
            validation_errors: { type: "number" },
            validation_warnings: { type: "number" },
          },
        },
        proposal: { type: "object" },
        validation: { type: "object" },
        next_commands: {
          type: "object",
          required: ["validate", "dry_run", "apply_after_approval"],
          additionalProperties: false,
          properties: {
            validate: { type: "string" },
            dry_run: { type: "string" },
            apply_after_approval: { type: "string" },
          },
        },
        notes: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "bootstrap.validate",
    command: "jumpspace bootstrap validate --file <proposal-file> --json",
    description: "Bootstrap proposal validation result.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "proposal", "issues", "errors", "warnings"],
      additionalProperties: false,
      properties: {
        ok: { type: "boolean" },
        proposal: { type: "object" },
        issues: { type: "array", items: issueSchema },
        errors: { type: "array", items: issueSchema },
        warnings: { type: "array", items: issueSchema },
      },
    },
  },
  {
    name: "bootstrap.apply",
    command: "jumpspace bootstrap apply --file <proposal-file> [--dry-run] --json",
    description: "Bootstrap apply or dry-run result.",
    schema: {
      $schema: schemaVersion,
      type: "object",
      required: ["ok", "dry_run", "applied", "config_paths_added"],
      additionalProperties: false,
      properties: {
        ok: { const: true },
        dry_run: { type: "boolean" },
        applied: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "path", "heading", "line", "action"],
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              path: { type: "string" },
              heading: { type: "string" },
              line: { type: "number" },
              action: { enum: ["inserted", "would_insert"] },
            },
          },
        },
        config_paths_added: { type: "array", items: { type: "string" } },
      },
    },
  },
];

export function listSchemas(): SchemaListEntry[] {
  return schemaCatalog.map(({ name, command, description }) => ({ name, command, description }));
}

export function getSchema(name: string): JsonSchemaDefinition | undefined {
  return schemaCatalog.find((schema) => schema.name === name);
}
