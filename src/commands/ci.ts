import { buildCiReport } from "../core/ci.js";
import { errorEnvelope } from "../core/errors.js";

export type CiOptions = {
  root?: string;
  since: string;
  query?: string[];
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runCi(options: CiOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const result = await buildCiReport({
    root,
    since: options.since,
    graphQueries: customGraphQueries(options.query ?? []),
  });

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

  writeLine(options.json ? JSON.stringify(result.report, null, 2) : result.report.pr_comment);
  return result.report.ok ? 0 : 1;
}

function customGraphQueries(predicates: string[]) {
  if (predicates.length === 0) {
    return undefined;
  }
  return [
    {
      name: "custom",
      query: {
        where: predicates,
      },
    },
  ];
}
