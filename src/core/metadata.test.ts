import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMarkdownTasks } from "./parseMarkdown.js";
import { updateTaskMetadata } from "./metadata.js";

describe("updateTaskMetadata", () => {
  it("updates a task block atomically through the shared metadata helper", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-metadata-"));
    const docPath = path.join(root, "docs", "specs", "feature.md");
    await fs.mkdir(path.dirname(docPath), { recursive: true });
    await fs.writeFile(docPath, fixtureMarkdown("approved"));
    const task = parseMarkdownTasks(await fs.readFile(docPath, "utf8"), "docs/specs/feature.md").tasks[0];

    await updateTaskMetadata(root, task, (metadata) => ({
      ...metadata,
      status: "partial",
    }));

    const updated = await fs.readFile(docPath, "utf8");
    expect(updated).toContain("status: partial");
    expect(updated).toContain("Keep this body.");
  });

  it("does not write when metadata parsing fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-metadata-"));
    const docPath = path.join(root, "docs", "specs", "feature.md");
    await fs.mkdir(path.dirname(docPath), { recursive: true });
    const broken = fixtureMarkdown("approved").replace("status: approved", "status: [");
    await fs.writeFile(docPath, broken);
    const task = {
      id: "JS-100",
      doc: {
        path: "docs/specs/feature.md",
      },
    } as Parameters<typeof updateTaskMetadata>[1];

    await expect(updateTaskMetadata(root, task, (metadata) => metadata)).rejects.toThrow();
    expect(await fs.readFile(docPath, "utf8")).toBe(broken);
  });

  it("serializes concurrent read-modify-write task metadata updates", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-metadata-"));
    const docPath = path.join(root, "docs", "specs", "feature.md");
    await fs.mkdir(path.dirname(docPath), { recursive: true });
    await fs.writeFile(docPath, fixtureMarkdown("approved"));
    const task = parseMarkdownTasks(await fs.readFile(docPath, "utf8"), "docs/specs/feature.md").tasks[0];
    const firstMayWrite = deferred<void>();
    let firstEnteredCriticalSection = false;

    const first = updateTaskMetadata(
      root,
      task,
      (metadata) => ({
        ...metadata,
        status: "partial",
      }),
      {
        beforeWrite: async () => {
          firstEnteredCriticalSection = true;
          await firstMayWrite.promise;
        },
        lock: {
          pollMs: 1,
          timeoutMs: 1_000,
        },
      },
    );

    while (!firstEnteredCriticalSection) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    const second = updateTaskMetadata(
      root,
      task,
      (metadata) => ({
        ...metadata,
        keywords: [...(metadata.keywords ?? []), "concurrent"],
      }),
      {
        lock: {
          pollMs: 1,
          timeoutMs: 1_000,
        },
      },
    );

    firstMayWrite.resolve();
    await Promise.all([first, second]);

    const updated = await fs.readFile(docPath, "utf8");
    expect(updated).toContain("status: partial");
    expect(updated).toContain("keywords:");
    expect(updated).toContain("- concurrent");
  });
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

function fixtureMarkdown(status: string): string {
  return `# Feature

## Task

<!-- jumpspace
id: JS-100
type: spec
status: ${status}
code: []
tests: []
depends_on: []
-->

Keep this body.
`;
}
