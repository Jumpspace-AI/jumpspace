import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runInit } from "./init.js";

describe("runInit", () => {
  it("creates starter files without overwriting by default", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-init-"));
    const lines: string[] = [];

    await runInit({ root, writeLine: (line) => lines.push(line) });

    const config = await fs.readFile(path.join(root, ".jumpspace/config.json"), "utf8");
    const example = await fs.readFile(path.join(root, "docs/specs/example.md"), "utf8");
    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");

    expect(config).toContain('"docs"');
    expect(example).toContain("DOC-EXAMPLE-001");
    expect(agents).toContain("Jumpspace workflow");

    await fs.writeFile(path.join(root, "AGENTS.md"), "custom\n");
    await runInit({ root, writeLine: (line) => lines.push(line) });
    expect(await fs.readFile(path.join(root, "AGENTS.md"), "utf8")).toBe("custom\n");

    await runInit({ root, force: true, writeLine: (line) => lines.push(line) });
    expect(await fs.readFile(path.join(root, "AGENTS.md"), "utf8")).toContain("Jumpspace workflow");
  });

  it("uses discovered docs only when --auto is provided", async () => {
    const plainRoot = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-init-plain-"));
    await write(plainRoot, "documentation/specs/feature.md", "# Feature\n");

    await runInit({ root: plainRoot, writeLine: () => {} });
    expect(JSON.parse(await fs.readFile(path.join(plainRoot, ".jumpspace/config.json"), "utf8"))).toMatchObject({
      docs: ["docs/**/*.md"],
    });

    const autoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-init-auto-"));
    await write(autoRoot, "README.md", "# App\n");
    await write(autoRoot, "documentation/specs/feature.md", "# Feature\n");
    await write(autoRoot, "apps/workers/example/README.md", "# Worker\n");

    await runInit({ root: autoRoot, auto: true, writeLine: () => {} });

    expect(JSON.parse(await fs.readFile(path.join(autoRoot, ".jumpspace/config.json"), "utf8"))).toMatchObject({
      docs: expect.arrayContaining(["README.md", "documentation/**/*.md", "apps/**/README.md"]),
    });
  });

  it("updates Codex guidance idempotently without replacing user content", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-init-"));
    await fs.writeFile(path.join(root, "AGENTS.md"), "custom intro\n");

    await runInit({ root, agent: "codex", writeLine: () => {} });
    await runInit({ root, agent: "codex", writeLine: () => {} });

    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");
    expect(agents).toContain("custom intro");
    expect(agents).toContain("Jumpspace workflow for Codex");
    expect(agents.match(/BEGIN JUMPSPACE MANAGED: codex/g)).toHaveLength(1);
    expect(agents.match(/END JUMPSPACE MANAGED: codex/g)).toHaveLength(1);
  });

  it("installs GitHub CI workflow idempotently with dry-run and mutation summary", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-init-ci-"));
    const lines: string[] = [];

    await runInit({ root, ci: "github", dryRun: true, writeLine: (line) => lines.push(line) });
    await expect(fs.readFile(path.join(root, ".github/workflows/jumpspace.yml"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(lines).toContain("would create .github/workflows/jumpspace.yml");

    const first = await runInit({ root, ci: "github", json: true, writeLine: (line) => lines.push(line) });
    expect(first).toBe(0);
    const workflow = await fs.readFile(path.join(root, ".github/workflows/jumpspace.yml"), "utf8");
    expect(workflow).toContain("Jumpspace PR Assistant");
    expect(workflow).toContain("pr comment --since \"$BASE_SHA\"");
    expect(JSON.parse(lines.at(-1)!)).toMatchObject({
      ok: true,
      provider: "github",
      files: [expect.objectContaining({ action: "created", changed: true })],
    });
    expect(JSON.parse(await fs.readFile(path.join(root, ".jumpspace/last-mutation.json"), "utf8"))).toMatchObject({
      command: "init --ci github",
      touched_files: [".github/workflows/jumpspace.yml"],
    });

    const second = await runInit({ root, ci: "github", json: true, writeLine: (line) => lines.push(line) });
    expect(second).toBe(0);
    expect(JSON.parse(lines.at(-1)!)).toMatchObject({
      files: [expect.objectContaining({ action: "unchanged", changed: false })],
    });
  });

  it("leaves user-owned GitHub workflow untouched when installing CI", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-init-ci-"));
    const errors: string[] = [];
    await write(root, ".github/workflows/jumpspace.yml", "name: Custom\non: [pull_request]\n");

    const code = await runInit({
      root,
      ci: "github",
      writeLine: () => {},
      errorLine: (line) => errors.push(line),
    });

    expect(code).toBe(0);
    expect(errors).toEqual([expect.stringContaining("USER_WORKFLOW_EXISTS")]);
    expect(await fs.readFile(path.join(root, ".github/workflows/jumpspace.yml"), "utf8")).toBe("name: Custom\non: [pull_request]\n");
  });
});

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
