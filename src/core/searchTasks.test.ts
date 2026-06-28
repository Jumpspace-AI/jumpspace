import { describe, expect, it } from "vitest";
import { findTasks, formatSearchResults } from "./searchTasks.js";
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
      keywords: ["ingest", "ingestion"],
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Repo-local index generation",
      },
      spec: "The scan command creates an index from Markdown task blocks.",
      code: ["src/commands/scan.ts", "src/core/indexTasks.ts"],
      tests: ["src/core/indexTasks.test.ts"],
      depends_on: ["JS-001"],
    },
    {
      id: "JS-004",
      title: "Agent context packet",
      type: "spec",
      status: "implemented",
      module: "core-cli",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Agent context packet",
      },
      spec: "Print an agent-ready packet.",
      code: ["src/commands/context.ts"],
      tests: ["src/core/renderContext.test.ts"],
      depends_on: ["JS-002"],
    },
  ],
};

describe("findTasks", () => {
  it("searches indexed task metadata and linked paths", () => {
    const results = findTasks(index, "indexTasks");

    expect(results.map((result) => result.task.id)).toEqual(["JS-002"]);
    expect(results[0].matchedFields).toContain("code");
  });

  it("searches task keywords for product vocabulary", () => {
    const results = findTasks(index, "ingest");

    expect(results.map((result) => result.task.id)).toEqual(["JS-002"]);
    expect(results[0].matchedFields).toContain("keywords");
  });

  it("requires every query term to match somewhere in a task", () => {
    const results = findTasks(index, "agent packet");

    expect(results.map((result) => result.task.id)).toEqual(["JS-004"]);
    expect(results[0].matchedFields).toContain("title");
    expect(results[0].matchedTerms).toEqual(["agent", "packet"]);
  });

  it("can match any query term without changing the default strict mode", () => {
    expect(findTasks(index, "agent missing").map((result) => result.task.id)).toEqual([]);

    const results = findTasks(index, "agent missing", { mode: "any" });

    expect(results.map((result) => result.task.id)).toEqual(["JS-004"]);
    expect(results[0].matchedTerms).toEqual(["agent"]);
    expect(results[0].unmatchedTerms).toEqual(["missing"]);
  });

  it("honors task filters", () => {
    const results = findTasks(index, "implemented", { module: "core-cli" });

    expect(results.map((result) => result.task.id)).toEqual(["JS-004"]);
  });
});

describe("formatSearchResults", () => {
  it("formats a readable result table", () => {
    const table = formatSearchResults(findTasks(index, "agent"));

    expect(table).toContain("MATCHES");
    expect(table).toContain("JS-004");
    expect(table).toContain("Agent context packet");
  });
});
