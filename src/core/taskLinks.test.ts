import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMarkdownTasks } from "./parseMarkdown.js";
import {
  applyTaskLinkUpdate,
  parseTaskRef,
  planTaskLinkUpdate,
  suggestTaskLinks,
  type TaskLinkSuggestionCandidate,
} from "./taskLinks.js";
import type { JumpIndex } from "./types.js";

describe("task link helpers", () => {
  it("plans and applies idempotent code, test, dependency, ref, and gap updates", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-links-"));
    await write(root, "docs/specs/feature.md", fixtureMarkdown());
    await write(root, "src/password.ts", "export const password = true;\n");
    await write(root, "src/password.test.ts", "export const test = true;\n");
    const index = await fixtureIndex(root);

    const parsedRef = parseTaskRef("related_to:JS-DEP");
    expect("ok" in parsedRef).toBe(false);
    const plan = await planTaskLinkUpdate(root, index, "JS-100", {
      add: {
        code: ["src/password.ts", "src/password.ts"],
        tests: ["src/password.test.ts"],
        depends_on: ["JS-DEP"],
        refs: [parsedRef],
        gaps: ["Review auth copy."],
      },
    });

    expect(plan).toMatchObject({
      ok: true,
      changed: true,
      operations: expect.arrayContaining([
        expect.objectContaining({ action: "add", field: "code", value: "src/password.ts", changed: true }),
        expect.objectContaining({ action: "add", field: "tests", value: "src/password.test.ts", changed: true }),
        expect.objectContaining({ action: "add", field: "depends_on", value: "JS-DEP", changed: true }),
        expect.objectContaining({ action: "add", field: "refs", value: "related_to:JS-DEP", changed: true }),
        expect.objectContaining({ action: "add", field: "gaps", value: "Review auth copy.", changed: true }),
      ]),
    });

    if (plan.ok) {
      await applyTaskLinkUpdate(root, index.tasks[0], plan);
    }
    const updated = await fs.readFile(path.join(root, "docs/specs/feature.md"), "utf8");
    expect(updated).toContain("src/password.ts");
    expect(updated).toContain("src/password.test.ts");
    expect(updated).toContain("JS-DEP");
    expect(updated).toContain("Review auth copy.");

    const rescanned = await fixtureIndex(root);
    const remove = await planTaskLinkUpdate(root, rescanned, "JS-100", {
      remove: {
        code: ["src/password.ts"],
        tests: ["src/password.test.ts"],
        depends_on: ["JS-DEP"],
        refs: [{ type: "related_to", id: "JS-DEP" }],
        gaps: ["Review auth copy."],
      },
    });

    expect(remove).toMatchObject({
      ok: true,
      changed: true,
      operations: expect.arrayContaining([
        expect.objectContaining({ action: "remove", field: "code", value: "src/password.ts", changed: true }),
        expect.objectContaining({ action: "remove", field: "refs", value: "related_to:JS-DEP", changed: true }),
      ]),
    });
  });

  it("rejects missing paths, unknown dependencies, unknown refs, self links, and invalid ref syntax", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-links-"));
    await write(root, "docs/specs/feature.md", fixtureMarkdown());
    const index = await fixtureIndex(root);

    expect(parseTaskRef("bad-ref")).toMatchObject({
      ok: false,
      error: { code: "INVALID_REF" },
    });
    expect(parseTaskRef("unknown:JS-DEP")).toMatchObject({
      ok: false,
      error: { code: "INVALID_REF_TYPE" },
    });

    const result = await planTaskLinkUpdate(root, index, "JS-100", {
      add: {
        code: ["src/missing.ts"],
        depends_on: ["NOPE", "JS-100"],
        refs: [
          { type: "related_to", id: "NOPE" },
          { type: "implements", id: "JS-100" },
        ],
      },
    });

    expect(result).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_LINK_PATH", path: "src/missing.ts" }),
        expect.objectContaining({ code: "UNKNOWN_DEPENDENCY" }),
        expect.objectContaining({ code: "SELF_DEPENDENCY" }),
        expect.objectContaining({ code: "UNKNOWN_REF_TASK" }),
        expect.objectContaining({ code: "SELF_REF" }),
      ]),
    });
  });

  it("suggests code and test links from changed-file evidence without mutating", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-links-"));
    await write(root, "docs/specs/feature.md", fixtureMarkdown());
    const index = await fixtureIndex(root);
    const task = index.tasks[0];
    const candidates: TaskLinkSuggestionCandidate[] = [
      { path: "src/password-flow.ts", statuses: ["modified"], sources: ["unstaged"] },
      { path: "src/password-flow.test.ts", statuses: ["added"], sources: ["staged"] },
      { path: "src/form.ts", statuses: ["added"], sources: ["untracked"], content: "export function credentialPasswordEntry() {}\n" },
      { path: "src/unrelated.ts", statuses: ["added"], sources: ["untracked"] },
      { path: "docs/password.md", statuses: ["modified"], sources: ["committed"] },
      { path: "dist/password-flow.js", statuses: ["modified"], sources: ["unstaged"] },
    ];

    const report = suggestTaskLinks(task, candidates);

    expect(report).toMatchObject({
      ok: true,
      task_id: "JS-100",
      candidates_considered: 6,
      suggestions: expect.arrayContaining([
        expect.objectContaining({
          field: "code",
          path: "src/password-flow.ts",
          matched_terms: expect.arrayContaining(["password"]),
          match_reasons: expect.arrayContaining(["path:password", "source:unstaged"]),
          evidence: expect.objectContaining({
            path_terms: expect.arrayContaining(["password"]),
            basename_terms: expect.arrayContaining(["password"]),
            coverage: expect.objectContaining({ matched_terms: expect.any(Number), total_terms: expect.any(Number) }),
          }),
        }),
        expect.objectContaining({
          field: "tests",
          path: "src/password-flow.test.ts",
          matched_terms: expect.arrayContaining(["password"]),
          match_reasons: expect.arrayContaining(["path:password", "field:tests"]),
          evidence: expect.objectContaining({
            path_terms: expect.arrayContaining(["password"]),
          }),
        }),
        expect.objectContaining({
          field: "code",
          path: "src/form.ts",
          matched_terms: expect.arrayContaining(["credential", "password"]),
          match_reasons: expect.arrayContaining(["content:credential", "content:password", "identifier:credential", "identifier:password"]),
          evidence: expect.objectContaining({
            content_terms: expect.arrayContaining(["credential", "password"]),
            identifier_terms: expect.arrayContaining(["credential", "password"]),
          }),
        }),
      ]),
    });
    expect(report.suggestions.every((suggestion) => suggestion.matched_terms.length > 0)).toBe(true);
    expect(report.suggestions.map((suggestion) => suggestion.path)).not.toContain("docs/password.md");
    expect(report.suggestions.map((suggestion) => suggestion.path)).not.toContain("dist/password-flow.js");
    expect(report.suggestions.map((suggestion) => suggestion.path)).not.toContain("src/unrelated.ts");
    expect(report.rejected_candidates).toContainEqual(expect.objectContaining({
      path: "src/unrelated.ts",
      reason: "NO_SOURCE_EVIDENCE",
      matched_terms: [],
      evidence: expect.objectContaining({
        coverage: expect.objectContaining({ matched_terms: 0 }),
      }),
    }));
  });

  it("weights exact path and identifier evidence above incidental content-only matches", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-links-"));
    await write(root, "docs/specs/feature.md", fixtureMarkdown());
    const index = await fixtureIndex(root);
    const task = index.tasks[0];

    const report = suggestTaskLinks(task, [
      {
        path: "src/notes.ts",
        statuses: ["modified"],
        sources: ["unstaged"],
        content: "The password entry wording appears in a comment but no implementation symbol exists.\n",
      },
      {
        path: "src/form.ts",
        statuses: ["modified"],
        sources: ["unstaged"],
        content: "export function credentialPasswordEntry() { return true; }\n",
      },
      {
        path: "src/password-entry.ts",
        statuses: ["modified"],
        sources: ["unstaged"],
        content: "export const handler = true;\n",
      },
    ]);

    const suggestedPaths = report.suggestions.map((suggestion) => suggestion.path);
    expect(suggestedPaths.slice(0, 2)).toEqual(expect.arrayContaining(["src/password-entry.ts", "src/form.ts"]));
    expect(suggestedPaths.at(-1)).toBe("src/notes.ts");
    const pathSuggestion = report.suggestions.find((suggestion) => suggestion.path === "src/password-entry.ts");
    const identifierSuggestion = report.suggestions.find((suggestion) => suggestion.path === "src/form.ts");
    const contentOnlySuggestion = report.suggestions.find((suggestion) => suggestion.path === "src/notes.ts");
    expect(pathSuggestion).toMatchObject({
      evidence: expect.objectContaining({
        basename_terms: expect.arrayContaining(["password", "entry"]),
        phrase_matches: expect.arrayContaining(["path:password entry", "basename:password entry"]),
      }),
    });
    expect(identifierSuggestion).toMatchObject({
      evidence: expect.objectContaining({
        identifier_terms: expect.arrayContaining(["credential", "password", "entry"]),
        phrase_matches: expect.arrayContaining(["identifier:password entry"]),
      }),
    });
    expect(contentOnlySuggestion?.score).toBeLessThan(pathSuggestion?.score ?? 0);
    expect(contentOnlySuggestion?.score).toBeLessThan(identifierSuggestion?.score ?? 0);
  });
});

async function fixtureIndex(root: string): Promise<JumpIndex> {
  const docPath = path.join(root, "docs/specs/feature.md");
  const parsed = parseMarkdownTasks(await fs.readFile(docPath, "utf8"), "docs/specs/feature.md");
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    tasks: parsed.tasks,
  };
}

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const absolutePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content);
}

function fixtureMarkdown(): string {
  return `# Feature

## Password entry

<!-- jumpspace
id: JS-100
type: spec
status: approved
module: auth
keywords:
  - password
  - credential
code: []
tests: []
gaps: []
depends_on: []
refs: []
-->

Users enter their password through the credential form.

## Dependency

<!-- jumpspace
id: JS-DEP
type: spec
status: implemented
code:
  - src/dependency.ts
tests:
  - src/dependency.test.ts
depends_on: []
-->

Dependency work.
`;
}
