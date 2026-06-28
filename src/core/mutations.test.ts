import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LAST_MUTATION_PATH,
  MUTATION_HISTORY_PATH,
  readLastMutation,
  readMutationHistory,
  recordMutation,
  renderLastMutation,
  renderMutationHistory,
} from "./mutations.js";

describe("last mutation summaries", () => {
  it("returns undefined when no summary has been recorded", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-mutation-"));

    await expect(readLastMutation(root)).resolves.toBeUndefined();
  });

  it("returns an empty history report when no mutation history has been recorded", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-mutation-"));

    await expect(readMutationHistory(root)).resolves.toEqual({
      history_path: MUTATION_HISTORY_PATH,
      total: 0,
      returned: 0,
      filters: {},
      entries: [],
    });
  });

  it("writes and reads an atomic generated mutation summary", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-mutation-"));

    const written = await recordMutation(root, {
      command: "status",
      touched_files: ["docs/specs/feature.md", "docs/specs/feature.md", ".jumpspace/index.json"],
      task_ids: ["JS-100", "JS-100"],
      config_changes: ["added docs/specs/feature.md"],
      index_changed: true,
      warnings: [{ code: "CHECK_MANUALLY", message: "Review generated output.", taskId: "JS-100" }],
    });

    expect(written).toMatchObject({
      version: 1,
      command: "status",
      touched_files: ["docs/specs/feature.md", ".jumpspace/index.json"],
      task_ids: ["JS-100"],
      config_changes: ["added docs/specs/feature.md"],
      index_changed: true,
      warnings: [{ code: "CHECK_MANUALLY", taskId: "JS-100" }],
    });
    expect(written.recorded_at).toEqual(expect.any(String));

    const raw = await fs.readFile(path.join(root, LAST_MUTATION_PATH), "utf8");
    expect(JSON.parse(raw)).toMatchObject({ command: "status" });
    await expect(readLastMutation(root)).resolves.toEqual(written);

    const historyRaw = await fs.readFile(path.join(root, MUTATION_HISTORY_PATH), "utf8");
    expect(historyRaw.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(historyRaw.trim())).toMatchObject({ command: "status", task_ids: ["JS-100"] });
  });

  it("reads mutation history newest first with task filters and limits", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-mutation-"));

    const first = await recordMutation(root, {
      command: "plan save",
      touched_files: ["docs/specs/a.md"],
      task_ids: ["JS-100"],
      index_changed: true,
    });
    const second = await recordMutation(root, {
      command: "step complete",
      touched_files: ["docs/specs/a.md"],
      task_ids: ["JS-100"],
      index_changed: true,
    });
    await recordMutation(root, {
      command: "semantic build",
      touched_files: [".jumpspace/semantic-index.json"],
      index_changed: false,
    });

    await expect(readMutationHistory(root, { taskId: "JS-100", limit: 1 })).resolves.toEqual({
      history_path: MUTATION_HISTORY_PATH,
      total: 2,
      returned: 1,
      filters: { task_id: "JS-100", limit: 1 },
      entries: [second],
    });

    const all = await readMutationHistory(root);
    expect(all.total).toBe(3);
    expect(all.returned).toBe(3);
    expect(all.entries.map((entry) => entry.command)).toEqual(["semantic build", "step complete", "plan save"]);
    expect(all.entries).toContainEqual(first);
  });

  it("renders a human-readable summary", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-mutation-"));
    const summary = await recordMutation(root, {
      command: "bootstrap apply",
      touched_files: ["README.md"],
      task_ids: ["DOC-1"],
      index_changed: true,
    });

    expect(renderLastMutation(summary)).toContain("# Jumpspace Last Mutation");
    expect(renderLastMutation(summary)).toContain("Command: bootstrap apply");
    expect(renderLastMutation(summary)).toContain("- README.md");
  });

  it("renders a human-readable mutation history", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-mutation-"));
    await recordMutation(root, {
      command: "link update",
      touched_files: ["docs/specs/jumpspace-v0.md", ".jumpspace/index.json"],
      task_ids: ["JS-035"],
      index_changed: true,
    });

    const report = await readMutationHistory(root, { taskId: "JS-035", limit: 10 });
    const rendered = renderMutationHistory(report);

    expect(rendered).toContain("# Jumpspace Mutation History");
    expect(rendered).toContain("Filters: task=JS-035, limit=10");
    expect(rendered).toContain("link update");
    expect(rendered).toContain("Task IDs: JS-035");
  });
});
