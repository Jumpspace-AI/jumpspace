import { describe, expect, it } from "vitest";
import { summarizeQuestionEvidence } from "./ask.js";
import { buildSemanticIndex } from "./semanticIndex.js";
import type { JumpIndex } from "./types.js";

const index: JumpIndex = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  tasks: [
    {
      id: "JS-200",
      title: "Password prompt",
      type: "spec",
      status: "implemented",
      space: "repo",
      doc: {
        path: "docs/specs/auth.md",
        heading: "Password prompt",
      },
      spec: "The sign-in form displays password guidance before a person can enter the password.",
      code: ["src/auth.ts"],
      tests: ["src/auth.test.ts"],
      depends_on: [],
    },
  ],
};

describe("summarizeQuestionEvidence", () => {
  it("returns an evidence summary with coverage and unanswered terms", async () => {
    const summary = await summarizeQuestionEvidence(index, "How does a user know to enter their password?");

    expect(summary.retrieval_mode).toBe("any");
    expect(summary.evidence[0]).toMatchObject({
      task_id: "JS-200",
      path: "docs/specs/auth.md",
      match_reasons: expect.arrayContaining(["spec"]),
      linked_code: ["src/auth.ts"],
      linked_tests: ["src/auth.test.ts"],
    });
    expect(summary.coverage.matched_terms).toContain("password");
    expect(summary.coverage.unanswered_terms).toContain("know");
  });

  it("includes graph expansion paths for hybrid semantic evidence", async () => {
    const graphIndex: JumpIndex = {
      version: 1,
      generatedAt: "2026-01-01T00:00:00.000Z",
      tasks: [
        {
          id: "RET-001",
          title: "Semantic retrieval",
          type: "spec",
          status: "implemented",
          module: "retrieval",
          space: "repo",
          doc: {
            path: "docs/retrieval.md",
            heading: "Semantic retrieval",
          },
          spec: "Hybrid semantic retrieval connects task vector matches to graph query evidence.",
          code: ["src/retrieval.ts"],
          tests: ["src/retrieval.test.ts"],
          depends_on: ["GRAPH-001"],
          refs: [{ type: "related_to", id: "ASK-001" }],
        },
        {
          id: "GRAPH-001",
          title: "Graph query",
          type: "spec",
          status: "implemented",
          space: "repo",
          doc: {
            path: "docs/graph.md",
            heading: "Graph query",
          },
          spec: "Graph query explains task relationships.",
          code: [],
          tests: [],
          depends_on: [],
        },
        {
          id: "ASK-001",
          title: "Ask evidence",
          type: "spec",
          status: "implemented",
          space: "repo",
          doc: {
            path: "docs/ask.md",
            heading: "Ask evidence",
          },
          spec: "Ask returns evidence summaries.",
          code: [],
          tests: [],
          depends_on: [],
        },
      ],
    };
    const semanticIndex = await buildSemanticIndex(graphIndex);

    const summary = await summarizeQuestionEvidence(graphIndex, "semantic graph evidence", {
      semantic: {
        status: {
          enabled: true,
          path: ".jumpspace/semantic-index.json",
          exists: true,
          ready: true,
          stale: false,
          issues: [],
          index: semanticIndex,
        },
        index: semanticIndex,
      },
    });

    expect(summary.retrieval_mode).toBe("hybrid");
    expect(summary.evidence[0]).toMatchObject({
      task_id: "RET-001",
      graph_expansion: expect.arrayContaining([
        expect.objectContaining({ kind: "dependency", to: "GRAPH-001" }),
        expect.objectContaining({ kind: "ref", to: "ASK-001" }),
      ]),
      connected_tasks: expect.arrayContaining([
        expect.objectContaining({ task_id: "GRAPH-001", relation: "dependency" }),
        expect.objectContaining({ task_id: "ASK-001", relation: "ref" }),
      ]),
    });
  });
});
