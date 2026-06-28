import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runBootstrapApply, runBootstrapDiscover, runBootstrapPropose, runBootstrapValidate } from "./bootstrap.js";

describe("bootstrap commands", () => {
  it("returns structured JSON for invalid proposal files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-command-"));
    const lines: string[] = [];

    const code = await runBootstrapValidate({
      root,
      file: "missing.json",
      json: true,
      writeLine: (line) => lines.push(line),
    });

    expect(code).toBe(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      ok: false,
      errors: [
        {
          code: "INVALID_BOOTSTRAP_PROPOSAL",
          path: "missing.json",
        },
      ],
    });
  });

  it("previews apply mutations in dry-run mode", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-command-"));
    await fs.writeFile(
      path.join(root, "README.md"),
      `# Product docs

## Password entry

Users enter passwords here.
`,
    );
    await fs.writeFile(
      path.join(root, "proposal.json"),
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: "DOC-PASSWORD",
            title: "Password entry",
            source: { path: "README.md", heading: "Password entry", line: 3, level: 2, parent_headings: ["Product docs"] },
            evidence: [{ path: "README.md", heading: "Password entry", quote: "Users enter passwords here." }],
            confidence: 0.9,
          },
        ],
        skipped: [],
      }),
    );
    const before = await fs.readFile(path.join(root, "README.md"), "utf8");
    const lines: string[] = [];

    const code = await runBootstrapApply({
      root,
      file: path.join(root, "proposal.json"),
      dryRun: true,
      json: true,
      writeLine: (line) => lines.push(line),
    });

    expect(code).toBe(0);
    expect(JSON.parse(lines[0])).toMatchObject({
      ok: true,
      dry_run: true,
      applied: [{ id: "DOC-PASSWORD", path: "README.md", heading: "Password entry", line: 3, action: "would_insert" }],
      config_paths_added: [],
    });
    await expect(fs.readFile(path.join(root, "README.md"), "utf8")).resolves.toBe(before);
  });

  it("discovers recommended docs for bootstrap", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-command-"));
    await write(root, "README.md", "# App\n");
    await write(root, "documentation/specs/feature.md", "# Feature\n");
    await write(root, "apps/workers/example/README.md", "# Worker\n");
    await write(root, ".claude/worktrees/noise/README.md", "# Noise\n");
    const lines: string[] = [];

    const code = await runBootstrapDiscover({
      root,
      json: true,
      writeLine: (line) => lines.push(line),
    });

    expect(code).toBe(0);
    expect(JSON.parse(lines[0])).toMatchObject({
      ok: true,
      recommended_docs: expect.arrayContaining(["README.md", "documentation/**/*.md", "apps/**/README.md"]),
      ignored_patterns: expect.arrayContaining([".claude/worktrees/**"]),
    });
  });

  it("writes proposal drafts without overwriting existing files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-command-"));
    await write(root, "README.md", "# Product docs\n\n## Password entry\n\nThe implementation lives in src/auth/password.ts.\n");
    await write(root, "src/auth/password.ts", "export const password = true;\n");
    const lines: string[] = [];

    const code = await runBootstrapPropose({
      root,
      patterns: ["README.md"],
      file: "proposal.json",
      json: true,
      writeLine: (line) => lines.push(line),
    });

    expect(code).toBe(0);
    expect(JSON.parse(lines[0])).toMatchObject({
      ok: true,
      proposal_file: "proposal.json",
      proposal: {
        tasks: [expect.objectContaining({ title: "Password entry", code: ["src/auth/password.ts"] })],
      },
    });
    await expect(fs.readFile(path.join(root, "proposal.json"), "utf8")).resolves.toContain("\"tasks\"");

    const duplicateLines: string[] = [];
    const duplicateCode = await runBootstrapPropose({
      root,
      patterns: ["README.md"],
      file: "proposal.json",
      json: true,
      writeLine: (line) => duplicateLines.push(line),
    });

    expect(duplicateCode).toBe(1);
    expect(JSON.parse(duplicateLines[0])).toMatchObject({
      ok: false,
      errors: [{ code: "BOOTSTRAP_PROPOSAL_FILE_EXISTS", path: "proposal.json" }],
    });
  });
});

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
