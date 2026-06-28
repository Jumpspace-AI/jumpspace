import { describe, expect, it } from "vitest";
import { buildHandoffPacket } from "./handoff.js";
import type { DoctorReport } from "./doctor.js";
import type { MutationHistoryReport } from "./mutations.js";
import type { JumpIndex, JumpIssue } from "./types.js";

describe("handoff packets", () => {
  it("summarizes recent mutations, health, task next steps, and suggested commands", () => {
    const packet = buildHandoffPacket({
      index: fixtureIndex(),
      auditIssues: [
        {
          severity: "warning",
          code: "STALE_SEMANTIC_INDEX",
          path: ".jumpspace/semantic-index.json",
          message: "Semantic index is stale.",
        },
      ],
      doctor: fixtureDoctor({
        suggestions: [
          {
            code: "RUN_SCAN",
            message: "Refresh the generated index.",
            command: "jumpspace scan",
          },
        ],
      }),
      mutationHistory: fixtureHistory(),
      lastMutation: fixtureHistory().entries[0],
      taskId: "JS-100",
      limit: 2,
      generatedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(packet).toMatchObject({
      ok: true,
      packet_version: 1,
      generated_at: "2026-06-26T00:00:00.000Z",
      status: "attention",
      filters: {
        task_id: "JS-100",
        limit: 2,
      },
      summary: {
        audit_errors: 0,
        audit_warnings: 1,
        doctor_suggestions: 1,
        mutations_returned: 2,
        touched_files: 3,
        task_ids: 1,
        config_changes: 1,
        mutation_warnings: 1,
      },
      task: {
        id: "JS-100",
        plan_status: "in_progress",
        execution_ready: true,
        pending_step_ids: ["implement"],
        required_checks: ["npm test"],
      },
    });
    expect(packet.touched_files).toEqual(["README.md", "docs/specs/feature.md", "src/feature.ts"]);
    expect(packet.suggested_commands).toEqual(
      expect.arrayContaining([
        "jumpspace scan",
        "jumpspace semantic build --json",
        "jumpspace audit --json",
        "jumpspace doctor --json",
        "jumpspace schema coverage --json",
        "jumpspace context JS-100 --json",
        "jumpspace plan validate JS-100 --json",
        "jumpspace next JS-100 --json",
        "jumpspace release doctor --json",
      ]),
    );
    expect(packet.schemas).toMatchObject({
      packet: "handoff",
      failures: "error",
      history: "history",
    });
  });

  it("marks packets blocked when audit has blocking errors", () => {
    const auditError: JumpIssue = {
      severity: "error",
      code: "STALE_INDEX",
      path: ".jumpspace/index.json",
      message: "Index is stale.",
    };
    const packet = buildHandoffPacket({
      index: fixtureIndex(),
      auditIssues: [auditError],
      doctor: fixtureDoctor({ ok: false, errors: [auditError] }),
      mutationHistory: fixtureHistory(),
      taskId: "JS-100",
    });

    expect(packet.ok).toBe(false);
    expect(packet.status).toBe("blocked");
    expect(packet.health.audit.errors).toEqual([auditError]);
  });

  it("does not mark completed implemented tasks attention-only because execute is closed", () => {
    const index = fixtureIndex();
    const task = index.tasks[0];
    index.tasks[0] = {
      ...task,
      status: "implemented",
      plan: {
        ...task.plan!,
        status: "complete",
        steps: task.plan!.steps.map((step) => ({
          ...step,
          status: "complete",
          evidence: step.evidence.length > 0 ? step.evidence : ["Done."],
        })),
      },
    };
    const packet = buildHandoffPacket({
      index,
      auditIssues: [],
      doctor: fixtureDoctor(),
      mutationHistory: cleanHistory(),
      taskId: "JS-100",
    });

    expect(packet.status).toBe("ready");
    expect(packet.ok).toBe(true);
    expect(packet.task).toMatchObject({
      status: "implemented",
      plan_status: "complete",
      execution_ready: true,
      blockers: [],
      pending_step_ids: [],
      required_checks: [],
    });
  });

  it("keeps proposed tasks without plans blocked from execution", () => {
    const index = fixtureIndex();
    index.tasks[0] = {
      ...index.tasks[0],
      status: "proposed",
      plan: undefined,
    };
    const packet = buildHandoffPacket({
      index,
      auditIssues: [],
      doctor: fixtureDoctor(),
      mutationHistory: cleanHistory(),
      taskId: "JS-100",
    });

    expect(packet.status).toBe("attention");
    expect(packet.task).toMatchObject({
      status: "proposed",
      plan_status: null,
      execution_ready: false,
      pending_step_ids: [],
      required_checks: [],
      blockers: [
        expect.objectContaining({
          type: "status",
          taskId: "JS-100",
          status: "proposed",
        }),
      ],
    });
  });
});

function fixtureIndex(): JumpIndex {
  return {
    version: 1,
    generatedAt: "2026-06-26T00:00:00.000Z",
    tasks: [
      {
        id: "JS-100",
        title: "Feature",
        type: "engineering",
        status: "approved",
        module: "core-cli",
        space: "repo",
        doc: {
          path: "docs/specs/feature.md",
          heading: "Feature",
        },
        spec: "Implement feature.",
        code: ["src/feature.ts"],
        tests: ["src/feature.test.ts"],
        gaps: [],
        depends_on: [],
        refs: [],
        plan: {
          task_id: "JS-100",
          goal: "Implement feature.",
          status: "in_progress",
          steps: [
            {
              id: "orient",
              outcome: "Orientation complete.",
              status: "complete",
              depends_on: [],
              source_files: [],
              tests: [],
              checks: [],
              evidence: ["Read the task."],
            },
            {
              id: "implement",
              outcome: "Implementation complete.",
              status: "pending",
              depends_on: ["orient"],
              source_files: ["src/feature.ts"],
              tests: ["src/feature.test.ts"],
              checks: ["npm test"],
              evidence: [],
            },
          ],
        },
      },
    ],
  };
}

function fixtureHistory(): MutationHistoryReport {
  return {
    history_path: ".jumpspace/mutations.jsonl",
    total: 2,
    returned: 2,
    filters: {
      task_id: "JS-100",
      limit: 2,
    },
    entries: [
      {
        version: 1,
        command: "link update",
        recorded_at: "2026-06-26T00:00:00.000Z",
        touched_files: ["docs/specs/feature.md", "src/feature.ts", "README.md"],
        task_ids: ["JS-100"],
        config_changes: ["docs/**/*.md"],
        index_changed: true,
        warnings: [
          {
            code: "EXAMPLE_WARNING",
            message: "Example warning.",
          },
        ],
      },
      {
        version: 1,
        command: "scan",
        recorded_at: "2026-06-26T00:00:01.000Z",
        touched_files: ["docs/specs/feature.md"],
        task_ids: ["JS-100"],
        config_changes: [],
        index_changed: true,
        warnings: [],
      },
    ],
  };
}

function cleanHistory(): MutationHistoryReport {
  return {
    ...fixtureHistory(),
    entries: fixtureHistory().entries.map((entry) => ({
      ...entry,
      config_changes: [],
      warnings: [],
      touched_files: ["docs/specs/feature.md"],
    })),
  };
}

function fixtureDoctor(overrides: Partial<DoctorReport> = {}): DoctorReport {
  return {
    ok: true,
    errors: [],
    warnings: [],
    suggestions: [],
    checked: {
      config_docs: ["docs/**/*.md"],
      ignored_patterns: ["node_modules/**"],
      semantic_index: {
        enabled: true,
        path: ".jumpspace/semantic-index.json",
      },
    },
    last_mutation: null,
    repair: null,
    ...overrides,
  };
}
