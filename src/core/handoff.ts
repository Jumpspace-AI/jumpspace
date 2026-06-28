import { COMPLETE_STATUSES, getExecutionState, type ExecutionBlocker } from "./execution.js";
import { getNextPlanSteps } from "./plans.js";
import type { DoctorReport, DoctorSuggestion } from "./doctor.js";
import type { LastMutationSummary, MutationHistoryReport, MutationWarning } from "./mutations.js";
import type { JumpIndex, JumpIssue, JumpTask } from "./types.js";

export const HANDOFF_HISTORY_LIMIT = 8;

export type HandoffHealthSummary = {
  ok: boolean;
  error_count: number;
  warning_count: number;
};

export type HandoffTaskState = {
  id: string;
  title: string;
  status: JumpTask["status"];
  type: JumpTask["type"];
  module?: string;
  space?: JumpTask["space"];
  doc: JumpTask["doc"];
  plan_status: string | null;
  execution_ready: boolean;
  blockers: ExecutionBlocker[];
  pending_step_ids: string[];
  required_checks: string[];
};

export type HandoffPacket = {
  ok: boolean;
  packet_version: 1;
  generated_at: string;
  status: "ready" | "attention" | "blocked";
  filters: {
    task_id?: string;
    limit: number;
  };
  summary: {
    audit_errors: number;
    audit_warnings: number;
    doctor_errors: number;
    doctor_warnings: number;
    doctor_suggestions: number;
    mutations_returned: number;
    touched_files: number;
    task_ids: number;
    config_changes: number;
    mutation_warnings: number;
  };
  recent_mutations: MutationHistoryReport;
  last_mutation: LastMutationSummary | null;
  touched_files: string[];
  task_ids: string[];
  config_changes: string[];
  mutation_warnings: MutationWarning[];
  health: {
    audit: HandoffHealthSummary & {
      errors: JumpIssue[];
      warnings: JumpIssue[];
    };
    doctor: HandoffHealthSummary & {
      suggestions: DoctorSuggestion[];
    };
  };
  task: HandoffTaskState | null;
  suggested_commands: string[];
  schemas: {
    packet: "handoff";
    failures: "error";
    history: "history";
    doctor: "doctor";
    audit: "audit";
    context: "context";
    next: "next";
    schema_coverage: "schema.coverage";
  };
};

export type BuildHandoffPacketOptions = {
  index: JumpIndex;
  auditIssues: JumpIssue[];
  doctor: DoctorReport;
  mutationHistory: MutationHistoryReport;
  lastMutation?: LastMutationSummary;
  taskId?: string;
  limit?: number;
  generatedAt?: string;
};

export function buildHandoffPacket(options: BuildHandoffPacketOptions): HandoffPacket {
  const auditErrors = options.auditIssues.filter((issue) => issue.severity === "error");
  const auditWarnings = options.auditIssues.filter((issue) => issue.severity === "warning");
  const task = options.taskId ? options.index.tasks.find((candidate) => candidate.id === options.taskId) ?? null : null;
  const taskState = task ? buildTaskState(options.index, task) : null;
  const touchedFiles = unique(options.mutationHistory.entries.flatMap((entry) => entry.touched_files));
  const taskIds = unique(options.mutationHistory.entries.flatMap((entry) => entry.task_ids));
  const configChanges = unique(options.mutationHistory.entries.flatMap((entry) => entry.config_changes));
  const mutationWarnings = options.mutationHistory.entries.flatMap((entry) => entry.warnings);
  const doctorErrors = options.doctor.errors.length;
  const doctorWarnings = options.doctor.warnings.length;
  const blocked = auditErrors.length > 0 || doctorErrors > 0;
  const attention =
    !blocked &&
    (auditWarnings.length > 0 ||
      doctorWarnings > 0 ||
      options.doctor.suggestions.length > 0 ||
      mutationWarnings.length > 0 ||
      Boolean(taskState && !taskState.execution_ready));

  const packetBase = {
    auditErrors,
    auditWarnings,
    doctorErrors,
    doctorWarnings,
    mutationWarnings,
    touchedFiles,
    taskIds,
    configChanges,
    taskState,
  };

  return {
    ok: !blocked,
    packet_version: 1,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    status: blocked ? "blocked" : attention ? "attention" : "ready",
    filters: {
      ...(options.taskId ? { task_id: options.taskId } : {}),
      limit: options.limit ?? options.mutationHistory.filters.limit ?? HANDOFF_HISTORY_LIMIT,
    },
    summary: {
      audit_errors: auditErrors.length,
      audit_warnings: auditWarnings.length,
      doctor_errors: doctorErrors,
      doctor_warnings: doctorWarnings,
      doctor_suggestions: options.doctor.suggestions.length,
      mutations_returned: options.mutationHistory.returned,
      touched_files: touchedFiles.length,
      task_ids: taskIds.length,
      config_changes: configChanges.length,
      mutation_warnings: mutationWarnings.length,
    },
    recent_mutations: options.mutationHistory,
    last_mutation: options.lastMutation ?? null,
    touched_files: touchedFiles,
    task_ids: taskIds,
    config_changes: configChanges,
    mutation_warnings: mutationWarnings,
    health: {
      audit: {
        ok: auditErrors.length === 0,
        error_count: auditErrors.length,
        warning_count: auditWarnings.length,
        errors: auditErrors,
        warnings: auditWarnings,
      },
      doctor: {
        ok: options.doctor.ok,
        error_count: doctorErrors,
        warning_count: doctorWarnings,
        suggestions: options.doctor.suggestions,
      },
    },
    task: taskState,
    suggested_commands: suggestedCommands(packetBase),
    schemas: {
      packet: "handoff",
      failures: "error",
      history: "history",
      doctor: "doctor",
      audit: "audit",
      context: "context",
      next: "next",
      schema_coverage: "schema.coverage",
    },
  };
}

export function renderHandoffPacket(packet: HandoffPacket): string {
  const lines = [
    "# Jumpspace Handoff",
    "",
    `Status: ${packet.status}`,
    `Generated at: ${packet.generated_at}`,
    `Recent mutations: ${packet.summary.mutations_returned}`,
    `Last mutation: ${packet.last_mutation ? `${packet.last_mutation.command} at ${packet.last_mutation.recorded_at}` : "None"}`,
    "",
    "## Health",
    "",
    `Audit: ${packet.health.audit.ok ? "ok" : "blocked"} (${packet.summary.audit_errors} errors, ${packet.summary.audit_warnings} warnings)`,
    `Doctor: ${packet.health.doctor.ok ? "ok" : "blocked"} (${packet.summary.doctor_errors} errors, ${packet.summary.doctor_warnings} warnings, ${packet.summary.doctor_suggestions} suggestions)`,
    "",
    "## Recent Work",
    "",
    "Touched files:",
    renderList(packet.touched_files),
    "",
    "Task IDs:",
    renderList(packet.task_ids),
    "",
    "Config changes:",
    renderList(packet.config_changes),
    "",
    "Mutation warnings:",
    renderList(packet.mutation_warnings.map((warning) => `${warning.code}: ${warning.message}`)),
  ];

  if (packet.task) {
    lines.push(
      "",
      "## Task",
      "",
      `Task: ${packet.task.id} ${packet.task.title}`,
      `Status: ${packet.task.status}`,
      `Plan: ${packet.task.plan_status ?? "none"}`,
      `Execution ready: ${packet.task.execution_ready ? "yes" : "no"}`,
      "",
      "Pending steps:",
      renderList(packet.task.pending_step_ids),
      "",
      "Required checks:",
      renderList(packet.task.required_checks),
      "",
      "Blockers:",
      renderList(packet.task.blockers.map((blocker) => blocker.message)),
    );
  }

  lines.push("", "## Suggested Commands", "", "```bash", ...packet.suggested_commands, "```", "");

  return lines.join("\n");
}

function buildTaskState(index: JumpIndex, task: JumpTask): HandoffTaskState {
  const execution = getExecutionState(index, task.id);
  const pendingSteps = getNextPlanSteps(task);
  const hasPendingWork = pendingSteps.length > 0;
  const executionReady = hasPendingWork
    ? execution?.ready ?? false
    : COMPLETE_STATUSES.includes(task.status)
      ? true
      : execution?.ready ?? false;
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    type: task.type,
    module: task.module,
    space: task.space,
    doc: task.doc,
    plan_status: task.plan?.status ?? null,
    execution_ready: executionReady,
    blockers: hasPendingWork || !executionReady ? execution?.blockers ?? [] : [],
    pending_step_ids: pendingSteps.map((step) => step.id),
    required_checks: unique(pendingSteps.flatMap((step) => step.checks)),
  };
}

function suggestedCommands(input: {
  auditErrors: JumpIssue[];
  auditWarnings: JumpIssue[];
  doctorErrors: number;
  doctorWarnings: number;
  mutationWarnings: MutationWarning[];
  touchedFiles: string[];
  taskIds: string[];
  configChanges: string[];
  taskState: HandoffTaskState | null;
}): string[] {
  const commands = new Set<string>();

  if ([...input.auditErrors, ...input.auditWarnings].some((issue) => issue.code === "STALE_INDEX")) {
    commands.add("jumpspace scan");
  } else {
    commands.add("jumpspace scan");
  }

  if ([...input.auditErrors, ...input.auditWarnings].some((issue) => issue.code === "STALE_SEMANTIC_INDEX")) {
    commands.add("jumpspace semantic build --json");
  }

  commands.add("jumpspace audit --json");
  commands.add("jumpspace doctor --json");
  commands.add("jumpspace schema coverage --json");

  if (input.taskState) {
    commands.add(`jumpspace context ${input.taskState.id} --json`);
    if (input.taskState.plan_status) {
      commands.add(`jumpspace plan validate ${input.taskState.id} --json`);
      commands.add(`jumpspace next ${input.taskState.id} --json`);
    }
  }

  if (shouldSuggestReleaseDoctor(input.touchedFiles)) {
    commands.add("jumpspace release doctor --json");
  }

  return [...commands];
}

function shouldSuggestReleaseDoctor(paths: string[]): boolean {
  return paths.some(
    (repoPath) =>
      repoPath === "package.json" ||
      repoPath === "README.md" ||
      repoPath === "LICENSE" ||
      repoPath === "dist/cli.js" ||
      repoPath.startsWith("schemas/") ||
      repoPath.startsWith("src/templates/") ||
      repoPath.startsWith("src/sdk/") ||
      repoPath.startsWith("sdk/python/") ||
      repoPath === "src/core/schemas.ts",
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}
