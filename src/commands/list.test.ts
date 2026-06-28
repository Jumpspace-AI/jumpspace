import { describe, expect, it } from "vitest";
import { filterTasks } from "../core/filterTasks.js";
import { formatTaskTable } from "./list.js";
import type { JumpIndex } from "../core/types.js";

const index: JumpIndex = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  tasks: [
    {
      id: "JS-001",
      title: "Parser",
      type: "spec",
      status: "implemented",
      module: "core-schema",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Parser",
      },
      spec: "Parse blocks.",
      code: ["src/core/parseMarkdown.ts"],
      tests: ["src/core/parseMarkdown.test.ts"],
      depends_on: [],
    },
    {
      id: "JS-007",
      title: "Documentation",
      type: "engineering",
      status: "implemented",
      module: "docs",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Documentation",
      },
      spec: "Write docs.",
      code: ["README.md"],
      tests: [],
      depends_on: ["JS-001"],
    },
  ],
};

describe("list helpers", () => {
  it("formats a readable task table", () => {
    const table = formatTaskTable(index.tasks);

    expect(table).toContain("ID");
    expect(table).toContain("STATUS");
    expect(table).toContain("MODULE");
    expect(table).toContain("SPACE");
    expect(table).toContain("core-schema");
    expect(table).toContain("JS-001");
    expect(table).toContain("Documentation");
  });

  it("filters by status and type", () => {
    const tasks = filterTasks(index, {
      status: "implemented",
      type: "engineering",
      module: "docs",
      space: "repo",
    });

    expect(tasks.map((task) => task.id)).toEqual(["JS-007"]);
  });

  it("formats an empty result clearly", () => {
    expect(formatTaskTable([])).toContain("No tasks found.");
  });
});
