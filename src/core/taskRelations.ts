import chalk from "chalk";
import type { JumpIndex, JumpTask, JumpTaskRef } from "./types.js";

export type TaskRefRelation = {
  ref: JumpTaskRef;
  task?: JumpTask;
};

export type InboundTaskRefRelation = {
  task: JumpTask;
  ref: JumpTaskRef;
};

export type TaskRelationSummary = {
  task: JumpTask;
  dependencies: JumpTask[];
  dependents: JumpTask[];
  references: TaskRefRelation[];
  referencedBy: InboundTaskRefRelation[];
};

export function getTaskRelations(index: JumpIndex, id: string): TaskRelationSummary | undefined {
  const task = index.tasks.find((candidate) => candidate.id === id);
  if (!task) {
    return undefined;
  }

  const tasksById = new Map(index.tasks.map((candidate) => [candidate.id, candidate]));
  const references = (task.refs ?? []).map((ref) => ({
    ref,
    task: tasksById.get(ref.id),
  }));

  return {
    task,
    dependencies: task.depends_on.flatMap((dependency) => {
      const dependencyTask = tasksById.get(dependency);
      return dependencyTask ? [dependencyTask] : [];
    }),
    dependents: index.tasks.filter((candidate) => candidate.id !== id && candidate.depends_on.includes(id)),
    references,
    referencedBy: index.tasks.flatMap((candidate) =>
      candidate.id === id
        ? []
        : (candidate.refs ?? [])
            .filter((ref) => ref.id === id)
            .map((ref) => ({
              task: candidate,
              ref,
            })),
    ),
  };
}

export function formatTaskRelations(summary: TaskRelationSummary): string {
  return [
    `# Related tasks for ${summary.task.id}`,
    "",
    summary.task.title,
    "",
    "## Dependencies",
    "",
    renderTaskList(summary.dependencies),
    "",
    "## Dependents",
    "",
    renderTaskList(summary.dependents),
    "",
    "## References",
    "",
    renderReferenceList(summary.references),
    "",
    "## Referenced by",
    "",
    renderInboundReferenceList(summary.referencedBy),
    "",
  ].join("\n");
}

function renderTaskList(tasks: JumpTask[]): string {
  if (tasks.length === 0) {
    return chalk.dim("- None");
  }
  return tasks.map((task) => `- ${task.id} ${task.title}`).join("\n");
}

function renderReferenceList(references: TaskRefRelation[]): string {
  if (references.length === 0) {
    return chalk.dim("- None");
  }

  return references
    .map(({ ref, task }) => {
      const label = task ? `${ref.id} ${task.title}` : ref.id;
      return `- ${ref.type}: ${label}${ref.note ? ` - ${ref.note}` : ""}`;
    })
    .join("\n");
}

function renderInboundReferenceList(references: InboundTaskRefRelation[]): string {
  if (references.length === 0) {
    return chalk.dim("- None");
  }

  return references
    .map(({ task, ref }) => `- ${task.id} ${task.title} (${ref.type}${ref.note ? ` - ${ref.note}` : ""})`)
    .join("\n");
}
