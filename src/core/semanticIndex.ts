import crypto from "node:crypto";
import fs from "node:fs/promises";
import { z } from "zod";
import { atomicWriteFile } from "./atomicWrite.js";
import { pathExists, resolveRepoPath } from "./config.js";
import { findTasks } from "./searchTasks.js";
import type { JumpConfig, JumpIndex, JumpIssue, JumpTask } from "./types.js";

export const SEMANTIC_INDEX_VERSION = 1 as const;
export const DEFAULT_SEMANTIC_INDEX_PATH = ".jumpspace/semantic-index.json";
export const LOCAL_SEMANTIC_BACKEND = "local-task-vector-v1";
export const LANCEDB_ONNX_SEMANTIC_BACKEND = "lancedb-onnx-v1";
export const DEFAULT_SEMANTIC_MODEL = "Xenova/all-MiniLM-L6-v2";
export const DEFAULT_LANCEDB_STORE_PATH = ".jumpspace/semantic-lancedb";

export type SemanticBackendName = typeof LOCAL_SEMANTIC_BACKEND | typeof LANCEDB_ONNX_SEMANTIC_BACKEND;
export type SemanticBackendPreference = "auto" | SemanticBackendName | "lancedb+onnx";
export type SemanticVectorKind = "sparse_terms" | "dense_embedding";

export type SemanticIndexSettings = {
  enabled: boolean;
  path: string;
  backend: SemanticBackendPreference;
  model: string;
  storePath: string;
};

export type SemanticBackendInfo = {
  active: SemanticBackendName;
  preferred: "lancedb+onnx";
  selected: "auto" | SemanticBackendName;
  optional_dependencies: {
    lancedb: boolean;
    onnx: boolean;
  };
  model: {
    name: string;
    source: "default" | "config" | "option" | "provider";
    dimensions?: number;
  };
  vector_kind: SemanticVectorKind;
  store: {
    kind: "json" | "lancedb";
    path: string;
    table?: string;
    available: boolean;
    reason?: string;
  };
  degraded: boolean;
  reason: string;
};

export type SemanticEmbeddingProvider = {
  backend: typeof LANCEDB_ONNX_SEMANTIC_BACKEND;
  model: string;
  dimensions?: number;
  embed(texts: string[]): Promise<number[][]>;
  store?(
    root: string,
    storePath: string,
    rows: Array<{ task_id: string; vector: number[]; text: string; title: string; path: string }>,
  ): Promise<SemanticBackendInfo["store"]>;
};

export type SemanticIndexDocument = {
  task_id: string;
  title: string;
  status: string;
  path: string;
  heading: string;
  module?: string;
  space?: string;
  terms: string[];
  text: string;
  vector: Record<string, number>;
  vector_kind: SemanticVectorKind;
  vector_dimensions: number;
  links: {
    code: string[];
    tests: string[];
  };
  graph: {
    depends_on: string[];
    refs: Array<{ type: string; id: string; note?: string }>;
  };
};

export type SemanticIndex = {
  version: typeof SEMANTIC_INDEX_VERSION;
  generated_at: string;
  source_index: {
    path: string;
    generated_at: string;
    task_count: number;
    task_ids: string[];
    hash: string;
  };
  backend: SemanticBackendInfo;
  documents: SemanticIndexDocument[];
};

export type SemanticGraphPathKind =
  | "dependency"
  | "dependent"
  | "ref"
  | "referenced_by"
  | "supersedes"
  | "superseded_by"
  | "supersession_chain"
  | "module"
  | "space";

export type SemanticGraphPath = {
  kind: SemanticGraphPathKind;
  from: string;
  to: string;
  via: string[];
  ref_type?: string;
  field?: "module" | "space";
  value?: string;
};

export type SemanticConnectedTask = {
  task_id: string;
  title: string;
  status: string;
  path: string;
  heading: string;
  relation: SemanticGraphPathKind;
  via: string[];
};

export type SemanticSearchResult = {
  task_id: string;
  title: string;
  path: string;
  heading: string;
  score: number;
  matched_terms: string[];
  semantic_terms: string[];
  match_reasons: string[];
  graph_expansion: SemanticGraphPath[];
  connected_tasks: SemanticConnectedTask[];
};

export type SemanticIndexStatus = {
  enabled: boolean;
  path: string;
  exists: boolean;
  ready: boolean;
  stale: boolean;
  issues: JumpIssue[];
  index: SemanticIndex | null;
};

export type SemanticEvaluationQuery = {
  id: string;
  query: string;
  expected_task_ids: string[];
};

export type SemanticEvaluationBackendResult = {
  backend: "lexical-any" | typeof LOCAL_SEMANTIC_BACKEND | SemanticBackendName;
  available: boolean;
  top_task_ids: string[];
  expected_rank: number | null;
  hit: boolean;
  reason?: string;
};

export type SemanticEvaluationResult = {
  id: string;
  query: string;
  expected_task_ids: string[];
  lexical: SemanticEvaluationBackendResult;
  local: SemanticEvaluationBackendResult;
  active: SemanticEvaluationBackendResult;
};

export type SemanticEvaluationReport = {
  ok: true;
  query_count: number;
  summary: {
    lexical_hits: number;
    local_hits: number;
    active_hits: number;
  };
  active_backend: SemanticBackendInfo | null;
  results: SemanticEvaluationResult[];
};

const semanticBackendInfoSchema: z.ZodType<SemanticBackendInfo> = z
  .object({
    active: z.enum([LOCAL_SEMANTIC_BACKEND, LANCEDB_ONNX_SEMANTIC_BACKEND]),
    preferred: z.literal("lancedb+onnx"),
    selected: z.enum(["auto", LOCAL_SEMANTIC_BACKEND, LANCEDB_ONNX_SEMANTIC_BACKEND]),
    optional_dependencies: z
      .object({
        lancedb: z.boolean(),
        onnx: z.boolean(),
      })
      .strict(),
    model: z
      .object({
        name: z.string().min(1),
        source: z.enum(["default", "config", "option", "provider"]),
        dimensions: z.number().int().positive().optional(),
      })
      .strict(),
    vector_kind: z.enum(["sparse_terms", "dense_embedding"]),
    store: z
      .object({
        kind: z.enum(["json", "lancedb"]),
        path: z.string().min(1),
        table: z.string().min(1).optional(),
        available: z.boolean(),
        reason: z.string().min(1).optional(),
      })
      .strict(),
    degraded: z.boolean(),
    reason: z.string(),
  })
  .strict();

const semanticIndexDocumentSchema: z.ZodType<SemanticIndexDocument> = z
  .object({
    task_id: z.string().min(1),
    title: z.string().min(1),
    status: z.string().min(1),
    path: z.string().min(1),
    heading: z.string().min(1),
    module: z.string().min(1).optional(),
    space: z.string().min(1).optional(),
    terms: z.array(z.string().min(1)),
    text: z.string(),
    vector: z.record(z.number()),
    vector_kind: z.enum(["sparse_terms", "dense_embedding"]),
    vector_dimensions: z.number().int().nonnegative(),
    links: z
      .object({
        code: z.array(z.string()),
        tests: z.array(z.string()),
      })
      .strict(),
    graph: z
      .object({
        depends_on: z.array(z.string()),
        refs: z.array(
          z
            .object({
              type: z.string().min(1),
              id: z.string().min(1),
              note: z.string().min(1).optional(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const semanticIndexSchema: z.ZodType<SemanticIndex> = z
  .object({
    version: z.literal(SEMANTIC_INDEX_VERSION),
    generated_at: z.string().min(1),
    source_index: z
      .object({
        path: z.string().min(1),
        generated_at: z.string().min(1),
        task_count: z.number().int().nonnegative(),
        task_ids: z.array(z.string().min(1)),
        hash: z.string().min(1),
      })
      .strict(),
    backend: semanticBackendInfoSchema,
    documents: z.array(semanticIndexDocumentSchema),
  })
  .strict();

const aliases: Record<string, string[]> = {
  answer: ["ask", "evidence", "question", "retrieval"],
  approval: ["approved", "review", "human"],
  authenticate: ["auth", "login", "password", "sign", "signin"],
  auth: ["authenticate", "login", "password", "sign", "signin"],
  bootstrap: ["ingest", "import", "initialize", "graph", "docs"],
  change: ["changed", "diff", "drift", "stale"],
  check: ["test", "verify", "validation"],
  ci: ["pr", "review", "bot", "checks"],
  code: ["source", "implementation", "files"],
  dependency: ["depends", "graph", "refs", "relations"],
  docs: ["documentation", "markdown", "spec", "readme"],
  drift: ["changed", "stale", "repair", "sync"],
  evidence: ["ask", "answer", "citation", "summary", "source"],
  execute: ["work", "plan", "step", "implementation"],
  find: ["search", "query", "retrieval", "discovery"],
  graph: ["dependency", "refs", "relations", "query"],
  hybrid: ["semantic", "lexical", "retrieval", "combined"],
  ingest: ["bootstrap", "import", "initialize", "docs"],
  lancedb: ["vector", "embedding", "semantic"],
  link: ["code", "tests", "source", "reference"],
  onnx: ["embedding", "semantic", "vector"],
  plan: ["execute", "next", "step", "workflow"],
  quality: ["validation", "verification", "checks"],
  question: ["ask", "answer", "evidence"],
  repair: ["drift", "stale", "rename", "deleted"],
  retrieval: ["find", "ask", "search", "semantic", "lexical"],
  schema: ["contract", "json", "sdk"],
  search: ["find", "query", "retrieval", "discovery"],
  semantic: ["vector", "embedding", "retrieval", "conceptual"],
  test: ["checks", "verification", "validation"],
  vector: ["embedding", "semantic", "lancedb", "onnx"],
  verify: ["verification", "checks", "validation"],
  work: ["execute", "plan", "step", "agent"],
};

export function semanticIndexSettings(config: JumpConfig): SemanticIndexSettings {
  return {
    enabled: Boolean(config.semanticIndex?.enabled),
    path: config.semanticIndex?.path ?? DEFAULT_SEMANTIC_INDEX_PATH,
    backend: config.semanticIndex?.backend ?? "auto",
    model: config.semanticIndex?.model ?? DEFAULT_SEMANTIC_MODEL,
    storePath: config.semanticIndex?.storePath ?? DEFAULT_LANCEDB_STORE_PATH,
  };
}

export async function buildSemanticIndex(
  index: JumpIndex,
  options: {
    indexPath?: string;
    now?: string;
    root?: string;
    backend?: SemanticBackendPreference;
    model?: string;
    storePath?: string;
    embeddingProvider?: SemanticEmbeddingProvider;
    optionalDependencies?: { lancedb: boolean; onnx: boolean };
  } = {},
): Promise<SemanticIndex> {
  const backend = await resolveSemanticBackend(options);
  const documents = await tasksToDocuments(index.tasks, backend);
  const storedBackend = options.root ? await persistSemanticStore(options.root, options.storePath ?? DEFAULT_LANCEDB_STORE_PATH, backend, documents) : backend.info;

  return {
    version: SEMANTIC_INDEX_VERSION,
    generated_at: options.now ?? new Date().toISOString(),
    source_index: {
      path: options.indexPath ?? ".jumpspace/index.json",
      generated_at: index.generatedAt,
      task_count: index.tasks.length,
      task_ids: index.tasks.map((task) => task.id).sort(),
      hash: sourceIndexHash(index),
    },
    backend: storedBackend,
    documents,
  };
}

export async function writeSemanticIndex(root: string, repoPath: string, index: SemanticIndex): Promise<void> {
  const filePath = resolveRepoPath(root, repoPath);
  await atomicWriteFile(filePath, `${JSON.stringify(index, null, 2)}\n`);
}

export async function readSemanticIndex(root: string, repoPath = DEFAULT_SEMANTIC_INDEX_PATH): Promise<SemanticIndex> {
  const raw = await fs.readFile(resolveRepoPath(root, repoPath), "utf8");
  return semanticIndexSchema.parse(JSON.parse(raw));
}

export async function semanticIndexStatus(root: string, sourceIndex: JumpIndex, config: JumpConfig): Promise<SemanticIndexStatus> {
  const settings = semanticIndexSettings(config);
  const exists = await pathExists(resolveRepoPath(root, settings.path));
  const issues: JumpIssue[] = [];

  if (!exists) {
    if (settings.enabled) {
      issues.push({
        severity: "warning",
        code: "MISSING_SEMANTIC_INDEX",
        path: settings.path,
        message: `Semantic retrieval is enabled but ${settings.path} is missing. Run \`jumpspace task semantic build\`.`,
      });
    }
    return {
      enabled: settings.enabled,
      path: settings.path,
      exists,
      ready: false,
      stale: false,
      issues,
      index: null,
    };
  }

  let semanticIndex: SemanticIndex;
  try {
    semanticIndex = await readSemanticIndex(root, settings.path);
  } catch (error) {
    issues.push({
      severity: "warning",
      code: "INVALID_SEMANTIC_INDEX",
      path: settings.path,
      message: `Semantic index is invalid: ${formatError(error)}. Run \`jumpspace task semantic build\`.`,
    });
    return {
      enabled: settings.enabled,
      path: settings.path,
      exists,
      ready: false,
      stale: false,
      issues,
      index: null,
    };
  }

  const stale = semanticIndex.source_index.hash !== sourceIndexHash(sourceIndex);
  if (stale) {
    issues.push({
      severity: "warning",
      code: "STALE_SEMANTIC_INDEX",
      path: settings.path,
      message: `${settings.path} is stale. Run \`jumpspace task semantic build\` to refresh hybrid retrieval.`,
    });
  }
  const runtimeIssues = await semanticBackendRuntimeIssues(semanticIndex, settings.path);
  issues.push(...runtimeIssues);

  return {
    enabled: settings.enabled,
    path: settings.path,
    exists,
    ready: settings.enabled && !stale && runtimeIssues.length === 0,
    stale,
    issues,
    index: semanticIndex,
  };
}

export async function semanticIndexAuditIssues(root: string, sourceIndex: JumpIndex, config: JumpConfig): Promise<JumpIssue[]> {
  const status = await semanticIndexStatus(root, sourceIndex, config);
  return status.issues;
}

export async function searchSemanticIndex(
  semanticIndex: SemanticIndex,
  query: string,
  options: {
    limit?: number;
    minScore?: number;
    graphLimit?: number;
    embeddingProvider?: SemanticEmbeddingProvider;
  } = {},
): Promise<SemanticSearchResult[]> {
  const queryTerms = baseTerms(query);
  const queryVector = await embedQueryForIndex(semanticIndex, query, options.embeddingProvider);
  const limit = options.limit ?? 8;
  const minScore = options.minScore ?? 0.08;

  if (Object.keys(queryVector).length === 0) {
    return [];
  }

  return semanticIndex.documents
    .map((document) => {
      const rawSemanticTerms = vectorOverlap(queryVector, document.vector).filter((term) => !term.startsWith("dim:"));
      const matchedTerms = queryTerms.filter((term) => semanticTermMatchesDocument(term, document));
      const graph = expandSemanticGraph(semanticIndex, document.task_id, { limit: options.graphLimit });
      const semanticTerms = rawSemanticTerms.length > 0 ? rawSemanticTerms : matchedTerms;
      return {
        task_id: document.task_id,
        title: document.title,
        path: document.path,
        heading: document.heading,
        score: cosine(queryVector, document.vector),
        matched_terms: matchedTerms,
        semantic_terms: semanticTerms.slice(0, 12),
        match_reasons: [
          semanticIndex.backend.active,
          ...(semanticIndex.backend.active === LANCEDB_ONNX_SEMANTIC_BACKEND ? [`model:${semanticIndex.backend.model.name}`] : []),
          ...semanticTerms.slice(0, 5).map((term) => `semantic:${term}`),
          ...unique(graph.paths.map((path) => `graph:${path.kind}`)).slice(0, 8),
        ],
        graph_expansion: graph.paths,
        connected_tasks: graph.connected_tasks,
      };
    })
    .filter((result) => result.score >= minScore)
    .sort((left, right) => right.score - left.score || left.task_id.localeCompare(right.task_id))
    .slice(0, limit);
}

export async function evaluateSemanticRetrieval(
  index: JumpIndex,
  options: {
    queries?: SemanticEvaluationQuery[];
    activeIndex?: SemanticIndex | null;
    limit?: number;
    embeddingProvider?: SemanticEmbeddingProvider;
  } = {},
): Promise<SemanticEvaluationReport> {
  const queries = options.queries ?? defaultSemanticEvaluationQueries(index);
  const localIndex = await buildSemanticIndex(index, {
    backend: LOCAL_SEMANTIC_BACKEND,
    optionalDependencies: { lancedb: false, onnx: false },
  });
  const activeIndex = options.activeIndex ?? null;
  const results: SemanticEvaluationResult[] = [];

  for (const query of queries) {
    const lexicalTop = findTasks(index, query.query, { mode: "any" })
      .slice(0, options.limit ?? 5)
      .map((result) => result.task.id);
    const localTop = (await searchSemanticIndex(localIndex, query.query, { limit: options.limit ?? 5 })).map((result) => result.task_id);
    const active = activeIndex
      ? await evaluateActiveSemanticBackend(activeIndex, query, options.limit ?? 5, options.embeddingProvider)
      : ({
          backend: LOCAL_SEMANTIC_BACKEND,
          available: false,
          top_task_ids: [],
          expected_rank: null,
          hit: false,
          reason: "No ready semantic index was supplied.",
        } satisfies SemanticEvaluationBackendResult);

    results.push({
      id: query.id,
      query: query.query,
      expected_task_ids: query.expected_task_ids,
      lexical: evaluationResult("lexical-any", lexicalTop, query.expected_task_ids),
      local: evaluationResult(LOCAL_SEMANTIC_BACKEND, localTop, query.expected_task_ids),
      active,
    });
  }

  return {
    ok: true,
    query_count: results.length,
    summary: {
      lexical_hits: results.filter((result) => result.lexical.hit).length,
      local_hits: results.filter((result) => result.local.hit).length,
      active_hits: results.filter((result) => result.active.hit).length,
    },
    active_backend: activeIndex?.backend ?? null,
    results,
  };
}

export function defaultSemanticEvaluationQueries(index: JumpIndex): SemanticEvaluationQuery[] {
  const candidates: SemanticEvaluationQuery[] = [
    {
      id: "conceptual-retrieval",
      query: "conceptual evidence retrieval graph expansion",
      expected_task_ids: ["JS-012", "JS-024", "JS-030"],
    },
    {
      id: "pr-assistant",
      query: "bot drafts review comments for changed code and docs",
      expected_task_ids: ["JS-026", "JS-031"],
    },
    {
      id: "lifecycle-drift",
      query: "source heading moved deleted orphan stale task",
      expected_task_ids: ["JS-028"],
    },
  ];
  const taskIds = new Set(index.tasks.map((task) => task.id));
  const matching = candidates
    .map((query) => ({
      ...query,
      expected_task_ids: query.expected_task_ids.filter((id) => taskIds.has(id)),
    }))
    .filter((query) => query.expected_task_ids.length > 0);

  if (matching.length > 0) {
    return matching;
  }

  return index.tasks.slice(0, 3).map((task) => ({
    id: task.id.toLowerCase(),
    query: [task.title, task.module, ...(task.keywords ?? [])].filter(Boolean).join(" "),
    expected_task_ids: [task.id],
  }));
}

export function expandSemanticGraph(
  semanticIndex: SemanticIndex,
  taskId: string,
  options: { limit?: number } = {},
): { paths: SemanticGraphPath[]; connected_tasks: SemanticConnectedTask[] } {
  const limit = options.limit ?? 12;
  const documentsById = new Map(semanticIndex.documents.map((document) => [document.task_id, document]));
  const seed = documentsById.get(taskId);
  if (!seed) {
    return { paths: [], connected_tasks: [] };
  }

  const paths: SemanticGraphPath[] = [];
  const addPath = (path: SemanticGraphPath) => {
    if (path.to === taskId || !documentsById.has(path.to)) {
      return;
    }
    const key = [path.kind, path.from, path.to, path.ref_type, path.field, path.value, path.via.join(">")].join("\0");
    if (paths.some((existing) => [existing.kind, existing.from, existing.to, existing.ref_type, existing.field, existing.value, existing.via.join(">")].join("\0") === key)) {
      return;
    }
    paths.push(path);
  };

  for (const dependency of seed.graph.depends_on) {
    addPath({ kind: "dependency", from: taskId, to: dependency, via: [taskId, dependency] });
  }

  for (const candidate of semanticIndex.documents) {
    if (candidate.task_id !== taskId && candidate.graph.depends_on.includes(taskId)) {
      addPath({ kind: "dependent", from: taskId, to: candidate.task_id, via: [taskId, candidate.task_id] });
    }
  }

  for (const ref of seed.graph.refs) {
    addPath({
      kind: ref.type === "supersedes" ? "supersedes" : "ref",
      from: taskId,
      to: ref.id,
      via: [taskId, ref.id],
      ref_type: ref.type,
    });
  }

  for (const candidate of semanticIndex.documents) {
    for (const ref of candidate.graph.refs) {
      if (candidate.task_id === taskId || ref.id !== taskId) {
        continue;
      }
      addPath({
        kind: ref.type === "supersedes" ? "superseded_by" : "referenced_by",
        from: taskId,
        to: candidate.task_id,
        via: [taskId, candidate.task_id],
        ref_type: ref.type,
      });
    }
  }

  for (const path of supersessionChains(semanticIndex, taskId)) {
    addPath({
      kind: "supersession_chain",
      from: taskId,
      to: path[path.length - 1],
      via: path,
      ref_type: "supersedes",
    });
  }

  if (seed.module) {
    for (const candidate of semanticIndex.documents.filter((document) => document.task_id !== taskId && document.module === seed.module).slice(0, 3)) {
      addPath({
        kind: "module",
        from: taskId,
        to: candidate.task_id,
        via: [taskId, candidate.task_id],
        field: "module",
        value: seed.module,
      });
    }
  }

  if (seed.space && seed.space !== "repo") {
    for (const candidate of semanticIndex.documents.filter((document) => document.task_id !== taskId && document.space === seed.space).slice(0, 3)) {
      addPath({
        kind: "space",
        from: taskId,
        to: candidate.task_id,
        via: [taskId, candidate.task_id],
        field: "space",
        value: seed.space,
      });
    }
  }

  const limited = paths.slice(0, limit);
  return {
    paths: limited,
    connected_tasks: limited.flatMap((path) => {
      const document = documentsById.get(path.to);
      return document
        ? [
            {
              task_id: document.task_id,
              title: document.title,
              status: document.status,
              path: document.path,
              heading: document.heading,
              relation: path.kind,
              via: path.via,
            },
          ]
        : [];
    }),
  };
}

export function sourceIndexHash(index: JumpIndex): string {
  const source = index.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    module: task.module,
    space: task.space,
    keywords: task.keywords ?? [],
    doc: task.doc,
    spec: task.spec,
    code: task.code,
    tests: task.tests,
    gaps: task.gaps ?? [],
    depends_on: task.depends_on,
    refs: task.refs ?? [],
    sources: task.sources ?? [],
    acceptance_criteria: task.acceptance_criteria ?? [],
  }));
  return crypto.createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

export function taskToSemanticText(task: JumpTask): string {
  return [
    task.id,
    task.title,
    task.type,
    task.status,
    task.module ?? "",
    task.space ?? "",
    ...(task.keywords ?? []),
    task.doc.path,
    task.doc.heading,
    task.spec,
    ...task.code,
    ...task.tests,
    ...task.depends_on,
    ...(task.refs ?? []).flatMap((ref) => [ref.type, ref.id, ref.note ?? ""]),
    ...(task.sources ?? []).flatMap((source) => Object.values(source).filter((value): value is string => typeof value === "string")),
    ...(task.acceptance_criteria ?? []).flatMap((criterion) => [criterion.id, criterion.description]),
    ...(task.gaps ?? []),
  ].join(" ");
}

type ResolvedSemanticBackend = {
  info: SemanticBackendInfo;
  provider?: SemanticEmbeddingProvider;
};

async function resolveSemanticBackend(options: {
  backend?: SemanticBackendPreference;
  model?: string;
  storePath?: string;
  embeddingProvider?: SemanticEmbeddingProvider;
  optionalDependencies?: { lancedb: boolean; onnx: boolean };
}): Promise<ResolvedSemanticBackend> {
  const selected = normalizeSemanticBackendPreference(options.backend ?? "auto");
  const model = options.model ?? options.embeddingProvider?.model ?? DEFAULT_SEMANTIC_MODEL;
  const optionalDependencies = options.optionalDependencies ?? (await detectOptionalEmbeddingDependencies());
  const storePath = options.storePath ?? DEFAULT_LANCEDB_STORE_PATH;
  const local = (reason: string, degraded = true): ResolvedSemanticBackend => ({
    info: {
      active: LOCAL_SEMANTIC_BACKEND,
      preferred: "lancedb+onnx",
      selected,
      optional_dependencies: optionalDependencies,
      model: {
        name: model,
        source: options.model ? "option" : "default",
      },
      vector_kind: "sparse_terms",
      store: {
        kind: "json",
        path: DEFAULT_SEMANTIC_INDEX_PATH,
        available: true,
      },
      degraded,
      reason,
    },
  });

  if (selected === "auto") {
    return local(
      optionalDependencies.lancedb && optionalDependencies.onnx
        ? "Auto mode keeps the deterministic local task-vector backend active. Pass --backend lancedb+onnx to build dense local embeddings."
        : "Optional LanceDB/ONNX dependencies are not both installed; using deterministic local task-vector embeddings.",
      !(optionalDependencies.lancedb && optionalDependencies.onnx),
    );
  }

  if (selected === LOCAL_SEMANTIC_BACKEND) {
    return local("Deterministic local task-vector backend selected explicitly.", false);
  }

  if (!optionalDependencies.lancedb || !optionalDependencies.onnx) {
    return local("Requested lancedb-onnx-v1, but optional LanceDB/ONNX dependencies are not both installed; using deterministic local task-vector embeddings.");
  }

  const provider = options.embeddingProvider ?? (await createLanceOnnxEmbeddingProvider(model));
  if (!provider) {
    return local("Requested lancedb-onnx-v1, but the local embedding provider could not be initialized; using deterministic local task-vector embeddings.");
  }

  return {
    provider,
    info: {
      active: LANCEDB_ONNX_SEMANTIC_BACKEND,
      preferred: "lancedb+onnx",
      selected,
      optional_dependencies: optionalDependencies,
      model: {
        name: provider.model,
        source: options.embeddingProvider ? "provider" : options.model ? "option" : "default",
        dimensions: provider.dimensions,
      },
      vector_kind: "dense_embedding",
      store: {
        kind: "lancedb",
        path: storePath,
        table: "jumpspace_tasks",
        available: false,
        reason: "Vector store write has not run yet.",
      },
      degraded: false,
      reason: "Using explicit local LanceDB/ONNX dense task embeddings.",
    },
  };
}

function normalizeSemanticBackendPreference(value: SemanticBackendPreference): "auto" | SemanticBackendName {
  return value === "lancedb+onnx" ? LANCEDB_ONNX_SEMANTIC_BACKEND : value;
}

async function detectOptionalEmbeddingDependencies(): Promise<{ lancedb: boolean; onnx: boolean }> {
  const [lancedb, onnx] = await Promise.all([canImport("@lancedb/lancedb"), canImport("@xenova/transformers")]);
  return { lancedb, onnx };
}

async function semanticBackendRuntimeIssues(semanticIndex: SemanticIndex, path: string): Promise<JumpIssue[]> {
  if (semanticIndex.backend.active !== LANCEDB_ONNX_SEMANTIC_BACKEND) {
    return [];
  }
  const optionalDependencies = await detectOptionalEmbeddingDependencies();
  if (optionalDependencies.lancedb && optionalDependencies.onnx) {
    return [];
  }
  return [
    {
      severity: "warning",
      code: "SEMANTIC_BACKEND_UNAVAILABLE",
      path,
      message: `${path} was built with ${LANCEDB_ONNX_SEMANTIC_BACKEND}, but optional LanceDB/ONNX dependencies are not both available. Install them locally or rebuild with \`jumpspace task semantic build --backend local-task-vector-v1\`.`,
    },
  ];
}

async function canImport(packageName: string): Promise<boolean> {
  try {
    await dynamicImport(packageName);
    return true;
  } catch {
    return false;
  }
}

async function createLanceOnnxEmbeddingProvider(model: string): Promise<SemanticEmbeddingProvider | null> {
  try {
    const transformers = await dynamicImport("@xenova/transformers");
    await dynamicImport("@lancedb/lancedb");
    const pipeline = (transformers as { pipeline?: unknown }).pipeline;
    if (typeof pipeline !== "function") {
      return null;
    }

    const extractor = (await pipeline("feature-extraction", model, {
      quantized: true,
      local_files_only: true,
    })) as (text: string, options: { pooling: "mean"; normalize: boolean }) => Promise<{ data?: Iterable<number>; dims?: number[] }>;

    return {
      backend: LANCEDB_ONNX_SEMANTIC_BACKEND,
      model,
      async embed(texts: string[]) {
        const vectors: number[][] = [];
        for (const text of texts) {
          const output = await extractor(text, { pooling: "mean", normalize: true });
          vectors.push([...Array.from(output.data ?? [])].map((value) => Number(value)));
        }
        return vectors;
      },
      store: storeLanceDbVectors,
    };
  } catch {
    return null;
  }
}

async function storeLanceDbVectors(
  root: string,
  storePath: string,
  rows: Array<{ task_id: string; vector: number[]; text: string; title: string; path: string }>,
): Promise<SemanticBackendInfo["store"]> {
  try {
    const lancedb = await dynamicImport("@lancedb/lancedb");
    const connect = (lancedb as { connect?: unknown }).connect;
    if (typeof connect !== "function") {
      throw new Error("LanceDB connect API was not found.");
    }
    const db = await connect(resolveRepoPath(root, storePath));
    const tableName = "jumpspace_tasks";
    if (typeof db.createTable !== "function") {
      throw new Error("LanceDB createTable API was not found.");
    }
    await db.createTable(tableName, rows, { mode: "overwrite" });
    return {
      kind: "lancedb",
      path: storePath,
      table: tableName,
      available: true,
    };
  } catch (error) {
    return {
      kind: "lancedb",
      path: storePath,
      table: "jumpspace_tasks",
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<Record<string, unknown>>;

async function tasksToDocuments(tasks: JumpTask[], backend: ResolvedSemanticBackend): Promise<SemanticIndexDocument[]> {
  const texts = tasks.map(taskToSemanticText);
  const vectors =
    backend.info.active === LANCEDB_ONNX_SEMANTIC_BACKEND && backend.provider
      ? (await backend.provider.embed(texts)).map(denseVectorToRecord)
      : texts.map(embedText);

  return tasks.map((task, index) => taskToDocument(task, texts[index], vectors[index], backend.info.vector_kind));
}

async function persistSemanticStore(
  root: string,
  storePath: string,
  backend: ResolvedSemanticBackend,
  documents: SemanticIndexDocument[],
): Promise<SemanticBackendInfo> {
  if (backend.info.active !== LANCEDB_ONNX_SEMANTIC_BACKEND || !backend.provider?.store) {
    return backend.info;
  }

  const rows = documents.map((document) => ({
    task_id: document.task_id,
    vector: recordToDenseVector(document.vector),
    text: document.text,
    title: document.title,
    path: document.path,
  }));
  const store = await backend.provider.store(root, storePath, rows);
  return {
    ...backend.info,
    store,
    degraded: backend.info.degraded || !store.available,
    reason: store.available ? backend.info.reason : `${backend.info.reason} LanceDB store unavailable: ${store.reason ?? "unknown error"}`,
  };
}

function taskToDocument(task: JumpTask, text: string, vector: Record<string, number>, vectorKind: SemanticVectorKind): SemanticIndexDocument {
  const termVector = embedText(text);
  return {
    task_id: task.id,
    title: task.title,
    status: task.status,
    path: task.doc.path,
    heading: task.doc.heading,
    module: task.module,
    space: task.space,
    terms: Object.keys(termVector).sort(),
    text,
    vector,
    vector_kind: vectorKind,
    vector_dimensions: Object.keys(vector).length,
    links: {
      code: task.code,
      tests: task.tests,
    },
    graph: {
      depends_on: task.depends_on,
      refs: task.refs ?? [],
    },
  };
}

async function embedQueryForIndex(
  semanticIndex: SemanticIndex,
  query: string,
  provider?: SemanticEmbeddingProvider,
): Promise<Record<string, number>> {
  if (semanticIndex.backend.active !== LANCEDB_ONNX_SEMANTIC_BACKEND) {
    return embedText(query);
  }

  const activeProvider = provider ?? (await createLanceOnnxEmbeddingProvider(semanticIndex.backend.model.name));
  if (!activeProvider) {
    throw new Error("Semantic index uses lancedb-onnx-v1, but the local embedding provider is unavailable.");
  }
  const [vector] = await activeProvider.embed([query]);
  return denseVectorToRecord(vector);
}

function embedText(value: string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const term of baseTerms(value)) {
    for (const feature of expandTerm(term)) {
      counts.set(feature, (counts.get(feature) ?? 0) + featureWeight(feature));
    }
  }

  const magnitude = Math.sqrt([...counts.values()].reduce((total, weight) => total + weight * weight, 0));
  if (magnitude === 0) {
    return {};
  }

  const entries: Array<[string, number]> = [...counts.entries()].map(([term, weight]) => [term, round(weight / magnitude)]);
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function denseVectorToRecord(values: number[]): Record<string, number> {
  const magnitude = Math.sqrt(values.reduce((total, value) => total + value * value, 0));
  if (magnitude === 0) {
    return {};
  }
  return Object.fromEntries(values.map((value, index) => [`dim:${index}`, round(value / magnitude)]));
}

function recordToDenseVector(record: Record<string, number>): number[] {
  return Object.entries(record)
    .filter(([key]) => key.startsWith("dim:"))
    .sort(([left], [right]) => Number(left.slice(4)) - Number(right.slice(4)))
    .map(([, value]) => value);
}

function baseTerms(value: string): string[] {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return [
    ...new Set(
      spaced
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.map(stem)
        .filter((term) => term.length >= 3) ?? [],
    ),
  ];
}

function expandTerm(term: string): string[] {
  const expanded = new Set<string>([term, `token:${term}`]);
  for (const alias of aliases[term] ?? []) {
    expanded.add(alias);
    expanded.add(`alias:${alias}`);
  }

  for (const [head, values] of Object.entries(aliases)) {
    if (values.includes(term)) {
      expanded.add(head);
      expanded.add(`alias:${head}`);
    }
  }

  return [...expanded];
}

function stem(term: string): string {
  return term
    .replace(/ies$/, "y")
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/s$/, "");
}

function featureWeight(feature: string): number {
  if (feature.startsWith("token:")) {
    return 1.4;
  }
  if (feature.startsWith("alias:")) {
    return 0.55;
  }
  return 1;
}

function cosine(left: Record<string, number>, right: Record<string, number>): number {
  let score = 0;
  for (const [feature, weight] of Object.entries(left)) {
    score += weight * (right[feature] ?? 0);
  }
  return round(score);
}

function vectorOverlap(left: Record<string, number>, right: Record<string, number>): string[] {
  return Object.keys(left)
    .filter((feature) => right[feature] !== undefined)
    .sort((a, b) => (right[b] ?? 0) - (right[a] ?? 0) || a.localeCompare(b));
}

function supersessionChains(semanticIndex: SemanticIndex, taskId: string): string[][] {
  const outbound = new Map<string, string[]>();
  const inbound = new Map<string, string[]>();
  for (const document of semanticIndex.documents) {
    for (const ref of document.graph.refs) {
      if (ref.type !== "supersedes") {
        continue;
      }
      outbound.set(document.task_id, [...(outbound.get(document.task_id) ?? []), ref.id]);
      inbound.set(ref.id, [...(inbound.get(ref.id) ?? []), document.task_id]);
    }
  }

  const paths: string[][] = [];
  const queue: string[][] = [[taskId]];
  const seen = new Set<string>([taskId]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    if (path.length > 4) {
      continue;
    }
    const current = path[path.length - 1];
    const nextIds = unique([...(outbound.get(current) ?? []), ...(inbound.get(current) ?? [])]);
    for (const next of nextIds) {
      if (seen.has(next)) {
        continue;
      }
      const nextPath = [...path, next];
      seen.add(next);
      queue.push(nextPath);
      if (nextPath.length > 2) {
        paths.push(nextPath);
      }
    }
  }
  return paths;
}

function semanticTermMatchesDocument(term: string, document: SemanticIndexDocument): boolean {
  const features = new Set(document.terms);
  return expandTerm(term).some((feature) => features.has(feature));
}

async function evaluateActiveSemanticBackend(
  activeIndex: SemanticIndex,
  query: SemanticEvaluationQuery,
  limit: number,
  provider?: SemanticEmbeddingProvider,
): Promise<SemanticEvaluationBackendResult> {
  try {
    const topTaskIds = (await searchSemanticIndex(activeIndex, query.query, { limit, embeddingProvider: provider })).map((result) => result.task_id);
    return evaluationResult(activeIndex.backend.active, topTaskIds, query.expected_task_ids);
  } catch (error) {
    return {
      backend: activeIndex.backend.active,
      available: false,
      top_task_ids: [],
      expected_rank: null,
      hit: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function evaluationResult(
  backend: SemanticEvaluationBackendResult["backend"],
  topTaskIds: string[],
  expectedTaskIds: string[],
): SemanticEvaluationBackendResult {
  const rank = topTaskIds.findIndex((id) => expectedTaskIds.includes(id));
  return {
    backend,
    available: true,
    top_task_ids: topTaskIds,
    expected_rank: rank >= 0 ? rank + 1 : null,
    hit: rank >= 0,
  };
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "index"}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
