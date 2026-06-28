import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyBootstrapProposal, createBootstrapContext, validateBootstrapProposal } from "./bootstrap.js";
import { readIndex, loadConfig } from "./config.js";
import type { BootstrapProposal } from "./bootstrapProposal.js";

describe("bootstrap", () => {
  it("exports Markdown heading context for an AI proposal", async () => {
    const root = await createBootstrapFixture();

    const context = await createBootstrapContext(root, ["README.md"]);

    expect(context).toMatchObject({
      ok: true,
      context_version: 1,
      paths: ["README.md"],
    });
    expect(context.headings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "README.md",
          heading: "Password entry",
          line: 3,
          level: 2,
          parent_headings: ["Existing product docs"],
          has_jumpspace_task: false,
          linked_file_hints: ["src/auth/password.ts"],
          descendant_linked_file_hints: [],
          linked_file_hint_details: [
            {
              path: "src/auth/password.ts",
              line: 7,
              scope: "own",
            },
          ],
        }),
      ]),
    );
    expect(context.headings.find((heading) => heading.heading === "Password entry")?.linked_file_hints).not.toContain("Next.js");
    expect(context.proposal_schema.commands.apply).toBe("jumpspace bootstrap apply --file <proposal-file>");
  });

  it("validates proposal IDs, dependencies, headings, and evidenced links", async () => {
    const root = await createBootstrapFixture();
    const proposal: BootstrapProposal = {
      version: 1,
      tasks: [
        proposalTask("DOC-PASSWORD", {
          depends_on: ["DOC-MISSING"],
          code: ["src/auth/password.ts"],
          evidence: [{ path: "README.md", heading: "Password entry" }],
        }),
        proposalTask("DOC-PASSWORD"),
        proposalTask("DOC-NOPE", {
          id: "DOC-NOPE",
          source: { path: "README.md", heading: "Missing heading" },
        }),
      ],
      skipped: [],
    };

    const validation = await validateBootstrapProposal(root, proposal);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_BOOTSTRAP_TASK_ID", taskId: "DOC-PASSWORD" }),
        expect.objectContaining({ code: "BOOTSTRAP_UNKNOWN_DEPENDENCY", taskId: "DOC-PASSWORD" }),
        expect.objectContaining({ code: "BOOTSTRAP_UNEVIDENCED_CODE_FILE", taskId: "DOC-PASSWORD" }),
        expect.objectContaining({ code: "BOOTSTRAP_HEADING_NOT_FOUND", taskId: "DOC-NOPE" }),
      ]),
    );
  });

  it("applies proposal blocks and makes scan include applied paths", async () => {
    const root = await createBootstrapFixture();
    const proposal: BootstrapProposal = {
      version: 1,
      tasks: [
        proposalTask("DOC-PASSWORD", {
          code: ["src/auth/password.ts"],
          evidence: [
            {
              path: "README.md",
              heading: "Password entry",
              quote: "The password form is implemented in src/auth/password.ts.",
            },
          ],
        }),
      ],
      skipped: [],
    };

    const validation = await validateBootstrapProposal(root, proposal);
    expect(validation.ok).toBe(true);

    const result = await applyBootstrapProposal(root, proposal);
    expect(result).toMatchObject({
      ok: true,
      applied: [{ id: "DOC-PASSWORD", path: "README.md", heading: "Password entry", action: "inserted" }],
      config_paths_added: ["README.md"],
    });

    const markdown = await fs.readFile(path.join(root, "README.md"), "utf8");
    expect(markdown).toContain("id: DOC-PASSWORD");
    expect(markdown).toContain("confidence: 0.9");
    expect(markdown.indexOf("## Password entry")).toBeLessThan(markdown.indexOf("<!-- jumpspace"));

    const config = await loadConfig(root);
    expect(config.docs).toContain("README.md");

    const index = await readIndex(root);
    expect(index.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "DOC-PASSWORD",
          doc: expect.objectContaining({
            path: "README.md",
            heading: "Password entry",
            line: 3,
            level: 2,
            parent_headings: ["Existing product docs"],
          }),
          code: ["src/auth/password.ts"],
        }),
      ]),
    );
  });

  it("disambiguates duplicate headings with line, level, and parent headings", async () => {
    const root = await createDuplicateHeadingFixture();

    const context = await createBootstrapContext(root, ["README.md"]);
    const localDevelopment = context.headings.filter((heading) => heading.heading === "Local development");

    expect(localDevelopment).toHaveLength(2);
    expect(localDevelopment[0].suggested_id).not.toBe(localDevelopment[1].suggested_id);

    const ambiguous: BootstrapProposal = {
      version: 1,
      tasks: [
        proposalTask("DOC-LOCAL", {
          title: "Local development",
          source: { path: "README.md", heading: "Local development" },
          evidence: [{ path: "README.md", heading: "Local development", quote: "Run npm run dev." }],
        }),
      ],
      skipped: [],
    };

    const ambiguousValidation = await validateBootstrapProposal(root, ambiguous);
    expect(ambiguousValidation.ok).toBe(false);
    expect(ambiguousValidation.errors).toContainEqual(
      expect.objectContaining({
        code: "BOOTSTRAP_AMBIGUOUS_HEADING",
        taskId: "DOC-LOCAL",
      }),
    );

    const disambiguated: BootstrapProposal = {
      version: 1,
      tasks: [
        proposalTask("DOC-LOCAL", {
          title: "Local development",
          source: {
            path: "README.md",
            heading: "Local development",
            line: localDevelopment[1].line,
            level: localDevelopment[1].level,
            parent_headings: localDevelopment[1].parent_headings,
          },
          evidence: [{ path: "README.md", heading: "Local development", quote: "Run npm run dev for workers." }],
        }),
      ],
      skipped: [],
    };

    const validation = await validateBootstrapProposal(root, disambiguated);
    expect(validation.ok).toBe(true);

    const before = await fs.readFile(path.join(root, "README.md"), "utf8");
    const dryRun = await applyBootstrapProposal(root, disambiguated, { dryRun: true });
    const after = await fs.readFile(path.join(root, "README.md"), "utf8");

    expect(dryRun).toMatchObject({
      ok: true,
      dry_run: true,
      applied: [{ id: "DOC-LOCAL", path: "README.md", heading: "Local development", line: localDevelopment[1].line, action: "would_insert" }],
      config_paths_added: [],
    });
    expect(after).toBe(before);
  });
});

async function createBootstrapFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-"));
  await fs.mkdir(path.join(root, "src/auth"), { recursive: true });
  await fs.writeFile(path.join(root, "src/auth/password.ts"), "export const password = true;\n");
  await fs.writeFile(
    path.join(root, "README.md"),
    `# Existing product docs

## Password entry

Users enter their password in the login form.
This is a Next.js app.
The password form is implemented in src/auth/password.ts.

## Unrelated note

Keep this note out of the graph.
`,
  );
  return root;
}

async function createDuplicateHeadingFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-bootstrap-duplicate-"));
  await fs.writeFile(
    path.join(root, "README.md"),
    `# Product docs

## Web app

### Local development

Run npm run dev.

## Worker app

### Local development

Run npm run worker.
`,
  );
  return root;
}

function proposalTask(id: string, overrides: Partial<BootstrapProposal["tasks"][number]> = {}): BootstrapProposal["tasks"][number] {
  return {
    id,
    title: "Password entry",
    source: {
      path: "README.md",
      heading: "Password entry",
    },
    type: "spec",
    status: "proposed",
    space: "repo",
    keywords: ["password"],
    summary: "Users enter their password in the login form.",
    code: [],
    tests: [],
    depends_on: [],
    refs: [],
    evidence: [
      {
        path: "README.md",
        heading: "Password entry",
        quote: "Users enter their password in the login form.",
      },
    ],
    confidence: 0.9,
    gaps: ["Tests are unknown."],
    ...overrides,
  };
}
