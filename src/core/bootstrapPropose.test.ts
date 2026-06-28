import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createBootstrapProposalDraft } from "./bootstrapPropose.js";

describe("createBootstrapProposalDraft", () => {
  it("creates a deterministic, valid bootstrap proposal from heading context", async () => {
    const root = await createProposeFixture();

    const result = await createBootstrapProposalDraft(root, { patterns: ["README.md"] });

    expect(result).toMatchObject({
      ok: true,
      propose_version: 1,
      mode: "deterministic_extraction",
      agent_generated: false,
      human_approval_required: true,
      inputs: {
        pattern_source: "arguments",
        patterns: ["README.md"],
      },
      validation: {
        ok: true,
        errors: [],
      },
    });
    expect(result.proposal.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Password entry",
          status: "draft",
          source: {
            path: "README.md",
            heading: "Password entry",
            line: 3,
            level: 2,
            parent_headings: ["Product docs"],
          },
          code: ["src/auth/password.ts"],
          tests: ["src/auth/password.test.ts"],
          confidence: 0.75,
          evidence: [
            expect.objectContaining({
              path: "README.md",
              heading: "Password entry",
              reason: expect.stringContaining("src/auth/password.ts"),
            }),
          ],
        }),
      ]),
    );
    expect(result.proposal.tasks.map((task) => task.title)).not.toContain("Product docs");
    expect(result.proposal.tasks.map((task) => task.title)).not.toContain("Empty container");
    expect(result.proposal.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "README.md",
          heading: "Product docs",
          line: 1,
          level: 1,
          reason: "Heading has no own prose or linked file hints to cite.",
        }),
        expect.objectContaining({
          path: "README.md",
          heading: "Existing behavior",
          line: 15,
          level: 2,
          reason: "Heading already has Jumpspace task DOC-EXISTING.",
        }),
      ]),
    );
    expect(result.summary.proposed_tasks).toBe(result.proposal.tasks.length);
    expect(result.summary.skipped_headings).toBe(result.proposal.skipped.length);
  });

  it("uses discovery recommendations when explicit paths are omitted", async () => {
    const root = await createProposeFixture();

    const result = await createBootstrapProposalDraft(root);

    expect(result.inputs).toMatchObject({
      pattern_source: "discovery",
      discovered_docs: expect.arrayContaining(["README.md"]),
    });
    expect(result.summary.documents).toBeGreaterThan(0);
  });
});

async function createProposeFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-propose-"));
  await write(root, "src/auth/password.ts", "export const password = true;\n");
  await write(root, "src/auth/password.test.ts", "test('password', () => {});\n");
  await write(
    root,
    "README.md",
    `# Product docs

## Password entry

Users type their password into the login form.
The implementation lives in src/auth/password.ts.
The tests live in src/auth/password.test.ts.

## Empty container

### Child detail

Child detail has its own task-worthy prose.

## Existing behavior

<!-- jumpspace
id: DOC-EXISTING
type: spec
status: approved
depends_on: []
-->

This section is already tracked.
`,
  );
  return root;
}

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
