import { describe, expect, it } from "vitest";
import { renderTaskContext } from "./renderContext.js";
import type { JumpTask } from "./types.js";

describe("renderTaskContext", () => {
  it("renders an agent-ready packet with linked paths", () => {
    const task: JumpTask = {
      id: "JS-004",
      title: "Agent context packet",
      type: "spec",
      status: "implemented",
      module: "core-cli",
      space: "repo",
      keywords: ["agent", "packet"],
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Agent context packet",
      },
      spec: "Print a clean packet.",
      code: ["src/commands/context.ts", "src/core/renderContext.ts"],
      tests: ["src/core/renderContext.test.ts"],
      depends_on: ["JS-002"],
      refs: [
        {
          type: "related_to",
          id: "JS-005",
          note: "Context tells agents to run audit.",
        },
      ],
      plan: {
        task_id: "JS-004",
        goal: "Render context with plans.",
        status: "pending",
        steps: [
          {
            id: "render",
            outcome: "Plan appears in context.",
            status: "pending",
            depends_on: [],
            source_files: ["src/core/renderContext.ts"],
            tests: ["src/core/renderContext.test.ts"],
            checks: ["npm test"],
            evidence: [],
          },
        ],
      },
    };

    const packet = renderTaskContext(task);

    expect(packet).toContain("# Jumpspace Task Context");
    expect(packet).toContain("You are working on JS-004.");
    expect(packet).toContain("## Module\n\ncore-cli");
    expect(packet).toContain("## Space\n\nrepo");
    expect(packet).toContain("## Keywords\n\n- agent\n- packet");
    expect(packet).toContain("- src/core/renderContext.ts");
    expect(packet).toContain("- JS-002");
    expect(packet).toContain("- related_to: JS-005 - Context tells agents to run audit.");
    expect(packet).toContain("## Plan");
    expect(packet).toContain("Goal: Render context with plans.");
    expect(packet).toContain("Run `jumpspace task scan` and `jumpspace task audit` before finishing.");
  });
});
