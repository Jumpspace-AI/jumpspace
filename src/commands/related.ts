import { readIndex } from "../core/config.js";
import { compactTask } from "../core/compact.js";
import { formatTaskRelations, getTaskRelations } from "../core/taskRelations.js";

export type RelatedOptions = {
  root?: string;
  compact?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runRelated(id: string, options: RelatedOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const summary = getTaskRelations(index, id);

  if (!summary) {
    throw new Error(`Unknown Jumpspace task ID "${id}". Run \`jumpspace task list\` to see known tasks.`);
  }

  const body =
    options.json && options.compact
      ? {
          ok: true,
          compact: true,
          task: compactTask(summary.task),
          dependencies: summary.dependencies.map(compactTask),
          dependents: summary.dependents.map(compactTask),
          references: summary.references.map(({ ref, task }) => ({
            ref,
            task: task ? compactTask(task) : null,
          })),
          referencedBy: summary.referencedBy.map(({ task, ref }) => ({
            task: compactTask(task),
            ref,
          })),
        }
      : summary;
  writeLine(options.json ? JSON.stringify(body, null, 2) : formatTaskRelations(summary));
  return 0;
}
