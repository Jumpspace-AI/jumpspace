import chalk from "chalk";
import { filterTasks, type TaskFilterOptions } from "./filterTasks.js";
import type { JumpIndex, JumpTask, JumpTaskStatus } from "./types.js";

export const EXECUTION_ELIGIBLE_STATUSES: JumpTaskStatus[] = ["approved", "partial"];
export const COMPLETE_STATUSES: JumpTaskStatus[] = ["implemented", "verified"];

export type ExecutionBlocker = {
  type: "status" | "dependency";
  message: string;
  taskId?: string;
  status?: JumpTaskStatus;
};

export type ExecutionState = {
  task: JumpTask;
  ready: boolean;
  blockers: ExecutionBlocker[];
  dependencies: JumpTask[];
  missingDependencies: string[];
};

export type ReadyOptions = TaskFilterOptions & {
  includeBlocked?: boolean;
};

export function getExecutionState(index: JumpIndex, id: string): ExecutionState | undefined {
  const task = index.tasks.find((candidate) => candidate.id === id);
  if (!task) {
    return undefined;
  }

  return buildExecutionState(index, task);
}

export function getReadyTasks(index: JumpIndex, options: ReadyOptions = {}): ExecutionState[] {
  const candidates = filterTasks(index, options).filter((task) => EXECUTION_ELIGIBLE_STATUSES.includes(task.status));
  const states = candidates.map((task) => buildExecutionState(index, task));
  const filtered = options.includeBlocked ? states : states.filter((state) => state.ready);
  return filtered.sort(compareExecutionStates);
}

export function renderReadyTasks(states: ExecutionState[]): string {
  if (states.length === 0) {
    return chalk.dim("No approved tasks are ready for execution.");
  }

  const showModule = states.some(({ task }) => Boolean(task.module));
  const headers = ["ID", "STATUS", ...(showModule ? ["MODULE"] : []), "READY", "BLOCKERS", "TITLE"];
  const rows = states.map((state) => [
    state.task.id,
    state.task.status,
    ...(showModule ? [state.task.module ?? ""] : []),
    state.ready ? "yes" : "no",
    state.blockers.length === 0 ? "" : String(state.blockers.length),
    state.task.title,
  ]);
  const widths = headers.map((header, index) => {
    const maxValue = Math.max(header.length, ...rows.map((row) => row[index].length));
    return index === headers.length - 1 ? maxValue : maxValue + 2;
  });

  const formatRow = (row: string[]) =>
    row.map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index]))).join("");

  return [formatRow(headers), ...rows.map(formatRow)].join("\n");
}

export function renderPlanPacket(state: ExecutionState): string {
  const { task } = state;

  return [
    "# Jumpspace Plan Packet",
    "",
    `Task: ${task.id} ${task.title}`,
    "",
    "## Approval status",
    "",
    renderApprovalStatus(state),
    "",
    "## Intent",
    "",
    task.spec || "_No spec body found._",
    "",
    "## Scope",
    "",
    `- Type: ${task.type}`,
    `- Status: ${task.status}`,
    ...(task.module ? [`- Module: ${task.module}`] : []),
    ...(task.space ? [`- Space: ${task.space}`] : []),
    ...(task.keywords?.length ? [`- Keywords: ${task.keywords.join(", ")}`] : []),
    "",
    "## Acceptance criteria",
    "",
    renderAcceptanceCriteria(task),
    "",
    "## Linked code",
    "",
    renderList(task.code),
    "",
    "## Linked tests",
    "",
    renderList(task.tests),
    "",
    "## Dependencies",
    "",
    renderDependencyList(state),
    "",
    "## Human approval checklist",
    "",
    "- Confirm the intent describes the desired feature behavior.",
    "- Confirm linked code and test paths are plausible starting points.",
    "- Confirm dependencies are correct and complete.",
    "- Change status to `approved` when this task is ready to hand to an agent.",
    "- Run `jumpspace task scan` after editing the docs.",
    "",
  ].join("\n");
}

export function renderExecutionPacket(state: ExecutionState, options: { forced?: boolean } = {}): string {
  const { task } = state;

  return [
    "# Jumpspace Execution Packet",
    "",
    `Task: ${task.id} ${task.title}`,
    "",
    "## Gate",
    "",
    renderExecutionGate(state, options),
    "",
    "## Intent",
    "",
    task.spec || "_No spec body found._",
    "",
    "## Starting points",
    "",
    "Code:",
    renderList(task.code),
    "",
    "Tests:",
    renderList(task.tests),
    "",
    "## Acceptance criteria",
    "",
    renderAcceptanceCriteria(task),
    "",
    "## Verification records",
    "",
    renderVerificationRecords(task),
    "",
    "## Dependencies",
    "",
    renderDependencyList(state),
    "",
    "## Agent workflow",
    "",
    "- Treat this packet and `jumpspace task context` as the implementation source of truth.",
    "- Inspect linked code, tests, dependencies, and refs before editing.",
    "- Keep changes scoped to this task unless dependency context requires otherwise.",
    "- Update the Jumpspace block if behavior, linked code, linked tests, or status changes.",
    "- Run relevant tests, then `jumpspace task scan` and `jumpspace task audit` before finishing.",
    "- In the final response, mention the task ID and verification performed.",
    "",
    "## Suggested commands",
    "",
    "```bash",
    `jumpspace task context ${task.id}`,
    "npm test",
    "jumpspace task scan",
    "jumpspace task audit",
    "```",
    "",
  ].join("\n");
}

function buildExecutionState(index: JumpIndex, task: JumpTask): ExecutionState {
  const tasksById = new Map(index.tasks.map((candidate) => [candidate.id, candidate]));
  const dependencies = task.depends_on.flatMap((dependencyId) => {
    const dependency = tasksById.get(dependencyId);
    return dependency ? [dependency] : [];
  });
  const missingDependencies = task.depends_on.filter((dependencyId) => !tasksById.has(dependencyId));
  const blockers: ExecutionBlocker[] = [];

  if (!EXECUTION_ELIGIBLE_STATUSES.includes(task.status)) {
    blockers.push({
      type: "status",
      taskId: task.id,
      status: task.status,
      message: `Task ${task.id} is ${task.status}; execution requires approved or partial status.`,
    });
  }

  for (const dependencyId of missingDependencies) {
    blockers.push({
      type: "dependency",
      taskId: dependencyId,
      message: `Task ${task.id} depends on unknown task ID "${dependencyId}".`,
    });
  }

  for (const dependency of dependencies) {
    if (COMPLETE_STATUSES.includes(dependency.status)) {
      continue;
    }

    blockers.push({
      type: "dependency",
      taskId: dependency.id,
      status: dependency.status,
      message: `Dependency ${dependency.id} is ${dependency.status}; execution requires implemented or verified dependencies.`,
    });
  }

  return {
    task,
    ready: blockers.length === 0,
    blockers,
    dependencies,
    missingDependencies,
  };
}

function compareExecutionStates(left: ExecutionState, right: ExecutionState): number {
  if (left.ready !== right.ready) {
    return left.ready ? -1 : 1;
  }
  return left.task.id.localeCompare(right.task.id);
}

function renderApprovalStatus(state: ExecutionState): string {
  if (state.task.status === "approved") {
    return "Approved for execution.";
  }
  if (state.task.status === "partial") {
    return "Partially implemented; eligible for continued execution.";
  }
  if (state.task.status === "draft" || state.task.status === "proposed") {
    return `Needs human approval. Current status is \`${state.task.status}\`; change it to \`approved\` after review.`;
  }
  if (state.task.status === "implemented" || state.task.status === "verified") {
    return `Already ${state.task.status}; use this packet for review or follow-up planning.`;
  }
  return `Current status is \`${state.task.status}\`; refresh the task before execution.`;
}

function renderExecutionGate(state: ExecutionState, options: { forced?: boolean }): string {
  if (state.ready) {
    return "Ready for agent execution.";
  }

  const lines = [
    options.forced ? "Forced execution requested. Review blockers before proceeding." : "Blocked for execution.",
    "",
    ...state.blockers.map((blocker) => `- ${blocker.message}`),
  ];
  return lines.join("\n");
}

function renderDependencyList(state: ExecutionState): string {
  const lines = [
    ...state.dependencies.map((dependency) => `- ${dependency.id} ${dependency.title} (${dependency.status})`),
    ...state.missingDependencies.map((dependencyId) => `- ${dependencyId} (missing)`),
  ];

  return renderList(lines);
}

function renderAcceptanceCriteria(task: JumpTask): string {
  return renderList((task.acceptance_criteria ?? []).map((criterion) => `${criterion.id}: ${criterion.description}`));
}

function renderVerificationRecords(task: JumpTask): string {
  return renderList(
    (task.verification_records ?? []).map(
      (record) => `${record.id}: ${record.verified_at} ${record.commit} (${record.acceptance_criteria_covered.join(", ")})`,
    ),
  );
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => (item.startsWith("- ") ? item : `- ${item}`)).join("\n");
}
