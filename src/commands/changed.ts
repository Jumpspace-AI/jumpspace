import { errorEnvelope } from "../core/errors.js";
import { getChangedFiles, type ChangedFile } from "../core/changed.js";

export type ChangedOptions = {
  root?: string;
  since: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runChanged(options: ChangedOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const result = await getChangedFiles(root, options.since);

  if (!result.ok) {
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(result.errors), null, 2));
    } else {
      for (const error of result.errors) {
        errorLine(error.message);
      }
    }
    return 1;
  }

  writeLine(options.json ? JSON.stringify({ ok: true, since: result.since, files: result.files }, null, 2) : renderChanged(result.files));
  return 0;
}

function renderChanged(files: ChangedFile[]): string {
  if (files.length === 0) {
    return "No changed files found.";
  }

  return files
    .map((file) => {
      const rename = file.old_path ? ` (${file.old_path} -> ${file.path})` : "";
      return `${file.path}${rename}: ${file.statuses.join(",")} [${file.sources.join(",")}]`;
    })
    .join("\n");
}
