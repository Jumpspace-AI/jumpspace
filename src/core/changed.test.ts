import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { getChangedFiles, getWorkingTreeChangedFiles, parseNameStatus } from "./changed.js";

const execFileAsync = promisify(execFile);

describe("parseNameStatus", () => {
  it("parses modified, deleted, and renamed status lines", () => {
    expect(parseNameStatus("M\tfile.ts\nD\tgone.ts\nR100\told.ts\tnew.ts\n")).toEqual([
      { path: "file.ts", status: "modified" },
      { path: "gone.ts", status: "deleted" },
      { path: "new.ts", old_path: "old.ts", status: "renamed" },
    ]);
  });
});

describe("getChangedFiles", () => {
  it("includes committed, staged, unstaged, untracked, renamed, and deleted files since a ref", async () => {
    const { root, base } = await createChangedRepo();
    const result = await getChangedFiles(root, base);

    expect(result.ok).toBe(true);
    const files = result.ok ? result.files : [];
    expect(files).toContainEqual(expect.objectContaining({ path: "committed.txt", sources: ["committed"] }));
    expect(files).toContainEqual(expect.objectContaining({ path: "delete.txt", statuses: ["deleted"], sources: ["committed"] }));
    expect(files).toContainEqual(
      expect.objectContaining({ path: "rename-new.txt", old_path: "rename-old.txt", statuses: ["renamed"], sources: ["committed"] }),
    );
    expect(files).toContainEqual(expect.objectContaining({ path: "staged.txt", sources: ["staged"] }));
    expect(files).toContainEqual(expect.objectContaining({ path: "unstaged.txt", sources: ["unstaged"] }));
    expect(files).toContainEqual(expect.objectContaining({ path: "untracked.txt", sources: ["untracked"] }));
  });

  it("can report only working-tree changes without a baseline ref", async () => {
    const { root } = await createChangedRepo();
    const result = await getWorkingTreeChangedFiles(root);

    expect(result.ok).toBe(true);
    const files = result.ok ? result.files : [];
    expect(files).not.toContainEqual(expect.objectContaining({ path: "committed.txt", sources: ["committed"] }));
    expect(files).toContainEqual(expect.objectContaining({ path: "staged.txt", sources: ["staged"] }));
    expect(files).toContainEqual(expect.objectContaining({ path: "unstaged.txt", sources: ["unstaged"] }));
    expect(files).toContainEqual(expect.objectContaining({ path: "untracked.txt", sources: ["untracked"] }));
  });
});

async function createChangedRepo(): Promise<{ root: string; base: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-changed-"));
  await execFileAsync("git", ["init"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
  const baseFiles: Record<string, string> = {
    "committed.txt": "committed base\n",
    "delete.txt": "delete base\n",
    "rename-old.txt": "rename base\n",
    "staged.txt": "staged base\n",
    "unstaged.txt": "unstaged base\n",
  };
  for (const [file, content] of Object.entries(baseFiles)) {
    await fs.writeFile(path.join(root, file), content);
  }
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
  const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();

  await fs.writeFile(path.join(root, "committed.txt"), "changed\n");
  await execFileAsync("git", ["rm", "delete.txt"], { cwd: root });
  await execFileAsync("git", ["mv", "rename-old.txt", "rename-new.txt"], { cwd: root });
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "-m", "committed changes"], { cwd: root });

  await fs.writeFile(path.join(root, "staged.txt"), "staged\n");
  await execFileAsync("git", ["add", "staged.txt"], { cwd: root });
  await fs.writeFile(path.join(root, "unstaged.txt"), "unstaged\n");
  await fs.writeFile(path.join(root, "untracked.txt"), "untracked\n");
  return { root, base };
}
