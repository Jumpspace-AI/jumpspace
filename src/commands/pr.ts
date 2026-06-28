import { buildPrAssistantComment } from "../core/prAssistant.js";
import { errorEnvelope } from "../core/errors.js";

export type PrCommentOptions = {
  root?: string;
  since: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runPrComment(options: PrCommentOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const result = await buildPrAssistantComment({ root, since: options.since });

  if (!result.ok) {
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(result.errors), null, 2));
    } else {
      errorLine(result.review_comment);
    }
    return 1;
  }

  writeLine(options.json ? JSON.stringify(result.report, null, 2) : result.report.review_comment);
  return result.report.ok ? 0 : 1;
}
