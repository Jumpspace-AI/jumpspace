import { commandError, issuesToCommandErrors, type JsonCommandError } from "./errors.js";
import { getExecutionState, type ExecutionState } from "./execution.js";
import { getNextPlanSteps, validateTaskPlan } from "./plans.js";
import type { DriftFact, DriftWarning } from "./drift.js";
import { MUTATION_HISTORY_PATH, type MutationHistoryReport } from "./mutations.js";
import type { JumpIndex, JumpPlan, JumpPlanStep, JumpTask, JumpTaskRef } from "./types.js";

export const WORK_PACKET_HISTORY_LIMIT = 5;

export type WorkPacketDrift =
  | {
      requested: false;
      since: null;
      facts: DriftFact[];
      warnings: DriftWarning[];
    }
  | {
      requested: true;
      since: string;
      facts: DriftFact[];
      warnings: DriftWarning[];
    };

export type WorkPacket = {
  ok: true;
  packet_version: 1;
  task: JumpTask;
  intent: {
    title: string;
    spec: string;
    status: JumpTask["status"];
    type: JumpTask["type"];
    module?: string;
    space?: JumpTask["space"];
    keywords: string[];
    doc: JumpTask["doc"];
  };
  links: {
    code: string[];
    tests: string[];
    doc: JumpTask["doc"];
  };
  acceptance_criteria: NonNullable<JumpTask["acceptance_criteria"]>;
  plan: JumpPlan;
  next_steps: JumpPlanStep[];
  execution: ExecutionState;
  dependencies: JumpTask[];
  refs: JumpTaskRef[];
  verification: {
    status: JumpTask["status"];
    records: NonNullable<JumpTask["verification_records"]>;
  };
  mutation_history: MutationHistoryReport;
  required_checks: string[];
  drift: WorkPacketDrift;
  schemas: {
    packet: "task.work";
    failures: "error";
    context: "task.context";
    audit: "task.audit";
    drift: "task.drift";
    history: "task.history";
  };
  guardrails: string[];
  next_action: string;
};

export type WorkPacketResult =
  | WorkPacket
  | {
      ok: false;
      errors: JsonCommandError[];
    };

export function buildWorkPacket(
  index: JumpIndex,
  id: string,
  options: { drift?: WorkPacketDrift; mutationHistory?: MutationHistoryReport } = {},
): WorkPacketResult {
  const task = index.tasks.find((candidate) => candidate.id === id);
  if (!task) {
    return {
      ok: false,
      errors: [
        commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}". Run \`jumpspace task find <query>\` to locate it.`, {
          taskId: id,
        }),
      ],
    };
  }

  if (!task.plan) {
    return {
      ok: false,
      errors: [
        commandError("MISSING_PLAN", `Task ${id} does not have a durable plan. Run \`jumpspace task plan save ${id} --file <plan-file>\`.`, {
          taskId: id,
        }),
      ],
    };
  }

  const planValidation = validateTaskPlan(task, { requirePlan: true });
  if (!planValidation.ok) {
    return {
      ok: false,
      errors: issuesToCommandErrors(planValidation.issues.filter((issue) => issue.severity === "error")),
    };
  }

  const execution = getExecutionState(index, id);
  if (!execution) {
    return {
      ok: false,
      errors: [commandError("UNKNOWN_TASK", `Unknown Jumpspace task ID "${id}".`, { taskId: id })],
    };
  }

  if (!execution.ready) {
    return {
      ok: false,
      errors: execution.blockers.map((blocker) =>
        commandError("WORK_BLOCKED", blocker.message, {
          taskId: blocker.taskId,
        }),
      ),
    };
  }

  const nextSteps = getNextPlanSteps(task);
  const requiredChecks = uniqueStrings(nextSteps.flatMap((step) => step.checks));

  return {
    ok: true,
    packet_version: 1,
    task,
    intent: {
      title: task.title,
      spec: task.spec,
      status: task.status,
      type: task.type,
      module: task.module,
      space: task.space,
      keywords: task.keywords ?? [],
      doc: task.doc,
    },
    links: {
      code: task.code,
      tests: task.tests,
      doc: task.doc,
    },
    acceptance_criteria: task.acceptance_criteria ?? [],
    plan: task.plan,
    next_steps: nextSteps,
    execution,
    dependencies: execution.dependencies,
    refs: task.refs ?? [],
    verification: {
      status: task.status,
      records: task.verification_records ?? [],
    },
    mutation_history: options.mutationHistory ?? emptyMutationHistory(id),
    required_checks: requiredChecks,
    drift: options.drift ?? {
      requested: false,
      since: null,
      facts: [],
      warnings: [],
    },
    schemas: {
      packet: "task.work",
      failures: "error",
      context: "task.context",
      audit: "task.audit",
      drift: "task.drift",
      history: "task.history",
    },
    guardrails: [
      "Treat this packet as the agent start point before editing.",
      "Inspect linked code, tests, dependencies, refs, and next plan steps before changing files.",
      "Keep implementation scoped to the current task and its dependency context.",
      "Do not claim the task is verified through status alone; use jumpspace task verify for verification records.",
      "Update Jumpspace links or spec text when behavior, source files, or tests change.",
      "Run required checks, then run jumpspace task scan and jumpspace task audit --json before finishing.",
      "Record plan-step evidence with jumpspace task step complete after each completed step.",
    ],
    next_action: renderNextAction(task, nextSteps),
  };
}

export function renderWorkPacket(packet: WorkPacket): string {
  return [
    "# Jumpspace Work Packet",
    "",
    `Task: ${packet.task.id} ${packet.task.title}`,
    `Status: ${packet.task.status}`,
    `Ready: ${packet.execution.ready ? "yes" : "no"}`,
    "",
    "## Next Action",
    "",
    packet.next_action,
    "",
    "## Next Steps",
    "",
    renderStepList(packet.next_steps),
    "",
    "## Starting Points",
    "",
    "Code:",
    renderList(packet.links.code),
    "",
    "Tests:",
    renderList(packet.links.tests),
    "",
    "Doc:",
    `- ${packet.links.doc.path}#${packet.links.doc.heading}`,
    "",
    "## Acceptance Criteria",
    "",
    renderList(packet.acceptance_criteria.map((criterion) => `${criterion.id}: ${criterion.description}`)),
    "",
    "## Required Checks",
    "",
    renderList(packet.required_checks.length ? packet.required_checks : ["No step-specific checks; run relevant tests plus jumpspace task scan and audit."]),
    "",
    "## Drift",
    "",
    renderDrift(packet.drift),
    "",
    "## Recent History",
    "",
    renderMutationHistory(packet.mutation_history),
    "",
    "## Guardrails",
    "",
    renderList(packet.guardrails),
    "",
  ].join("\n");
}

function emptyMutationHistory(taskId: string): MutationHistoryReport {
  return {
    history_path: MUTATION_HISTORY_PATH,
    total: 0,
    returned: 0,
    filters: {
      task_id: taskId,
      limit: WORK_PACKET_HISTORY_LIMIT,
    },
    entries: [],
  };
}

function renderNextAction(task: JumpTask, steps: JumpPlanStep[]): string {
  if (steps.length > 0) {
    const stepIds = steps.map((step) => step.id).join(", ");
    return `Work on pending unblocked step${steps.length === 1 ? "" : "s"}: ${stepIds}.`;
  }

  if (task.plan?.status === "complete") {
    return "All plan steps are complete; run final verification and record evidence.";
  }

  return "No pending unblocked plan steps. Review blocked or in-progress plan steps before editing.";
}

function renderStepList(steps: JumpPlanStep[]): string {
  if (steps.length === 0) {
    return "- None";
  }

  return steps
    .map((step) => {
      const checks = step.checks.length ? ` Checks: ${step.checks.join("; ")}` : "";
      return `- ${step.id}: ${step.outcome}${checks}`;
    })
    .join("\n");
}

function renderDrift(drift: WorkPacketDrift): string {
  if (!drift.requested) {
    return "- Not requested. Use `--since <ref>` to include drift facts and warnings.";
  }

  return [
    `- Since: ${drift.since}`,
    `- Facts: ${drift.facts.length}`,
    `- Warnings: ${drift.warnings.length}`,
    ...drift.facts.slice(0, 5).map((fact) => `- ${fact.code}${fact.taskId ? ` ${fact.taskId}` : ""}: ${fact.message}`),
  ].join("\n");
}

function renderMutationHistory(history: MutationHistoryReport): string {
  if (history.entries.length === 0) {
    return "- No task-specific mutation history recorded.";
  }

  return [
    `- Showing ${history.returned} of ${history.total} task-specific mutation entries.`,
    ...history.entries.map((entry) => {
      const touched = entry.touched_files.length ? ` (${entry.touched_files.join(", ")})` : "";
      return `- ${entry.recorded_at} ${entry.command}${touched}`;
    }),
  ].join("\n");
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
