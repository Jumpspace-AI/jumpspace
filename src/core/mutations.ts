import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { atomicWriteFile } from "./atomicWrite.js";
import { resolveRepoPath } from "./config.js";
import { withMutationLock } from "./mutationLock.js";

export const LAST_MUTATION_PATH = ".jumpspace/last-mutation.json";
export const MUTATION_HISTORY_PATH = ".jumpspace/mutations.jsonl";

const mutationWarningSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    taskId: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
  })
  .strict();

export type MutationWarning = z.infer<typeof mutationWarningSchema>;

const lastMutationSummarySchema = z
  .object({
    version: z.literal(1),
    command: z.string().min(1),
    recorded_at: z.string().min(1),
    touched_files: z.array(z.string().min(1)).default([]),
    task_ids: z.array(z.string().min(1)).default([]),
    config_changes: z.array(z.string().min(1)).default([]),
    index_changed: z.boolean(),
    warnings: z.array(mutationWarningSchema).default([]),
  })
  .strict();

export type LastMutationSummary = z.infer<typeof lastMutationSummarySchema>;
export type MutationHistoryEntry = LastMutationSummary;

export type MutationSummaryInput = {
  command: string;
  touched_files?: string[];
  task_ids?: string[];
  config_changes?: string[];
  index_changed?: boolean;
  warnings?: MutationWarning[];
};

export type MutationHistoryOptions = {
  taskId?: string;
  limit?: number;
};

export type MutationHistoryReport = {
  history_path: string;
  total: number;
  returned: number;
  filters: {
    task_id?: string;
    limit?: number;
  };
  entries: MutationHistoryEntry[];
};

export async function recordMutation(root: string, input: MutationSummaryInput): Promise<LastMutationSummary> {
  const summary: LastMutationSummary = {
    version: 1,
    command: input.command,
    recorded_at: new Date().toISOString(),
    touched_files: unique(input.touched_files ?? []),
    task_ids: unique(input.task_ids ?? []),
    config_changes: unique(input.config_changes ?? []),
    index_changed: Boolean(input.index_changed),
    warnings: input.warnings ?? [],
  };

  await withMutationLock(
    root,
    async () => {
      const filePath = resolveRepoPath(root, LAST_MUTATION_PATH);
      await atomicWriteFile(filePath, `${JSON.stringify(summary, null, 2)}\n`);
      await appendMutationHistory(root, summary);
    },
    { holder: `mutation:${input.command}` },
  );

  return summary;
}

export async function readLastMutation(root: string): Promise<LastMutationSummary | undefined> {
  const filePath = resolveRepoPath(root, LAST_MUTATION_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }
    throw error;
  }

  return lastMutationSummarySchema.parse(JSON.parse(raw));
}

export async function readMutationHistory(root: string, options: MutationHistoryOptions = {}): Promise<MutationHistoryReport> {
  const entries = await readMutationHistoryEntries(root);
  const filtered = options.taskId ? entries.filter((entry) => entry.task_ids.includes(options.taskId!)) : entries;
  const newestFirst = [...filtered].reverse();
  const limited = typeof options.limit === "number" ? newestFirst.slice(0, options.limit) : newestFirst;

  return {
    history_path: MUTATION_HISTORY_PATH,
    total: filtered.length,
    returned: limited.length,
    filters: {
      ...(options.taskId ? { task_id: options.taskId } : {}),
      ...(typeof options.limit === "number" ? { limit: options.limit } : {}),
    },
    entries: limited,
  };
}

export function renderLastMutation(summary: LastMutationSummary): string {
  return [
    "# Jumpspace Last Mutation",
    "",
    `Command: ${summary.command}`,
    `Recorded at: ${summary.recorded_at}`,
    `Index changed: ${summary.index_changed ? "yes" : "no"}`,
    "",
    "## Touched files",
    renderList(summary.touched_files),
    "",
    "## Task IDs",
    renderList(summary.task_ids),
    "",
    "## Config changes",
    renderList(summary.config_changes),
    "",
    "## Warnings",
    renderList(summary.warnings.map((warning) => `${warning.code}: ${warning.message}`)),
  ].join("\n");
}

export function renderMutationHistory(report: MutationHistoryReport): string {
  const lines = [
    "# Jumpspace Mutation History",
    "",
    `History path: ${report.history_path}`,
    `Total entries: ${report.total}`,
    `Returned entries: ${report.returned}`,
    `Filters: ${renderFilters(report.filters)}`,
    "",
  ];

  if (report.entries.length === 0) {
    lines.push("No mutation history has been recorded.");
    return lines.join("\n");
  }

  lines.push("## Entries");
  for (const entry of report.entries) {
    lines.push("");
    lines.push(`- ${entry.recorded_at} ${entry.command}`);
    lines.push(`  Task IDs: ${renderInlineList(entry.task_ids)}`);
    lines.push(`  Touched files: ${renderInlineList(entry.touched_files)}`);
    lines.push(`  Index changed: ${entry.index_changed ? "yes" : "no"}`);
    if (entry.warnings.length > 0) {
      lines.push(`  Warnings: ${renderInlineList(entry.warnings.map((warning) => `${warning.code}: ${warning.message}`))}`);
    }
  }

  return lines.join("\n");
}

async function appendMutationHistory(root: string, summary: LastMutationSummary): Promise<void> {
  const historyPath = resolveRepoPath(root, MUTATION_HISTORY_PATH);
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  const handle = await fs.open(historyPath, "a");

  try {
    await handle.writeFile(`${JSON.stringify(summary)}\n`);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function readMutationHistoryEntries(root: string): Promise<MutationHistoryEntry[]> {
  const historyPath = resolveRepoPath(root, MUTATION_HISTORY_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(historyPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => parseHistoryLine(line, index + 1));
}

function parseHistoryLine(line: string, lineNumber: number): MutationHistoryEntry {
  try {
    return lastMutationSummarySchema.parse(JSON.parse(line));
  } catch (error) {
    throw new Error(`Invalid mutation history entry at ${MUTATION_HISTORY_PATH}:${lineNumber}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function renderInlineList(items: string[]): string {
  return items.length === 0 ? "None" : items.join(", ");
}

function renderFilters(filters: MutationHistoryReport["filters"]): string {
  const parts = [];
  if (filters.task_id) {
    parts.push(`task=${filters.task_id}`);
  }
  if (typeof filters.limit === "number") {
    parts.push(`limit=${filters.limit}`);
  }
  return parts.length === 0 ? "None" : parts.join(", ");
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
