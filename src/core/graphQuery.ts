import { commandError, type JsonCommandError } from "./errors.js";
import {
  JUMP_TASK_REF_TYPES,
  JUMP_TASK_SPACES,
  JUMP_TASK_STATUSES,
  JUMP_TASK_TYPES,
  type JumpIndex,
  type JumpTask,
  type JumpTaskRefType,
} from "./types.js";

export type GraphQueryPresence = "any" | "none";
export type GraphQueryVerification = "verified" | "unverified" | "has-records" | "no-records";

export type GraphRefQuery = {
  type: JumpTaskRefType;
  id: string;
};

export type GraphQueryInput = {
  statuses?: string[];
  types?: string[];
  modules?: string[];
  spaces?: string[];
  dependsOn?: string[];
  dependsOnTransitive?: string[];
  refs?: GraphRefQuery[];
  referencedBy?: GraphRefQuery[];
  codePaths?: string[];
  testPaths?: string[];
  codePresence?: GraphQueryPresence;
  testPresence?: GraphQueryPresence;
  gapPresence?: GraphQueryPresence;
  acceptanceCriteria?: string[];
  verification?: GraphQueryVerification;
  where?: string[];
};

export type AppliedGraphFilter = {
  field: string;
  op: string;
  value: string;
};

export type MatchedGraphPath = {
  kind: "field" | "depends_on" | "depends_on_transitive" | "ref" | "referenced_by";
  field?: string;
  from?: string;
  to?: string;
  via?: string[];
  refType?: JumpTaskRefType;
  value?: string;
};

export type GraphQueryResultItem = {
  task: JumpTask;
  matched_graph_paths: MatchedGraphPath[];
};

export type GraphQueryReport = {
  ok: true;
  query: {
    filters: AppliedGraphFilter[];
  };
  results: GraphQueryResultItem[];
  unanswered_constraints: AppliedGraphFilter[];
};

export type GraphQueryResult =
  | GraphQueryReport
  | {
      ok: false;
      errors: JsonCommandError[];
    };

type NormalizedGraphQuery = Required<Omit<GraphQueryInput, "codePresence" | "testPresence" | "gapPresence" | "verification" | "where">> & {
  codePresence?: GraphQueryPresence;
  testPresence?: GraphQueryPresence;
  gapPresence?: GraphQueryPresence;
  verification?: GraphQueryVerification;
};

export function runGraphQuery(index: JumpIndex, input: GraphQueryInput): GraphQueryResult {
  const normalized = normalizeGraphQuery(input);
  const errors = validateGraphQuery(index, normalized);
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  const filters = appliedFilters(normalized);
  const results = index.tasks
    .flatMap((task) => {
      const matched = matchedPaths(index, task, normalized);
      return matched ? [{ task, matched_graph_paths: matched }] : [];
    })
    .sort((left, right) => left.task.id.localeCompare(right.task.id));

  return {
    ok: true,
    query: {
      filters,
    },
    results,
    unanswered_constraints: filters.filter((filter) => !results.some((result) => resultMatchesFilter(result, filter))),
  };
}

function normalizeGraphQuery(input: GraphQueryInput): NormalizedGraphQuery {
  const query: NormalizedGraphQuery = {
    statuses: unique(input.statuses ?? []),
    types: unique(input.types ?? []),
    modules: unique(input.modules ?? []),
    spaces: unique(input.spaces ?? []),
    dependsOn: unique(input.dependsOn ?? []),
    dependsOnTransitive: unique(input.dependsOnTransitive ?? []),
    refs: [...(input.refs ?? [])],
    referencedBy: [...(input.referencedBy ?? [])],
    codePaths: unique(input.codePaths ?? []),
    testPaths: unique(input.testPaths ?? []),
    acceptanceCriteria: unique(input.acceptanceCriteria ?? []),
    codePresence: input.codePresence,
    testPresence: input.testPresence,
    gapPresence: input.gapPresence,
    verification: input.verification,
  };

  for (const predicate of input.where ?? []) {
    applyWherePredicate(query, predicate);
  }

  return query;
}

function applyWherePredicate(query: NormalizedGraphQuery, predicate: string): void {
  const match = /^([^=~]+)(=|~)(.+)$/.exec(predicate);
  if (!match) {
    query.modules.push(`__INVALID_PREDICATE__:${predicate}`);
    return;
  }

  const field = match[1].trim();
  const op = match[2];
  const value = match[3].trim();
  const append = <K extends keyof NormalizedGraphQuery>(key: K, item: string) => {
    const values = query[key];
    if (Array.isArray(values)) {
      values.push(item as never);
    }
  };

  if (field === "status") {
    append("statuses", value);
  } else if (field === "type") {
    append("types", value);
  } else if (field === "module") {
    append("modules", value);
  } else if (field === "space") {
    append("spaces", value);
  } else if (field === "depends_on") {
    append("dependsOn", value);
  } else if (field === "depends_on_transitive") {
    append("dependsOnTransitive", value);
  } else if (field === "ref") {
    query.refs.push(parseRefQuery(value));
  } else if (field === "referenced_by") {
    query.referencedBy.push(parseRefQuery(value));
  } else if (field === "code") {
    applyPresenceOrPath(query, "codePresence", "codePaths", value, op);
  } else if (field === "tests") {
    applyPresenceOrPath(query, "testPresence", "testPaths", value, op);
  } else if (field === "gaps") {
    query.gapPresence = parsePresence(value);
  } else if (field === "acceptance") {
    append("acceptanceCriteria", value);
  } else if (field === "verification") {
    query.verification = parseVerification(value);
  } else {
    query.modules.push(`__UNKNOWN_FIELD__:${field}`);
  }
}

function applyPresenceOrPath(
  query: NormalizedGraphQuery,
  presenceKey: "codePresence" | "testPresence",
  pathKey: "codePaths" | "testPaths",
  value: string,
  op: string,
): void {
  if (op === "=" && (value === "any" || value === "none")) {
    query[presenceKey] = value;
    return;
  }
  query[pathKey].push(value);
}

function validateGraphQuery(index: JumpIndex, query: NormalizedGraphQuery): JsonCommandError[] {
  const errors: JsonCommandError[] = [];
  const ids = new Set(index.tasks.map((task) => task.id));

  validateAllowed("status", query.statuses, JUMP_TASK_STATUSES, errors);
  validateAllowed("type", query.types, JUMP_TASK_TYPES, errors);
  validateAllowed("space", query.spaces, JUMP_TASK_SPACES, errors);

  for (const module of query.modules) {
    if (module.startsWith("__UNKNOWN_FIELD__:")) {
      const field = module.replace("__UNKNOWN_FIELD__:", "");
      errors.push(commandError("UNKNOWN_QUERY_FIELD", `Unknown query field "${field}".`, { path: field }));
    } else if (module.startsWith("__INVALID_PREDICATE__:")) {
      const predicate = module.replace("__INVALID_PREDICATE__:", "");
      errors.push(commandError("INVALID_QUERY_PREDICATE", `Invalid query predicate "${predicate}". Expected field=value or field~value.`));
    }
  }
  query.modules = query.modules.filter((module) => !module.startsWith("__UNKNOWN_FIELD__:") && !module.startsWith("__INVALID_PREDICATE__:"));

  for (const id of [...query.dependsOn, ...query.dependsOnTransitive]) {
    if (!ids.has(id)) {
      errors.push(commandError("UNKNOWN_TASK", `Unknown task ID "${id}" in dependency query.`, { taskId: id }));
    }
  }

  for (const ref of [...query.refs, ...query.referencedBy]) {
    if (!JUMP_TASK_REF_TYPES.includes(ref.type)) {
      errors.push(commandError("UNSUPPORTED_REF_TYPE", `Unsupported ref type "${ref.type}". Expected one of: ${JUMP_TASK_REF_TYPES.join(", ")}.`));
    }
  }

  if (query.codePresence && query.codePaths.length > 0 && query.codePresence === "none") {
    errors.push(commandError("AMBIGUOUS_QUERY_CONSTRAINT", "Cannot combine code=none or --no-code with code path filters."));
  }
  validatePresence("code", query.codePresence, errors);
  if (query.testPresence && query.testPaths.length > 0 && query.testPresence === "none") {
    errors.push(commandError("AMBIGUOUS_QUERY_CONSTRAINT", "Cannot combine tests=none or --no-tests with test path filters."));
  }
  validatePresence("tests", query.testPresence, errors);
  validatePresence("gaps", query.gapPresence, errors);
  if (query.verification && !["verified", "unverified", "has-records", "no-records"].includes(query.verification)) {
    errors.push(commandError("INVALID_VERIFICATION_FILTER", `Invalid verification filter "${query.verification}".`));
  }

  return errors;
}

function validatePresence(field: string, value: GraphQueryPresence | undefined, errors: JsonCommandError[]): void {
  if (value && value !== "any" && value !== "none") {
    errors.push(commandError("AMBIGUOUS_QUERY_CONSTRAINT", `Invalid or conflicting ${field} presence query. Expected any or none.`, { path: field }));
  }
}

function validateAllowed(name: string, values: string[], allowed: readonly string[], errors: JsonCommandError[]): void {
  for (const value of values) {
    if (!allowed.includes(value)) {
      errors.push(commandError("INVALID_QUERY_VALUE", `Invalid ${name} "${value}". Expected one of: ${allowed.join(", ")}.`, { path: name }));
    }
  }
}

function matchedPaths(index: JumpIndex, task: JumpTask, query: NormalizedGraphQuery): MatchedGraphPath[] | undefined {
  const paths: MatchedGraphPath[] = [];
  const required: Array<MatchedGraphPath[] | undefined> = [
    matchAny("status", task.status, query.statuses),
    matchAny("type", task.type, query.types),
    matchAny("module", task.module, query.modules),
    matchAny("space", task.space, query.spaces),
    matchDependency(task, query.dependsOn),
    matchTransitiveDependency(index, task, query.dependsOnTransitive),
    matchRefs(task, query.refs),
    matchReferencedBy(index, task, query.referencedBy),
    matchPathFilters("code", task.code, query.codePaths),
    matchPathFilters("tests", task.tests, query.testPaths),
    matchPresence("code", task.code.length > 0, query.codePresence),
    matchPresence("tests", task.tests.length > 0, query.testPresence),
    matchPresence("gaps", (task.gaps ?? []).length > 0, query.gapPresence),
    matchAcceptance(task, query.acceptanceCriteria),
    matchVerification(task, query.verification),
  ];

  for (const match of required) {
    if (!match) {
      return undefined;
    }
    paths.push(...match);
  }

  return paths;
}

function matchAny(field: string, actual: string | undefined, expected: string[]): MatchedGraphPath[] | undefined {
  if (expected.length === 0) {
    return [];
  }
  if (!actual || !expected.includes(actual)) {
    return undefined;
  }
  return [{ kind: "field", field, value: actual }];
}

function matchDependency(task: JumpTask, ids: string[]): MatchedGraphPath[] | undefined {
  if (ids.length === 0) {
    return [];
  }
  const matches = ids.filter((id) => task.depends_on.includes(id));
  if (matches.length !== ids.length) {
    return undefined;
  }
  return matches.map((id) => ({ kind: "depends_on", from: task.id, to: id }));
}

function matchTransitiveDependency(index: JumpIndex, task: JumpTask, ids: string[]): MatchedGraphPath[] | undefined {
  if (ids.length === 0) {
    return [];
  }

  const paths: MatchedGraphPath[] = [];
  for (const id of ids) {
    const path = dependencyPath(index, task.id, id);
    if (!path) {
      return undefined;
    }
    paths.push({ kind: "depends_on_transitive", from: task.id, to: id, via: path });
  }
  return paths;
}

function dependencyPath(index: JumpIndex, from: string, to: string): string[] | undefined {
  const tasksById = new Map(index.tasks.map((task) => [task.id, task]));
  const queue: string[][] = [[from]];
  const seen = new Set<string>([from]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = tasksById.get(path[path.length - 1]);
    if (!current) {
      continue;
    }
    for (const dependency of current.depends_on) {
      const nextPath = [...path, dependency];
      if (dependency === to) {
        return nextPath;
      }
      if (!seen.has(dependency)) {
        seen.add(dependency);
        queue.push(nextPath);
      }
    }
  }

  return undefined;
}

function matchRefs(task: JumpTask, refs: GraphRefQuery[]): MatchedGraphPath[] | undefined {
  if (refs.length === 0) {
    return [];
  }
  const paths: MatchedGraphPath[] = [];
  for (const ref of refs) {
    if (!(task.refs ?? []).some((candidate) => candidate.type === ref.type && candidate.id === ref.id)) {
      return undefined;
    }
    paths.push({ kind: "ref", refType: ref.type, from: task.id, to: ref.id });
  }
  return paths;
}

function matchReferencedBy(index: JumpIndex, task: JumpTask, refs: GraphRefQuery[]): MatchedGraphPath[] | undefined {
  if (refs.length === 0) {
    return [];
  }
  const paths: MatchedGraphPath[] = [];
  for (const ref of refs) {
    const inbound = index.tasks.find((candidate) =>
      (candidate.refs ?? []).some((candidateRef) => candidateRef.type === ref.type && candidateRef.id === task.id && candidate.id === ref.id),
    );
    if (!inbound) {
      return undefined;
    }
    paths.push({ kind: "referenced_by", refType: ref.type, from: ref.id, to: task.id });
  }
  return paths;
}

function matchPathFilters(field: "code" | "tests", actualPaths: string[], expected: string[]): MatchedGraphPath[] | undefined {
  if (expected.length === 0) {
    return [];
  }
  const matches: MatchedGraphPath[] = [];
  for (const value of expected) {
    const matched = actualPaths.find((repoPath) => repoPath.includes(value));
    if (!matched) {
      return undefined;
    }
    matches.push({ kind: "field", field, value: matched });
  }
  return matches;
}

function matchPresence(field: "code" | "tests" | "gaps", hasValue: boolean, presence: GraphQueryPresence | undefined): MatchedGraphPath[] | undefined {
  if (!presence) {
    return [];
  }
  if (presence === "any" && hasValue) {
    return [{ kind: "field", field, value: "any" }];
  }
  if (presence === "none" && !hasValue) {
    return [{ kind: "field", field, value: "none" }];
  }
  return undefined;
}

function matchAcceptance(task: JumpTask, ids: string[]): MatchedGraphPath[] | undefined {
  if (ids.length === 0) {
    return [];
  }
  const known = new Set((task.acceptance_criteria ?? []).map((criterion) => criterion.id));
  if (!ids.every((id) => known.has(id))) {
    return undefined;
  }
  return ids.map((id) => ({ kind: "field", field: "acceptance", value: id }));
}

function matchVerification(task: JumpTask, verification: GraphQueryVerification | undefined): MatchedGraphPath[] | undefined {
  if (!verification) {
    return [];
  }
  const hasRecords = (task.verification_records ?? []).length > 0;
  if (verification === "verified" && task.status === "verified") {
    return [{ kind: "field", field: "verification", value: "verified" }];
  }
  if (verification === "unverified" && task.status !== "verified") {
    return [{ kind: "field", field: "verification", value: "unverified" }];
  }
  if (verification === "has-records" && hasRecords) {
    return [{ kind: "field", field: "verification", value: "has-records" }];
  }
  if (verification === "no-records" && !hasRecords) {
    return [{ kind: "field", field: "verification", value: "no-records" }];
  }
  return undefined;
}

function appliedFilters(query: NormalizedGraphQuery): AppliedGraphFilter[] {
  return [
    ...query.statuses.map((value) => ({ field: "status", op: "=", value })),
    ...query.types.map((value) => ({ field: "type", op: "=", value })),
    ...query.modules.map((value) => ({ field: "module", op: "=", value })),
    ...query.spaces.map((value) => ({ field: "space", op: "=", value })),
    ...query.dependsOn.map((value) => ({ field: "depends_on", op: "=", value })),
    ...query.dependsOnTransitive.map((value) => ({ field: "depends_on_transitive", op: "=", value })),
    ...query.refs.map((value) => ({ field: "ref", op: "=", value: `${value.type}:${value.id}` })),
    ...query.referencedBy.map((value) => ({ field: "referenced_by", op: "=", value: `${value.type}:${value.id}` })),
    ...query.codePaths.map((value) => ({ field: "code", op: "~", value })),
    ...query.testPaths.map((value) => ({ field: "tests", op: "~", value })),
    ...(query.codePresence ? [{ field: "code", op: "=", value: query.codePresence }] : []),
    ...(query.testPresence ? [{ field: "tests", op: "=", value: query.testPresence }] : []),
    ...(query.gapPresence ? [{ field: "gaps", op: "=", value: query.gapPresence }] : []),
    ...query.acceptanceCriteria.map((value) => ({ field: "acceptance", op: "=", value })),
    ...(query.verification ? [{ field: "verification", op: "=", value: query.verification }] : []),
  ];
}

function resultMatchesFilter(result: GraphQueryResultItem, filter: AppliedGraphFilter): boolean {
  return result.matched_graph_paths.some((path) => {
    if (filter.field === "depends_on") {
      return path.kind === "depends_on" && path.to === filter.value;
    }
    if (filter.field === "depends_on_transitive") {
      return path.kind === "depends_on_transitive" && path.to === filter.value;
    }
    if (filter.field === "ref") {
      return path.kind === "ref" && `${path.refType}:${path.to}` === filter.value;
    }
    if (filter.field === "referenced_by") {
      return path.kind === "referenced_by" && `${path.refType}:${path.from}` === filter.value;
    }
    return path.kind === "field" && path.field === filter.field && path.value === filter.value;
  });
}

export function parseRefQuery(value: string): GraphRefQuery {
  const [type, ...idParts] = value.split(":");
  return {
    type: type as JumpTaskRefType,
    id: idParts.join(":"),
  };
}

export function parsePresence(value: string): GraphQueryPresence {
  return value as GraphQueryPresence;
}

export function parseVerification(value: string): GraphQueryVerification {
  return value as GraphQueryVerification;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
