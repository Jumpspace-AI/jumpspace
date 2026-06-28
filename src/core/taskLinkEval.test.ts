import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateLinkSuggestionRanking, loadLinkSuggestionEvalFixture } from "./taskLinkEval.js";

describe("evaluateLinkSuggestionRanking", () => {
  it("evaluates built-in link suggestion ranking fixtures", () => {
    const report = evaluateLinkSuggestionRanking();

    expect(report).toMatchObject({
      ok: true,
      suite: "built-in",
      fixture_path: null,
      case_count: 6,
      summary: {
        passed: 6,
        failed: 0,
        top1_accuracy: 1,
        mean_reciprocal_rank: 1,
      },
    });

    const exactPath = report.cases.find((testCase) => testCase.id === "exact-path-phrase");
    expect(exactPath).toMatchObject({
      passed: true,
      rank: 1,
      top: {
        path: "src/password-entry.ts",
        field: "code",
        evidence: expect.objectContaining({
          basename_terms: expect.arrayContaining(["password", "entry"]),
          phrase_matches: expect.arrayContaining(["path:password entry", "basename:password entry"]),
        }),
      },
    });

    const identifier = report.cases.find((testCase) => testCase.id === "identifier-evidence");
    expect(identifier).toMatchObject({
      passed: true,
      rank: 1,
      top: {
        path: "src/form.ts",
        evidence: expect.objectContaining({
          identifier_terms: expect.arrayContaining(["credential", "password", "entry"]),
          phrase_matches: expect.arrayContaining(["identifier:credential password entry"]),
        }),
      },
    });

    const testClassification = report.cases.find((testCase) => testCase.id === "test-classification");
    expect(testClassification).toMatchObject({
      passed: true,
      rank: 1,
      top: {
        path: "src/quarterly-metrics.test.ts",
        field: "tests",
      },
    });

    const generic = report.cases.find((testCase) => testCase.id === "generic-changed-file-rejected");
    expect(generic).toMatchObject({
      passed: true,
      rank: null,
      top: null,
      suggestions: [],
      rejected_candidates: [
        expect.objectContaining({
          path: "src/changed-file.ts",
          reason: "NO_SOURCE_EVIDENCE",
          matched_terms: [],
        }),
      ],
    });

    const sharedMetrics = report.cases.find((testCase) => testCase.id === "shared-candidates-quarterly-metrics");
    const sharedPassword = report.cases.find((testCase) => testCase.id === "shared-candidates-password-entry");
    expect(sharedMetrics).toMatchObject({
      passed: true,
      top: {
        path: "src/metrics/quarterly-extract.ts",
      },
    });
    expect(sharedPassword).toMatchObject({
      passed: true,
      top: {
        path: "src/auth/password-entry.tsx",
      },
    });
    expect(sharedMetrics?.top?.path).not.toBe(sharedPassword?.top?.path);
  });

  it("loads external real-repo fixture files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-link-eval-"));
    const fixturePath = path.join(root, "fixture.json");
    await fs.writeFile(
      fixturePath,
      JSON.stringify(
        {
          suite: "claude-feedback",
          shared_candidates: [
            {
              path: "src/metrics/quarterly-extract.ts",
              statuses: ["modified"],
              sources: ["fixture"],
              content: "export function extractQuarterlyMetrics() { return true; }\n",
            },
            {
              path: "src/auth/password-entry.tsx",
              statuses: ["modified"],
              sources: ["fixture"],
              content: "export function PasswordEntryForm() { return credentialPasswordEntry(); }\n",
            },
          ],
          cases: [
            {
              id: "metrics-heading",
              description: "Metrics heading chooses the metrics file.",
              task: {
                id: "TASK-METRICS",
                title: "Quarterly metrics extraction",
                module: "metrics",
                keywords: ["quarterly", "metrics"],
                spec: "Quarterly metrics extraction normalizes metric rows.",
              },
              expected: { path: "src/metrics/quarterly-extract.ts", field: "code", max_rank: 1, min_matched_terms: 2 },
            },
            {
              id: "password-heading",
              description: "Password heading chooses the auth file from the same candidates.",
              task: {
                id: "TASK-PASSWORD",
                title: "Password entry form",
                module: "auth",
                keywords: ["password", "credential"],
                spec: "Users enter credentials through the password entry form.",
              },
              expected: { path: "src/auth/password-entry.tsx", field: "code", max_rank: 1, min_matched_terms: 2 },
            },
          ],
        },
        null,
        2,
      ),
    );

    const loaded = await loadLinkSuggestionEvalFixture(fixturePath);
    expect(loaded).toMatchObject({
      ok: true,
      suite: "claude-feedback",
    });
    if (!loaded.ok) {
      throw new Error(loaded.message);
    }

    const report = evaluateLinkSuggestionRanking({
      suite: loaded.suite,
      fixturePath,
      cases: loaded.cases,
    });
    expect(report).toMatchObject({
      ok: true,
      suite: "claude-feedback",
      fixture_path: fixturePath,
      case_count: 2,
      summary: {
        passed: 2,
        failed: 0,
      },
    });
    expect(report.cases.map((testCase) => testCase.top?.path)).toEqual([
      "src/metrics/quarterly-extract.ts",
      "src/auth/password-entry.tsx",
    ]);
  });

  it("keeps the checked-in source-evidence fixture passing", async () => {
    const fixturePath = path.join(process.cwd(), "fixtures/link-eval/source-evidence.json");
    const loaded = await loadLinkSuggestionEvalFixture(fixturePath);
    expect(loaded).toMatchObject({
      ok: true,
      suite: "source-evidence",
    });
    if (!loaded.ok) {
      throw new Error(loaded.message);
    }

    const report = evaluateLinkSuggestionRanking({
      suite: loaded.suite,
      fixturePath,
      cases: loaded.cases,
    });

    expect(report).toMatchObject({
      ok: true,
      case_count: 3,
      summary: {
        passed: 3,
        failed: 0,
      },
    });
    expect(report.cases.map((testCase) => testCase.top?.path ?? null)).toEqual([
      "src/metrics/quarterly-extract.ts",
      "src/auth/password-entry.tsx",
      null,
    ]);
    const unrelated = report.cases.find((testCase) => testCase.id === "unrelated-heading");
    expect(unrelated).toMatchObject({
      passed: true,
      suggestions: [],
      rejected_candidates: expect.arrayContaining([
        expect.objectContaining({ path: "src/metrics/quarterly-extract.ts", reason: "NO_SOURCE_EVIDENCE" }),
        expect.objectContaining({ path: "src/auth/password-entry.tsx", reason: "NO_SOURCE_EVIDENCE" }),
        expect.objectContaining({ path: "src/shared/touched-file.ts", reason: "NO_SOURCE_EVIDENCE" }),
      ]),
    });
  });

  it("keeps the checked-in messy PR scorer fixture passing", async () => {
    const fixturePath = path.join(process.cwd(), "fixtures/link-eval/messy-repo-pr-scorer.json");
    const loaded = await loadLinkSuggestionEvalFixture(fixturePath);
    expect(loaded).toMatchObject({
      ok: true,
      suite: "messy-repo-pr-scorer",
    });
    if (!loaded.ok) {
      throw new Error(loaded.message);
    }

    const report = evaluateLinkSuggestionRanking({
      suite: loaded.suite,
      fixturePath,
      cases: loaded.cases,
    });

    expect(report).toMatchObject({
      ok: true,
      case_count: 4,
      summary: {
        passed: 4,
        failed: 0,
        top1_accuracy: 1,
        mean_reciprocal_rank: 1,
      },
    });
    expect(report.cases.map((testCase) => testCase.top?.path ?? null)).toEqual([
      "src/metrics/quarterly-extract.ts",
      "src/auth/password-entry.tsx",
      "src/attio/local-development-client.ts",
      null,
    ]);
    const unrelated = report.cases.find((testCase) => testCase.id === "unrelated-heading");
    expect(unrelated).toMatchObject({
      passed: true,
      suggestions: [],
      rejected_candidates: expect.arrayContaining([
        expect.objectContaining({ path: "src/metrics/quarterly-extract.ts", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
        expect.objectContaining({ path: "src/auth/password-entry.tsx", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
        expect.objectContaining({ path: "src/shared/touched-file.ts", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
      ]),
    });
  });

  it("explains missing expected candidates in fixture failures", () => {
    const [baseCase] = evaluateLinkSuggestionRanking().cases;
    expect(baseCase).toBeDefined();

    const report = evaluateLinkSuggestionRanking({
      suite: "failure-example",
      cases: [
        {
          id: "missing-candidate",
          description: "Expected path is not in candidates.",
          task: {
            id: "TASK-MISSING",
            title: "Missing candidate",
            type: "spec",
            status: "approved",
            space: "repo",
            doc: { path: "docs/eval.md", heading: "Missing candidate" },
            spec: "Missing expected candidate.",
            code: [],
            tests: [],
            gaps: [],
            depends_on: [],
            refs: [],
          },
          candidates: [{ path: "src/other.ts", statuses: ["modified"], sources: ["fixture"], content: "missing candidate\n" }],
          expected: { path: "src/expected.ts", field: "code", max_rank: 1 },
        },
      ],
    });

    expect(report).toMatchObject({
      summary: {
        passed: 0,
        failed: 1,
      },
      cases: [
        expect.objectContaining({
          passed: false,
          failure_reason: "Expected candidate src/expected.ts is missing from fixture candidates.",
        }),
      ],
    });
  });
});
