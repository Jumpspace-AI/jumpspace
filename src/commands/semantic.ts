import chalk from "chalk";
import { loadConfig, readIndex, writeConfig } from "../core/config.js";
import { JumpspaceCommandError, commandError, errorEnvelope, issuesToCommandErrors } from "../core/errors.js";
import { recordMutation } from "../core/mutations.js";
import {
  DEFAULT_SEMANTIC_INDEX_PATH,
  DEFAULT_LANCEDB_STORE_PATH,
  DEFAULT_SEMANTIC_MODEL,
  LANCEDB_ONNX_SEMANTIC_BACKEND,
  LOCAL_SEMANTIC_BACKEND,
  buildSemanticIndex,
  evaluateSemanticRetrieval,
  searchSemanticIndex,
  semanticIndexSettings,
  semanticIndexStatus,
  writeSemanticIndex,
  type SemanticIndex,
  type SemanticBackendPreference,
  type SemanticEvaluationReport,
  type SemanticIndexStatus,
  type SemanticSearchResult,
} from "../core/semanticIndex.js";

export type SemanticCommandOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type SemanticBuildOptions = SemanticCommandOptions & {
  backend?: string;
  model?: string;
  storePath?: string;
};

export type SemanticBuildResult = {
  ok: true;
  index_path: string;
  task_count: number;
  document_count: number;
  source_index: SemanticIndex["source_index"];
  backend: SemanticIndex["backend"];
  config_updated: boolean;
};

export type SemanticStatusResult = Omit<SemanticIndexStatus, "index"> & {
  ok: true;
  source_index: SemanticIndex["source_index"] | null;
  backend: SemanticIndex["backend"] | null;
  document_count: number;
};

export type SemanticSearchResultPacket = {
  ok: true;
  query: string;
  index_path: string;
  backend: SemanticIndex["backend"];
  results: SemanticSearchResult[];
};

export async function runSemanticBuild(options: SemanticBuildOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const [config, index] = await Promise.all([loadConfig(root), readIndex(root)]);
  const settings = semanticIndexSettings(config);
  const backend = parseSemanticBackend(options.backend);
  const model = options.model ?? settings.model;
  const storePath = options.storePath ?? settings.storePath;
  const semanticIndex = await buildSemanticIndex(index, {
    indexPath: config.indexPath,
    root,
    backend: backend ?? settings.backend,
    model,
    storePath,
  });
  const nextConfig = {
    ...config,
    semanticIndex: {
      enabled: true,
      path: settings.path,
      backend: backend ?? settings.backend,
      model,
      storePath,
    },
  };
  const configUpdated =
    !config.semanticIndex?.enabled ||
    (config.semanticIndex?.path ?? DEFAULT_SEMANTIC_INDEX_PATH) !== settings.path ||
    (config.semanticIndex?.backend ?? "auto") !== nextConfig.semanticIndex.backend ||
    (config.semanticIndex?.model ?? DEFAULT_SEMANTIC_MODEL) !== model ||
    (config.semanticIndex?.storePath ?? DEFAULT_LANCEDB_STORE_PATH) !== storePath;

  if (configUpdated) {
    await writeConfig(root, nextConfig);
  }
  await writeSemanticIndex(root, settings.path, semanticIndex);
  await recordMutation(root, {
    command: "semantic build",
    touched_files: [settings.path, ...(configUpdated ? [".jumpspace/config.json"] : [])],
    config_changes: configUpdated
      ? [
          "semanticIndex.enabled=true",
          `semanticIndex.path=${settings.path}`,
          `semanticIndex.backend=${nextConfig.semanticIndex.backend}`,
          `semanticIndex.model=${model}`,
          `semanticIndex.storePath=${storePath}`,
        ]
      : [],
    index_changed: false,
  });

  const result: SemanticBuildResult = {
    ok: true,
    index_path: settings.path,
    task_count: index.tasks.length,
    document_count: semanticIndex.documents.length,
    source_index: semanticIndex.source_index,
    backend: semanticIndex.backend,
    config_updated: configUpdated,
  };

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderSemanticBuild(result));
  return 0;
}

export async function runSemanticStatus(options: SemanticCommandOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const [config, index] = await Promise.all([loadConfig(root), readIndex(root)]);
  const status = await semanticIndexStatus(root, index, config);
  const result: SemanticStatusResult = {
    ok: true,
    enabled: status.enabled,
    path: status.path,
    exists: status.exists,
    ready: status.ready,
    stale: status.stale,
    issues: status.issues,
    source_index: status.index?.source_index ?? null,
    backend: status.index?.backend ?? null,
    document_count: status.index?.documents.length ?? 0,
  };

  writeLine(options.json ? JSON.stringify(result, null, 2) : renderSemanticStatus(result));
  return 0;
}

export async function runSemanticSearch(
  query: string,
  options: SemanticCommandOptions & { limit?: number } = {},
): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const [config, index] = await Promise.all([loadConfig(root), readIndex(root)]);
  const status = await semanticIndexStatus(root, index, config);
  if (!status.ready || !status.index) {
    const errors =
      status.issues.length > 0
        ? issuesToCommandErrors(status.issues)
        : [
            commandError("SEMANTIC_INDEX_UNAVAILABLE", "Semantic index is not ready. Run `jumpspace semantic build`.", {
              path: status.path,
            }),
          ];
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(errors), null, 2));
    } else {
      for (const error of errors) {
        errorLine(error.message);
      }
    }
    return 1;
  }

  const result: SemanticSearchResultPacket = {
    ok: true,
    query,
    index_path: status.path,
    backend: status.index.backend,
    results: await searchSemanticIndex(status.index, query, { limit: options.limit }),
  };
  writeLine(options.json ? JSON.stringify(result, null, 2) : renderSemanticSearch(result));
  return 0;
}

export async function runSemanticEval(options: SemanticCommandOptions & { limit?: number } = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const [config, index] = await Promise.all([loadConfig(root), readIndex(root)]);
  const status = await semanticIndexStatus(root, index, config);
  const report = await evaluateSemanticRetrieval(index, {
    activeIndex: status.ready ? status.index : null,
    limit: options.limit,
  });
  writeLine(options.json ? JSON.stringify(report, null, 2) : renderSemanticEval(report));
  return 0;
}

function renderSemanticBuild(result: SemanticBuildResult): string {
  return [
    chalk.green(`Built semantic index at ${result.index_path}.`),
    `Tasks: ${result.task_count}`,
    `Documents: ${result.document_count}`,
    `Backend: ${result.backend.active}${result.backend.degraded ? " (degraded)" : ""}`,
    `Model: ${result.backend.model.name}`,
    `Config updated: ${result.config_updated ? "yes" : "no"}`,
  ].join("\n");
}

function renderSemanticStatus(result: SemanticStatusResult): string {
  return [
    "# Jumpspace Semantic Index",
    "",
    `Enabled: ${result.enabled ? "yes" : "no"}`,
    `Path: ${result.path}`,
    `Exists: ${result.exists ? "yes" : "no"}`,
    `Ready: ${result.ready ? "yes" : "no"}`,
    `Stale: ${result.stale ? "yes" : "no"}`,
    `Documents: ${result.document_count}`,
    `Backend: ${result.backend?.active ?? "none"}`,
    `Model: ${result.backend?.model.name ?? "none"}`,
    `Store: ${result.backend ? `${result.backend.store.kind}:${result.backend.store.path}` : "none"}`,
    "",
    "## Issues",
    result.issues.length
      ? result.issues.map((issue) => `- ${issue.code}: ${issue.message}`).join("\n")
      : "- None",
  ].join("\n");
}

function renderSemanticSearch(result: SemanticSearchResultPacket): string {
  if (result.results.length === 0) {
    return chalk.dim("No semantic matches found.");
  }

  return [
    "# Jumpspace Semantic Search",
    "",
    `Query: ${result.query}`,
    `Backend: ${result.backend.active}`,
    `Model: ${result.backend.model.name}`,
    "",
    ...result.results.flatMap((item) => [
      `- ${item.task_id} ${item.title}`,
      `  Score: ${item.score}`,
      `  Path: ${item.path}`,
      `  Matched terms: ${item.matched_terms.join(", ") || "None"}`,
      `  Reasons: ${item.match_reasons.join(", ")}`,
      `  Graph paths: ${item.graph_expansion.length ? item.graph_expansion.map((path) => `${path.kind}:${path.via.join(" -> ")}`).join("; ") : "None"}`,
    ]),
  ].join("\n");
}

function renderSemanticEval(report: SemanticEvaluationReport): string {
  return [
    "# Jumpspace Semantic Eval",
    "",
    `Queries: ${report.query_count}`,
    `Active backend: ${report.active_backend?.active ?? "none"}`,
    `Hits: lexical ${report.summary.lexical_hits}, local ${report.summary.local_hits}, active ${report.summary.active_hits}`,
    "",
    ...report.results.flatMap((result) => [
      `- ${result.id}: ${result.query}`,
      `  Expected: ${result.expected_task_ids.join(", ")}`,
      `  Lexical: ${formatEvalBackend(result.lexical)}`,
      `  Local: ${formatEvalBackend(result.local)}`,
      `  Active: ${formatEvalBackend(result.active)}`,
    ]),
  ].join("\n");
}

function formatEvalBackend(result: SemanticEvaluationReport["results"][number]["active"]): string {
  return result.available
    ? `${result.backend} ${result.hit ? `hit@${result.expected_rank}` : "miss"} [${result.top_task_ids.join(", ")}]`
    : `${result.backend} unavailable (${result.reason ?? "not ready"})`;
}

function parseSemanticBackend(value: string | undefined): SemanticBackendPreference | undefined {
  if (!value) {
    return undefined;
  }
  if (value === "auto" || value === LOCAL_SEMANTIC_BACKEND || value === LANCEDB_ONNX_SEMANTIC_BACKEND || value === "lancedb+onnx") {
    return value;
  }
  throw new JumpspaceCommandError(commandError("UNKNOWN_SEMANTIC_BACKEND", `Unknown semantic backend: ${value}`));
}
