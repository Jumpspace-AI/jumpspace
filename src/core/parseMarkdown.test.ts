import { describe, expect, it } from "vitest";
import { parseMarkdownTasks } from "./parseMarkdown.js";

describe("parseMarkdownTasks", () => {
  it("parses jumpspace metadata and the nearest heading body", () => {
    const markdown = `# Product

## Metric approval flow

<!-- jumpspace
id: DOC-MON-001
type: spec
status: approved
module: portfolio-monitoring
space: module
keywords:
  - metrics
  - approval
code:
  - apps/web/components/ApprovalPanel.tsx
tests:
  - tests/approval-flow.spec.ts
gaps:
  - Migration coverage still needs an owner.
depends_on:
  - DOC-MON-000
refs:
  - type: related_to
    id: DOC-MON-002
    note: Approval copy is refined elsewhere.
acceptance_criteria:
  - id: AC-1
    description: Analysts can approve metrics.
verification_records:
  - id: verify-20260101000000
    verified_at: 2026-01-01T00:00:00.000Z
    commit: abc123
    checks:
      - command: npm test
        exit_code: 0
    acceptance_criteria_covered:
      - AC-1
    evidence:
      - npm test passed.
plan:
  task_id: DOC-MON-001
  goal: Build approval flow.
  status: planned
  steps:
    - id: design
      outcome: Approval behavior is documented.
      status: complete
      depends_on: []
      source_files:
        - docs/specs/example.md
      tests: []
      checks:
        - jumpspace plan validate DOC-MON-001
      evidence:
        - Human approved the plan.
-->

Analysts can approve extracted metrics.

### Detail

Lower headings stay in the task body.

## Next feature

Outside the task.
`;

    const parsed = parseMarkdownTasks(markdown, "docs/specs/example.md");

    expect(parsed.issues).toEqual([]);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.tasks[0]).toMatchObject({
      id: "DOC-MON-001",
      title: "Metric approval flow",
      type: "spec",
      status: "approved",
      module: "portfolio-monitoring",
      space: "module",
      keywords: ["metrics", "approval"],
      doc: {
        path: "docs/specs/example.md",
        heading: "Metric approval flow",
        line: 3,
        level: 2,
        parent_headings: ["Product"],
      },
      code: ["apps/web/components/ApprovalPanel.tsx"],
      tests: ["tests/approval-flow.spec.ts"],
      gaps: ["Migration coverage still needs an owner."],
      depends_on: ["DOC-MON-000"],
      refs: [
        {
          type: "related_to",
          id: "DOC-MON-002",
          note: "Approval copy is refined elsewhere.",
        },
      ],
      acceptance_criteria: [
        {
          id: "AC-1",
          description: "Analysts can approve metrics.",
        },
      ],
      verification_records: [
        {
          id: "verify-20260101000000",
          verified_at: "2026-01-01T00:00:00.000Z",
          commit: "abc123",
          checks: [
            {
              command: "npm test",
              exit_code: 0,
            },
          ],
          acceptance_criteria_covered: ["AC-1"],
          evidence: ["npm test passed."],
        },
      ],
      plan: {
        task_id: "DOC-MON-001",
        goal: "Build approval flow.",
        status: "planned",
        steps: [
          {
            id: "design",
            outcome: "Approval behavior is documented.",
            status: "complete",
            depends_on: [],
            source_files: ["docs/specs/example.md"],
            tests: [],
            checks: ["jumpspace plan validate DOC-MON-001"],
            evidence: ["Human approved the plan."],
          },
        ],
      },
    });
    expect(parsed.tasks[0].spec).toContain("Analysts can approve extracted metrics.");
    expect(parsed.tasks[0].spec).toContain("Lower headings stay in the task body.");
    expect(parsed.tasks[0].spec).not.toContain("Outside the task.");
  });

  it("defaults space to repo and refs to an empty array", () => {
    const markdown = `## Parser

<!-- jumpspace
id: JS-001
type: spec
status: approved
code: []
tests: []
depends_on: []
-->

Parse task blocks.
`;

    const parsed = parseMarkdownTasks(markdown, "docs/specs/jumpspace-v0.md");

    expect(parsed.issues).toEqual([]);
    expect(parsed.tasks[0]).toMatchObject({
      id: "JS-001",
      space: "repo",
      doc: {
        path: "docs/specs/jumpspace-v0.md",
        heading: "Parser",
        line: 1,
        level: 2,
        parent_headings: [],
      },
      refs: [],
    });
  });

  it("reports invalid YAML or schema metadata", () => {
    const markdown = `## Broken

<!-- jumpspace
id: BROKEN
type: nope
status: approved
-->

Body.
`;

    const parsed = parseMarkdownTasks(markdown, "docs/specs/broken.md");

    expect(parsed.tasks).toEqual([]);
    expect(parsed.issues[0]).toMatchObject({
      severity: "error",
      code: "INVALID_METADATA",
      path: "docs/specs/broken.md",
    });
  });
});
