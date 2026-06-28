import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { indexTasks } from "./indexTasks.js";

describe("indexTasks", () => {
  it("builds an index from configured Markdown files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-index-"));
    await fs.mkdir(path.join(root, "docs/specs"), { recursive: true });
    await fs.writeFile(
      path.join(root, "docs/specs/example.md"),
      `## Agent context packet

<!-- jumpspace
id: JS-003
type: spec
status: approved
code:
  - src/commands/context.ts
tests:
  - src/core/renderContext.test.ts
depends_on: []
-->

The context command prints a packet.
`,
    );

    const result = await indexTasks(root, {
      docs: ["docs/**/*.md"],
      indexPath: ".jumpspace/index.json",
    });

    expect(result.issues).toEqual([]);
    expect(result.index.version).toBe(1);
    expect(result.index.tasks).toHaveLength(1);
    expect(result.index.tasks[0].id).toBe("JS-003");
    expect(result.index.tasks[0].space).toBe("repo");
    expect(result.index.tasks[0].refs).toEqual([]);
    expect(result.index.tasks[0].spec).toBe("The context command prints a packet.");
  });
});
