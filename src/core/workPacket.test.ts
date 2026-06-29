import { describe, expect, it } from "vitest";
import { buildWorkPacket, renderWorkPacket } from "./workPacket.js";
import type { JumpIndex, JumpTask } from "./types.js";

describe("work packets", () => {
  it("builds a complete agent start packet for a ready pending task", () => {
    const dependency = makeTask({
      id: "JS-DEP",
      title: "Dependency",
      status: "implemented",
      plan: undefined,
    });
    const task = makeTask({
      depends_on: ["JS-DEP"],
      refs: [{ type: "informs", id: "ADR-001", note: "Use the approved architecture." }],
      plan: {
        task_id: "JS-100",
        goal: "Ship the work packet.",
        status: "in_progress",
        steps: [
          {
            id: "orient",
            outcome: "Context is understood.",
            status: "complete",
            depends_on: [],
            source_files: ["docs/specs/feature.md"],
            tests: [],
            checks: ["jumpspace context JS-100 --json"],
            evidence: ["Read task context."],
          },
          {
            id: "implement",
            outcome: "The command exists.",
            status: "pending",
            depends_on: ["orient"],
            source_files: ["src/commands/work.ts"],
            tests: ["src/cli.test.ts"],
            checks: ["npm test -- src/cli.test.ts"],
            evidence: [],
          },
          {
            id: "verify",
            outcome: "The checks pass.",
            status: "pending",
            depends_on: ["implement"],
            source_files: [],
            tests: [],
            checks: ["npm run build"],
            evidence: [],
          },
        ],
      },
    });
    const packet = buildWorkPacket(indexWith(task, dependency), "JS-100");

    expect(packet).toMatchObject({
      ok: true,
      packet_version: 1,
      task: { id: "JS-100" },
      intent: { title: "Work packet", status: "approved" },
      links: { code: ["src/feature.ts"], tests: ["src/feature.test.ts"] },
      acceptance_criteria: [{ id: "AC-1", description: "The packet is useful." }],
      next_steps: [{ id: "implement" }],
      dependencies: [{ id: "JS-DEP" }],
      refs: [{ id: "ADR-001" }],
      required_checks: ["npm test -- src/cli.test.ts"],
      mutation_history: {
        total: 0,
        returned: 0,
        filters: { task_id: "JS-100", limit: 5 },
        entries: [],
      },
      drift: { requested: false, since: null, facts: [], warnings: [] },
      schemas: { packet: "work", failures: "error", context: "context", audit: "audit", drift: "drift", history: "history" },
      next_action: "Work on pending unblocked step: implement.",
    });

    if (packet.ok) {
      expect(packet.guardrails.join("\n")).toContain("jumpspace verify");
      expect(renderWorkPacket(packet)).toContain("# Jumpspace Work Packet");
      expect(renderWorkPacket(packet)).toContain("Work on pending unblocked step: implement.");
      expect(renderWorkPacket(packet)).toContain("## Recent History");
    }
  });

  it("renders bounded mutation history in the packet", () => {
    const task = makeTask();
    const packet = buildWorkPacket(indexWith(task), "JS-100", {
      mutationHistory: {
        history_path: ".jumpspace/mutations.jsonl",
        total: 2,
        returned: 1,
        filters: { task_id: "JS-100", limit: 1 },
        entries: [
          {
            version: 1,
            command: "step complete",
            recorded_at: "2026-06-26T00:00:00.000Z",
            touched_files: ["docs/specs/feature.md", ".jumpspace/index.json"],
            task_ids: ["JS-100"],
            config_changes: [],
            index_changed: true,
            warnings: [],
          },
        ],
      },
    });

    expect(packet).toMatchObject({
      ok: true,
      mutation_history: {
        total: 2,
        returned: 1,
        entries: [{ command: "step complete" }],
      },
    });
    if (packet.ok) {
      expect(renderWorkPacket(packet)).toContain("Showing 1 of 2 task-specific mutation entries.");
      expect(renderWorkPacket(packet)).toContain("step complete");
    }
  });

  it("returns structured errors for unknown tasks and missing plans", () => {
    expect(buildWorkPacket(indexWith(makeTask()), "NOPE")).toMatchObject({
      ok: false,
      errors: [{ code: "UNKNOWN_TASK", taskId: "NOPE" }],
    });

    expect(buildWorkPacket(indexWith(makeTask({ plan: undefined })), "JS-100")).toMatchObject({
      ok: false,
      errors: [{ code: "MISSING_PLAN", taskId: "JS-100" }],
    });
  });

  it("rejects invalid plan state before producing a packet", () => {
    const task = makeTask({
      plan: {
        task_id: "JS-100",
        goal: "Invalid.",
        status: "pending",
        steps: [
          {
            id: "done",
            outcome: "Finished without evidence.",
            status: "complete",
            depends_on: [],
            source_files: [],
            tests: [],
            checks: [],
            evidence: [],
          },
        ],
      },
    });

    expect(buildWorkPacket(indexWith(task), "JS-100")).toMatchObject({
      ok: false,
      errors: [{ code: "COMPLETED_PLAN_STEP_WITHOUT_EVIDENCE", taskId: "JS-100", stepId: "done" }],
    });
  });

  it("requires execution-ready task status and completed dependencies", () => {
    const task = makeTask({ depends_on: ["JS-DEP"] });
    const dependency = makeTask({
      id: "JS-DEP",
      title: "Dependency",
      status: "approved",
      plan: undefined,
    });

    expect(buildWorkPacket(indexWith(task, dependency), "JS-100")).toMatchObject({
      ok: false,
      errors: [{ code: "WORK_BLOCKED", taskId: "JS-DEP" }],
    });

    expect(buildWorkPacket(indexWith(makeTask({ status: "draft" })), "JS-100")).toMatchObject({
      ok: false,
      errors: [{ code: "WORK_BLOCKED", taskId: "JS-100" }],
    });
  });
});

function indexWith(...tasks: JumpTask[]): JumpIndex {
  return {
    version: 1,
    generatedAt: "2026-06-25T00:00:00.000Z",
    tasks,
  };
}

function makeTask(overrides: Partial<JumpTask> = {}): JumpTask {
  return {
    id: "JS-100",
    title: "Work packet",
    type: "spec",
    status: "approved",
    module: "agents",
    space: "repo",
    keywords: ["work", "packet"],
    doc: { path: "docs/specs/feature.md", heading: "Work packet" },
    spec: "Give agents a grounded packet before editing.",
    code: ["src/feature.ts"],
    tests: ["src/feature.test.ts"],
    depends_on: [],
    refs: [],
    acceptance_criteria: [{ id: "AC-1", description: "The packet is useful." }],
    plan: {
      task_id: "JS-100",
      goal: "Ship the work packet.",
      status: "pending",
      steps: [
        {
          id: "implement",
          outcome: "The command exists.",
          status: "pending",
          depends_on: [],
          source_files: ["src/commands/work.ts"],
          tests: ["src/cli.test.ts"],
          checks: ["npm test -- src/cli.test.ts"],
          evidence: [],
        },
      ],
    },
    ...overrides,
  };
}
