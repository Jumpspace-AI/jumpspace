import { describe, expect, it } from "vitest";
import {
  getExecutionState,
  getReadyTasks,
  renderExecutionPacket,
  renderPlanPacket,
  renderReadyTasks,
} from "./execution.js";
import type { JumpIndex } from "./types.js";

const index: JumpIndex = {
  version: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  tasks: [
    {
      id: "JS-001",
      title: "Parser",
      type: "spec",
      status: "implemented",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Parser",
      },
      spec: "Parse task blocks.",
      code: ["src/core/parseMarkdown.ts"],
      tests: ["src/core/parseMarkdown.test.ts"],
      depends_on: [],
    },
    {
      id: "JS-010",
      title: "Execution workflow",
      type: "spec",
      status: "approved",
      module: "core-cli",
      space: "repo",
      keywords: ["orchestration"],
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Execution workflow",
      },
      spec: "Plan and execute approved tasks.",
      code: ["src/commands/execute.ts"],
      tests: ["src/core/execution.test.ts"],
      depends_on: ["JS-001"],
    },
    {
      id: "JS-011",
      title: "Blocked workflow",
      type: "spec",
      status: "approved",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Blocked workflow",
      },
      spec: "Wait for dependencies.",
      code: ["src/commands/blocked.ts"],
      tests: ["src/core/blocked.test.ts"],
      depends_on: ["JS-012"],
    },
    {
      id: "JS-012",
      title: "Unfinished dependency",
      type: "spec",
      status: "proposed",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Unfinished dependency",
      },
      spec: "Needs approval.",
      code: [],
      tests: [],
      depends_on: [],
    },
  ],
};

describe("execution readiness", () => {
  it("marks approved tasks ready when dependencies are complete", () => {
    const state = getExecutionState(index, "JS-010");

    expect(state?.ready).toBe(true);
    expect(state?.blockers).toEqual([]);
  });

  it("blocks tasks with incomplete dependencies", () => {
    const state = getExecutionState(index, "JS-011");

    expect(state?.ready).toBe(false);
    expect(state?.blockers[0]).toMatchObject({
      type: "dependency",
      taskId: "JS-012",
      status: "proposed",
    });
  });

  it("lists ready approved tasks by default", () => {
    const states = getReadyTasks(index);

    expect(states.map((state) => state.task.id)).toEqual(["JS-010"]);
  });

  it("can include blocked approved tasks", () => {
    const states = getReadyTasks(index, { includeBlocked: true });

    expect(states.map((state) => state.task.id)).toEqual(["JS-010", "JS-011"]);
  });
});

describe("execution renderers", () => {
  it("renders a human approval packet", () => {
    const state = getExecutionState(index, "JS-012");
    expect(state).toBeDefined();

    const packet = renderPlanPacket(state!);

    expect(packet).toContain("# Jumpspace Plan Packet");
    expect(packet).toContain("Needs human approval");
    expect(packet).toContain("Change status to `approved`");
  });

  it("renders an agent execution packet", () => {
    const state = getExecutionState(index, "JS-010");
    expect(state).toBeDefined();

    const packet = renderExecutionPacket(state!);

    expect(packet).toContain("# Jumpspace Execution Packet");
    expect(packet).toContain("Ready for agent execution.");
    expect(packet).toContain("jumpspace task context JS-010");
  });

  it("renders the ready queue", () => {
    const table = renderReadyTasks(getReadyTasks(index, { includeBlocked: true }));

    expect(table).toContain("READY");
    expect(table).toContain("JS-010");
    expect(table).toContain("JS-011");
  });
});
