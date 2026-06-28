import type { JumpTask } from "./types.js";

export function renderTaskContext(task: JumpTask): string {
  return [
    "# Jumpspace Task Context",
    "",
    `You are working on ${task.id}.`,
    "",
    "## Task",
    "",
    task.title,
    "",
    "## Status",
    "",
    task.status,
    "",
    "## Type",
    "",
    task.type,
    ...(task.module
      ? [
          "",
          "## Module",
          "",
          task.module,
        ]
      : []),
    ...(task.space
      ? [
          "",
          "## Space",
          "",
          task.space,
        ]
      : []),
    ...(task.keywords?.length
      ? [
          "",
          "## Keywords",
          "",
          renderList(task.keywords),
        ]
      : []),
    "",
    "## Source doc",
    "",
    task.doc.path,
    "",
    "## Spec",
    "",
    task.spec || "_No spec body found._",
    "",
    "## Linked code",
    "",
    renderList(task.code),
    "",
    "## Linked tests",
    "",
    renderList(task.tests),
    "",
    "## Dependencies",
    "",
    renderList(task.depends_on),
    ...(task.refs?.length
      ? [
          "",
          "## References",
          "",
          renderList(task.refs.map((ref) => `${ref.type}: ${ref.id}${ref.note ? ` - ${ref.note}` : ""}`)),
        ]
      : []),
    ...(task.sources?.length
      ? [
          "",
          "## Sources",
          "",
          renderList(
            task.sources.map((source) => {
              const label = [source.type, source.id, source.title].filter(Boolean).join(": ");
              return source.url ? `${label} (${source.url})` : label;
            }),
          ),
        ]
      : []),
    ...(task.acceptance_criteria?.length
      ? [
          "",
          "## Acceptance Criteria",
          "",
          renderList(task.acceptance_criteria.map((criterion) => `${criterion.id}: ${criterion.description}`)),
        ]
      : []),
    ...(task.verification_records?.length
      ? [
          "",
          "## Verification Records",
          "",
          renderList(
            task.verification_records.map(
              (record) =>
                `${record.id}: ${record.verified_at} ${record.commit} (${record.acceptance_criteria_covered.join(", ")})`,
            ),
          ),
        ]
      : []),
    ...(task.plan
      ? [
          "",
          "## Plan",
          "",
          `Goal: ${task.plan.goal}`,
          `Status: ${task.plan.status}`,
          "",
          "Steps:",
          renderList(task.plan.steps.map((step) => `${step.id} (${step.status}) - ${step.outcome}`)),
        ]
      : []),
    "",
    "## Agent instructions",
    "",
    "- Treat this task context as the source of truth for implementation.",
    "- Inspect linked code and tests before editing.",
    "- If you change implementation files, update this jumpspace block.",
    "- If you add or change behavior, update the spec text.",
    "- If you add or change tests, update the `tests` links.",
    "- Run `jumpspace scan` and `jumpspace audit` before finishing.",
    "- In your final response, mention which Jumpspace task IDs were changed or verified.",
    "",
  ].join("\n");
}

function renderList(items: string[]): string {
  if (items.length === 0) {
    return "- None";
  }
  return items.map((item) => `- ${item}`).join("\n");
}
