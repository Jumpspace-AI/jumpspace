import { readIndex } from "../core/config.js";
import { errorEnvelope } from "../core/errors.js";
import {
  parsePresence,
  parseRefQuery,
  parseVerification,
  runGraphQuery,
  type GraphQueryInput,
  type GraphQueryReport,
  type GraphQueryResultItem,
} from "../core/graphQuery.js";

export type QueryOptions = {
  root?: string;
  status?: string[];
  type?: string[];
  module?: string[];
  space?: string[];
  dependsOn?: string[];
  dependsOnTransitive?: string[];
  ref?: string[];
  referencedBy?: string[];
  codePath?: string[];
  testPath?: string[];
  acceptance?: string[];
  hasCode?: boolean;
  code?: boolean;
  hasTests?: boolean;
  tests?: boolean;
  hasGaps?: boolean;
  gaps?: boolean;
  verified?: boolean;
  unverified?: boolean;
  where?: string[];
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runQuery(options: QueryOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const index = await readIndex(root);
  const result = runGraphQuery(index, queryInputFromOptions(options));

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

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderGraphQueryReport(result));
  return 0;
}

function queryInputFromOptions(options: QueryOptions): GraphQueryInput {
  return {
    statuses: options.status,
    types: options.type,
    modules: options.module,
    spaces: options.space,
    dependsOn: options.dependsOn,
    dependsOnTransitive: options.dependsOnTransitive,
    refs: (options.ref ?? []).map(parseRefQuery),
    referencedBy: (options.referencedBy ?? []).map(parseRefQuery),
    codePaths: options.codePath,
    testPaths: options.testPath,
    codePresence: presenceFromFlags(options.hasCode, options.code === false),
    testPresence: presenceFromFlags(options.hasTests, options.tests === false),
    gapPresence: presenceFromFlags(options.hasGaps, options.gaps === false),
    acceptanceCriteria: options.acceptance,
    verification: verificationFromFlags(options.verified, options.unverified),
    where: options.where,
  };
}

function presenceFromFlags(hasValue: boolean | undefined, noValue: boolean | undefined) {
  if (hasValue && noValue) {
    return parsePresence("__conflict__");
  }
  if (hasValue) {
    return "any" as const;
  }
  if (noValue) {
    return "none" as const;
  }
  return undefined;
}

function verificationFromFlags(verified: boolean | undefined, unverified: boolean | undefined) {
  if (verified && unverified) {
    return parseVerification("__conflict__");
  }
  if (verified) {
    return "verified" as const;
  }
  if (unverified) {
    return "unverified" as const;
  }
  return undefined;
}

function renderGraphQueryReport(report: GraphQueryReport): string {
  return [
    "# Jumpspace Query",
    "",
    "## Filters",
    renderFilters(report.query.filters),
    "",
    "## Results",
    report.results.length === 0 ? "- None" : report.results.map(renderResult).join("\n"),
    "",
    "## Unanswered Constraints",
    renderFilters(report.unanswered_constraints),
  ].join("\n");
}

function renderFilters(filters: GraphQueryReport["query"]["filters"]): string {
  if (filters.length === 0) {
    return "- None";
  }
  return filters.map((filter) => `- ${filter.field}${filter.op}${filter.value}`).join("\n");
}

function renderResult(result: GraphQueryResultItem): string {
  const paths = result.matched_graph_paths
    .map((path) => {
      if (path.kind === "depends_on" || path.kind === "depends_on_transitive") {
        return `${path.kind}:${path.from}->${path.to}${path.via ? ` via ${path.via.join(" > ")}` : ""}`;
      }
      if (path.kind === "ref" || path.kind === "referenced_by") {
        return `${path.kind}:${path.refType}:${path.from}->${path.to}`;
      }
      return `${path.field}=${path.value}`;
    })
    .join("; ");
  return `- ${result.task.id} ${result.task.title}${paths ? ` (${paths})` : ""}`;
}
