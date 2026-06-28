import { describe, expect, it } from "vitest";
import { formatTaskRelations, getTaskRelations } from "./taskRelations.js";
import type { JumpIndex } from "./types.js";

const index: JumpIndex = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  tasks: [
    {
      id: "JS-002",
      title: "Repo-local index generation",
      type: "spec",
      status: "implemented",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Repo-local index generation",
      },
      spec: "Create an index.",
      code: ["src/commands/scan.ts"],
      tests: ["src/core/indexTasks.test.ts"],
      depends_on: [],
    },
    {
      id: "JS-004",
      title: "Agent context packet",
      type: "spec",
      status: "implemented",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Agent context packet",
      },
      spec: "Print context.",
      code: ["src/commands/context.ts"],
      tests: ["src/core/renderContext.test.ts"],
      depends_on: ["JS-002"],
      refs: [
        {
          type: "related_to",
          id: "JS-005",
          note: "Mentions audit.",
        },
      ],
    },
    {
      id: "JS-005",
      title: "Audit command",
      type: "spec",
      status: "implemented",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Audit command",
      },
      spec: "Validate tasks.",
      code: ["src/commands/audit.ts"],
      tests: ["src/core/validateTasks.test.ts"],
      depends_on: ["JS-002"],
    },
  ],
};

describe("getTaskRelations", () => {
  it("builds outbound and inbound task relationships", () => {
    const summary = getTaskRelations(index, "JS-002");

    expect(summary?.dependencies).toEqual([]);
    expect(summary?.dependents.map((task) => task.id)).toEqual(["JS-004", "JS-005"]);
  });

  it("includes structured refs and inbound structured refs", () => {
    const summary = getTaskRelations(index, "JS-005");

    expect(summary?.referencedBy[0]).toMatchObject({
      task: {
        id: "JS-004",
      },
      ref: {
        type: "related_to",
        id: "JS-005",
      },
    });
  });
});

describe("formatTaskRelations", () => {
  it("formats related task sections", () => {
    const summary = getTaskRelations(index, "JS-004");
    expect(summary).toBeDefined();

    const output = formatTaskRelations(summary!);

    expect(output).toContain("# Related tasks for JS-004");
    expect(output).toContain("## Dependencies");
    expect(output).toContain("- JS-002 Repo-local index generation");
    expect(output).toContain("related_to: JS-005 Audit command - Mentions audit.");
  });
});
