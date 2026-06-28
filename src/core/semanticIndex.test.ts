import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { auditJumpspace } from "../commands/audit.js";
import { runScan } from "../commands/scan.js";
import { writeConfig } from "./config.js";
import {
  DEFAULT_SEMANTIC_INDEX_PATH,
  LANCEDB_ONNX_SEMANTIC_BACKEND,
  buildSemanticIndex,
  evaluateSemanticRetrieval,
  expandSemanticGraph,
  readSemanticIndex,
  searchSemanticIndex,
  semanticIndexStatus,
  writeSemanticIndex,
  type SemanticEmbeddingProvider,
} from "./semanticIndex.js";
import type { JumpIndex } from "./types.js";

const index: JumpIndex = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  tasks: [
    {
      id: "AUTH-001",
      title: "Password guidance",
      type: "spec",
      status: "implemented",
      space: "repo",
      keywords: ["signin"],
      doc: {
        path: "docs/auth.md",
        heading: "Password guidance",
      },
      spec: "The sign-in form explains secret entry requirements before credentials are submitted.",
      code: ["src/auth.ts"],
      tests: ["src/auth.test.ts"],
      depends_on: [],
      refs: [],
    },
    {
      id: "DRIFT-001",
      title: "Path drift repair",
      type: "spec",
      status: "implemented",
      space: "repo",
      doc: {
        path: "docs/drift.md",
        heading: "Path drift repair",
      },
      spec: "Renamed linked files are repaired and deleted files become explicit gaps.",
      code: ["src/repair.ts"],
      tests: ["src/repair.test.ts"],
      depends_on: [],
      refs: [],
    },
  ],
};

describe("semantic index", () => {
  it("builds and searches local task-vector evidence with conceptual aliases", async () => {
    const semanticIndex = await buildSemanticIndex(index, {
      indexPath: ".jumpspace/index.json",
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(semanticIndex.documents).toHaveLength(2);
    expect(semanticIndex.backend.active).toBe("local-task-vector-v1");

    const results = await searchSemanticIndex(semanticIndex, "How does auth password login work?");

    expect(results[0]).toMatchObject({
      task_id: "AUTH-001",
      match_reasons: expect.arrayContaining(["local-task-vector-v1"]),
    });
    expect(results[0].matched_terms).toEqual(expect.arrayContaining(["auth", "password"]));
  });

  it("expands semantic matches through task graph relationships", async () => {
    const graphIndex: JumpIndex = {
      version: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      tasks: [
        {
          id: "RET-NEW",
          title: "Task vector graph retrieval",
          type: "spec",
          status: "approved",
          module: "retrieval",
          space: "module",
          keywords: ["semantic", "graph"],
          doc: { path: "docs/retrieval.md", heading: "Task vector graph retrieval" },
          spec: "Semantic matches expand through graph relationships.",
          code: ["src/retrieval.ts"],
          tests: ["src/retrieval.test.ts"],
          depends_on: ["RET-DEP"],
          refs: [
            { type: "related_to", id: "RET-QUERY" },
            { type: "supersedes", id: "RET-OLD" },
          ],
        },
        task("RET-DEP", "Retrieval dependency", { module: "foundation", space: "module" }),
        { ...task("RET-DEPENDENT", "Retrieval dependent", { module: "retrieval", space: "module" }), depends_on: ["RET-NEW"] },
        { ...task("RET-INBOUND", "Inbound reference", { module: "graph", space: "module" }), refs: [{ type: "related_to", id: "RET-NEW" }] },
        { ...task("RET-QUERY", "Graph query", { module: "graph", space: "module" }), spec: "Graph query explains connected task evidence." },
        { ...task("RET-OLD", "Old retrieval", { module: "retrieval", space: "module" }), refs: [{ type: "supersedes", id: "RET-OLDER" }] },
        task("RET-OLDER", "Older retrieval", { module: "retrieval", space: "module" }),
        task("RET-MODULE", "Retrieval module peer", { module: "retrieval", space: "other" }),
        task("RET-SPACE", "Retrieval space peer", { module: "different", space: "module" }),
      ],
    };
    const semanticIndex = await buildSemanticIndex(graphIndex);

    const expansion = expandSemanticGraph(semanticIndex, "RET-NEW", { limit: 20 });
    const paths = expansion.paths.map((path) => ({
      kind: path.kind,
      to: path.to,
      ref_type: path.ref_type,
      value: path.value,
      via: path.via,
    }));

    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "dependency", to: "RET-DEP", via: ["RET-NEW", "RET-DEP"] }),
        expect.objectContaining({ kind: "dependent", to: "RET-DEPENDENT", via: ["RET-NEW", "RET-DEPENDENT"] }),
        expect.objectContaining({ kind: "ref", to: "RET-QUERY", ref_type: "related_to" }),
        expect.objectContaining({ kind: "referenced_by", to: "RET-INBOUND", ref_type: "related_to" }),
        expect.objectContaining({ kind: "supersedes", to: "RET-OLD", ref_type: "supersedes" }),
        expect.objectContaining({ kind: "supersession_chain", to: "RET-OLDER", via: ["RET-NEW", "RET-OLD", "RET-OLDER"] }),
        expect.objectContaining({ kind: "module", to: "RET-DEPENDENT", value: "retrieval" }),
        expect.objectContaining({ kind: "space", to: "RET-DEP", value: "module" }),
      ]),
    );

    const result = (await searchSemanticIndex(semanticIndex, "semantic graph retrieval")).find((item) => item.task_id === "RET-NEW");

    expect(result).toMatchObject({
      graph_expansion: expect.arrayContaining([expect.objectContaining({ kind: "dependency", to: "RET-DEP" })]),
      connected_tasks: expect.arrayContaining([expect.objectContaining({ task_id: "RET-QUERY", relation: "ref" })]),
      match_reasons: expect.arrayContaining(["graph:dependency", "graph:ref", "graph:supersedes"]),
    });
  });

  it("selects an explicit dense local embedding provider without making optional packages required", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-semantic-dense-"));
    const provider = fakeDenseProvider();
    const semanticIndex = await buildSemanticIndex(index, {
      root,
      backend: "lancedb+onnx",
      model: "fixture/model",
      storePath: ".jumpspace/test-lancedb",
      embeddingProvider: provider,
      optionalDependencies: {
        lancedb: true,
        onnx: true,
      },
    });

    expect(semanticIndex.backend).toMatchObject({
      active: LANCEDB_ONNX_SEMANTIC_BACKEND,
      selected: LANCEDB_ONNX_SEMANTIC_BACKEND,
      degraded: false,
      model: {
        name: "fixture/model",
        source: "provider",
        dimensions: 4,
      },
      vector_kind: "dense_embedding",
      store: {
        kind: "lancedb",
        path: ".jumpspace/test-lancedb",
        table: "jumpspace_tasks",
        available: true,
      },
    });
    expect(semanticIndex.documents[0]).toMatchObject({
      vector_kind: "dense_embedding",
      vector_dimensions: 4,
    });

    const stored = JSON.parse(await fs.readFile(path.join(root, ".jumpspace", "test-lancedb", "jumpspace_tasks.json"), "utf8"));
    expect(stored).toHaveLength(2);

    const results = await searchSemanticIndex(semanticIndex, "auth password login", {
      embeddingProvider: provider,
    });

    expect(results[0]).toMatchObject({
      task_id: "AUTH-001",
      match_reasons: expect.arrayContaining([LANCEDB_ONNX_SEMANTIC_BACKEND, "model:fixture/model"]),
    });
  });

  it("falls back to deterministic vectors when dense backend dependencies are unavailable", async () => {
    const semanticIndex = await buildSemanticIndex(index, {
      backend: "lancedb+onnx",
      optionalDependencies: {
        lancedb: false,
        onnx: false,
      },
    });

    expect(semanticIndex.backend).toMatchObject({
      active: "local-task-vector-v1",
      selected: LANCEDB_ONNX_SEMANTIC_BACKEND,
      degraded: true,
    });
    expect(semanticIndex.backend.reason).toContain("optional LanceDB/ONNX dependencies are not both installed");
  });

  it("evaluates lexical, deterministic vector, and active semantic recall", async () => {
    const evalIndex: JumpIndex = {
      version: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      tasks: [
        {
          id: "JS-012",
          title: "Hybrid semantic retrieval",
          type: "spec",
          status: "implemented",
          module: "retrieval",
          space: "repo",
          keywords: ["semantic", "retrieval"],
          doc: { path: "docs/retrieval.md", heading: "Hybrid semantic retrieval" },
          spec: "Ask uses conceptual evidence retrieval over task vectors.",
          code: [],
          tests: [],
          depends_on: [],
          refs: [],
        },
        {
          id: "JS-024",
          title: "Task-vector graph retrieval",
          type: "spec",
          status: "implemented",
          module: "retrieval",
          space: "repo",
          keywords: ["graph", "expansion"],
          doc: { path: "docs/retrieval.md", heading: "Task-vector graph retrieval" },
          spec: "Task matches expand through explicit graph relationships.",
          code: [],
          tests: [],
          depends_on: ["JS-012"],
          refs: [],
        },
      ],
    };
    const activeIndex = await buildSemanticIndex(evalIndex);
    const report = await evaluateSemanticRetrieval(evalIndex, { activeIndex });

    expect(report).toMatchObject({
      ok: true,
      query_count: 1,
      summary: {
        local_hits: 1,
        active_hits: 1,
      },
    });
    expect(report.results[0]).toMatchObject({
      id: "conceptual-retrieval",
      expected_task_ids: ["JS-012", "JS-024"],
      local: expect.objectContaining({ hit: true }),
      active: expect.objectContaining({ hit: true }),
    });
  });

  it("writes, reads, and reports ready semantic index status when enabled", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-semantic-"));
    const semanticIndex = await buildSemanticIndex(index);

    await writeSemanticIndex(root, DEFAULT_SEMANTIC_INDEX_PATH, semanticIndex);

    expect(await readSemanticIndex(root)).toMatchObject({
      version: 1,
      source_index: {
        task_count: 2,
      },
    });

    const status = await semanticIndexStatus(root, index, {
      docs: ["docs/**/*.md"],
      indexPath: ".jumpspace/index.json",
      semanticIndex: {
        enabled: true,
      },
    });

    expect(status).toMatchObject({
      enabled: true,
      exists: true,
      ready: true,
      stale: false,
      issues: [],
    });
  });

  it("warns when semantic retrieval is enabled but the generated index is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-semantic-"));

    const status = await semanticIndexStatus(root, index, {
      docs: ["docs/**/*.md"],
      indexPath: ".jumpspace/index.json",
      semanticIndex: {
        enabled: true,
      },
    });

    expect(status.ready).toBe(false);
    expect(status.issues).toContainEqual(expect.objectContaining({ code: "MISSING_SEMANTIC_INDEX" }));
  });

  it("adds non-blocking audit warnings for stale semantic indexes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-semantic-"));
    await writeConfig(root, {
      docs: ["docs/**/*.md"],
      indexPath: ".jumpspace/index.json",
      semanticIndex: {
        enabled: true,
      },
    });
    await write(
      root,
      "docs/spec.md",
      `# Spec

## Semantic task

<!-- jumpspace
id: JS-100
type: spec
status: draft
code: []
tests: []
depends_on: []
-->

Original evidence.
`,
    );
    await runScan({ root, writeLine: () => {}, errorLine: () => {} });
    const scanned = JSON.parse(await fs.readFile(path.join(root, ".jumpspace", "index.json"), "utf8")) as JumpIndex;
    await writeSemanticIndex(root, DEFAULT_SEMANTIC_INDEX_PATH, await buildSemanticIndex(scanned));
    await fs.appendFile(path.join(root, "docs", "spec.md"), "\nNew evidence changes the source hash.\n");
    await runScan({ root, writeLine: () => {}, errorLine: () => {} });

    const audit = await auditJumpspace(root);

    expect(audit.ok).toBe(true);
    expect(audit.issues).toContainEqual(expect.objectContaining({ severity: "warning", code: "STALE_SEMANTIC_INDEX" }));
  });
});

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

function task(id: string, title: string, options: { module?: string; space?: "repo" | "module" | "global" } = {}) {
  return {
    id,
    title,
    type: "spec" as const,
    status: "approved" as const,
    module: options.module,
    space: options.space ?? "repo",
    doc: { path: "docs/retrieval.md", heading: title },
    spec: `${title} supports semantic graph retrieval.`,
    code: [],
    tests: [],
    depends_on: [],
    refs: [],
  };
}

function fakeDenseProvider(): SemanticEmbeddingProvider {
  return {
    backend: LANCEDB_ONNX_SEMANTIC_BACKEND,
    model: "fixture/model",
    dimensions: 4,
    async embed(texts: string[]) {
      return texts.map((text) => {
        const normalized = text.toLowerCase();
        return [
          normalized.includes("auth") || normalized.includes("password") || normalized.includes("login") ? 1 : 0,
          normalized.includes("drift") || normalized.includes("repair") ? 1 : 0,
          normalized.includes("graph") || normalized.includes("semantic") ? 1 : 0,
          0.1,
        ];
      });
    },
    async store(root, storePath, rows) {
      const filePath = path.join(root, storePath, "jumpspace_tasks.json");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(rows, null, 2));
      return {
        kind: "lancedb",
        path: storePath,
        table: "jumpspace_tasks",
        available: true,
      };
    },
  };
}
