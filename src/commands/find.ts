import { readIndex } from "../core/config.js";
import { compactTask } from "../core/compact.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { validateTaskFilters, type TaskFilterOptions } from "../core/filterTasks.js";
import { findTasks, formatSearchResults, type SearchMode } from "../core/searchTasks.js";

export type FindOptions = TaskFilterOptions & {
  root?: string;
  mode?: string;
  compact?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runFind(query: string, options: FindOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;

  validateTaskFilters(options);
  const mode = options.mode ?? "all";
  if (mode !== "all" && mode !== "any") {
    const error = commandError("INVALID_FIND_MODE", `Invalid find mode "${mode}". Expected all or any.`);
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const index = await readIndex(root);
  const results = findTasks(index, query, { ...options, mode: mode as SearchMode });
  const body =
    options.json && options.compact
      ? {
          ok: true,
          query,
          mode,
          compact: true,
          results: results.map((result) => ({
            task: compactTask(result.task),
            score: result.score,
            matchedTerms: result.matchedTerms,
            unmatchedTerms: result.unmatchedTerms,
            matchReasons: result.matchedFields,
          })),
        }
      : { query, mode, results };
  writeLine(options.json ? JSON.stringify(body, null, 2) : formatSearchResults(results));
  return 0;
}
