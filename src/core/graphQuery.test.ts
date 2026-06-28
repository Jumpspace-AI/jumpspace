import { describe, expect, it } from "vitest";
import { runGraphQuery } from "./graphQuery.js";
import type { JumpIndex } from "./types.js";

const index: JumpIndex = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  tasks: [
    {
      id: "ADR-0017",
      title: "Metric library decision",
      type: "adr",
      status: "implemented",
      module: "metrics",
      space: "repo",
      doc: {
        path: "docs/adr/0017.md",
        heading: "Metric library decision",
      },
      spec: "Choose the metric library.",
      code: ["docs/adr/0017.md"],
      tests: [],
      depends_on: [],
      refs: [],
    },
    {
      id: "MET-001",
      title: "Metric library extraction",
      type: "spec",
      status: "approved",
      module: "metrics",
      space: "repo",
      doc: {
        path: "docs/specs/metrics.md",
        heading: "Metric library extraction",
      },
      spec: "Extract metrics with the library.",
      code: ["src/metrics/library.ts"],
      tests: [],
      depends_on: ["ADR-0017"],
      refs: [
        {
          type: "implements",
          id: "ADR-0017",
        },
      ],
      acceptance_criteria: [
        {
          id: "AC-1",
          description: "Metrics are extracted.",
        },
      ],
    },
    {
      id: "MET-002",
      title: "Metric QA",
      type: "spec",
      status: "verified",
      module: "metrics",
      space: "repo",
      doc: {
        path: "docs/specs/metrics-qa.md",
        heading: "Metric QA",
      },
      spec: "QA metrics.",
      code: ["src/metrics/qa.ts"],
      tests: ["src/metrics/qa.test.ts"],
      depends_on: ["MET-001"],
      refs: [
        {
          type: "related_to",
          id: "ADR-0017",
        },
      ],
      verification_records: [
        {
          id: "verify-1",
          verified_at: "2026-01-01T00:00:00.000Z",
          commit: "abc123",
          checks: [
            {
              command: "npm test",
              exit_code: 0,
            },
          ],
          acceptance_criteria_covered: ["AC-1"],
          evidence: ["Tests passed."],
        },
      ],
    },
    {
      id: "GAP-001",
      title: "Rotten link follow-up",
      type: "spec",
      status: "partial",
      module: "maintenance",
      space: "repo",
      doc: {
        path: "docs/specs/gap.md",
        heading: "Rotten link follow-up",
      },
      spec: "Needs relink.",
      code: [],
      tests: [],
      gaps: ["Linked code file was deleted."],
      depends_on: [],
      refs: [],
    },
  ],
};

describe("runGraphQuery", () => {
  it("answers tasks depending on an ADR with no tests linked", () => {
    const result = runGraphQuery(index, {
      dependsOnTransitive: ["ADR-0017"],
      testPresence: "none",
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.results.map((item) => item.task.id) : []).toEqual(["MET-001"]);
    expect(result.ok ? result.results[0].matched_graph_paths : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "depends_on_transitive",
          from: "MET-001",
          to: "ADR-0017",
          via: ["MET-001", "ADR-0017"],
        }),
        expect.objectContaining({
          kind: "field",
          field: "tests",
          value: "none",
        }),
      ]),
    );
  });

  it("filters refs, linked paths, acceptance criteria, verification, and gaps", () => {
    expect(
      runGraphQuery(index, {
        refs: [{ type: "implements", id: "ADR-0017" }],
        codePaths: ["metrics/library"],
        acceptanceCriteria: ["AC-1"],
      }),
    ).toMatchObject({
      ok: true,
      results: [{ task: { id: "MET-001" } }],
    });

    expect(
      runGraphQuery(index, {
        verification: "has-records",
        testPresence: "any",
      }),
    ).toMatchObject({
      ok: true,
      results: [{ task: { id: "MET-002" } }],
    });

    expect(
      runGraphQuery(index, {
        gapPresence: "any",
      }),
    ).toMatchObject({
      ok: true,
      results: [{ task: { id: "GAP-001" } }],
    });
  });

  it("supports deterministic where predicates", () => {
    const result = runGraphQuery(index, {
      where: ["module=metrics", "tests=none", "depends_on=ADR-0017"],
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.query.filters : []).toEqual(
      expect.arrayContaining([
        { field: "module", op: "=", value: "metrics" },
        { field: "tests", op: "=", value: "none" },
        { field: "depends_on", op: "=", value: "ADR-0017" },
      ]),
    );
    expect(result.ok ? result.results.map((item) => item.task.id) : []).toEqual(["MET-001"]);
  });

  it("returns structured errors for invalid graph query constraints", () => {
    const result = runGraphQuery(index, {
      statuses: ["done"],
      dependsOn: ["NOPE"],
      refs: [{ type: "unknown" as never, id: "ADR-0017" }],
      where: ["bogus=value"],
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_QUERY_VALUE", path: "status" }),
        expect.objectContaining({ code: "UNKNOWN_TASK", taskId: "NOPE" }),
        expect.objectContaining({ code: "UNSUPPORTED_REF_TYPE" }),
        expect.objectContaining({ code: "UNKNOWN_QUERY_FIELD", path: "bogus" }),
      ]),
    );
  });

  it("reports unanswered constraints when no result satisfies a valid filter", () => {
    const result = runGraphQuery(index, {
      modules: ["metrics"],
      gapPresence: "any",
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.results : []).toEqual([]);
    expect(result.ok ? result.unanswered_constraints : []).toEqual(
      expect.arrayContaining([
        { field: "module", op: "=", value: "metrics" },
        { field: "gaps", op: "=", value: "any" },
      ]),
    );
  });
});
