import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { discoverDocs } from "./discovery.js";

describe("discoverDocs", () => {
  it("detects common doc roots in a messy repo and ignores generated paths", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-discovery-"));
    await write(root, "README.md", "# App\n");
    await write(root, "PRODUCT.md", "# Product\n");
    await write(root, "docs/specs/example.md", "# Docs\n");
    await write(root, "documentation/runbooks/app.md", "# Runbook\n");
    await write(root, "apps/workers/document-prep/README.md", "# Worker\n");
    await write(root, "packages/ui/README.md", "# UI\n");
    await write(root, "infrastructure/terraform/README.md", "# Infra\n");
    await write(root, "skills/portfolio/SKILL.md", "# Skill\n");
    await write(root, "adrs/ADR-001.md", "# ADR\n");
    await write(root, "architecture/system.md", "# Architecture\n");
    await write(root, ".claude/worktrees/stale/README.md", "# Ignore me\n");
    await write(root, "node_modules/pkg/README.md", "# Ignore me\n");

    const result = await discoverDocs(root);

    expect(result.ok).toBe(true);
    expect(result.recommended_docs).toEqual(
      expect.arrayContaining([
        "README.md",
        "PRODUCT.md",
        "docs/**/*.md",
        "documentation/**/*.md",
        "apps/**/README.md",
        "packages/**/README.md",
        "infrastructure/**/*.md",
        "skills/**/*.md",
        "adrs/**/*.md",
        "architecture/**/*.md",
      ]),
    );
    expect(result.profile_hints).toEqual(expect.arrayContaining(["docs-heavy", "monorepo", "infra", "agent-skills", "adr", "architecture"]));
    expect(result.ignored_patterns).toEqual(expect.arrayContaining([".claude/worktrees/**", "node_modules/**"]));
    expect(result.candidates.find((candidate) => candidate.pattern === "README.md")).toMatchObject({
      files: 1,
      recommended: true,
      sample_paths: ["README.md"],
    });
    expect(result.candidates.find((candidate) => candidate.pattern === "apps/**/README.md")?.sample_paths).toEqual([
      "apps/workers/document-prep/README.md",
    ]);
  });

  it("falls back to the current default docs glob when no docs are found", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-discovery-empty-"));

    const result = await discoverDocs(root);

    expect(result.recommended_docs).toEqual(["docs/**/*.md"]);
    expect(result.profile_hints).toEqual([]);
  });
});

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
