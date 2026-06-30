import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkIntentsForPaths, loadIntents, verifyIntentsForPaths } from "./intents.js";

describe("intents", () => {
  it("loads default intent roots and matches active intents by scoped paths", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-intents-"));
    await writeIntent(
      root,
      "documentation/intents/retry-policy.md",
      `---
id: retry-policy
status: active
scope: src/inngest/functions/*.ts, src/lib/retry.ts
---

# Inngest functions propagate transient errors

## Decision
Production dependencies let transient errors throw.

## Why
Inngest retries failed steps, but cannot retry swallowed errors.

## Alternatives rejected
- **Return null on failure.** Converts transient failures into successful missing-record outcomes.
`,
    );
    const loaded = await loadIntents(root);
    expect(loaded.roots).toEqual(["documentation/intents/*.md"]);
    expect(loaded.intents.map((intent) => intent.id)).toEqual(["retry-policy"]);
    expect(loaded.issues).toEqual([]);

    const checked = await checkIntentsForPaths(["src/inngest/functions/send.ts", "src/other.ts"], root);
    expect(checked.matched_intent_count).toBe(1);
    expect(checked.matches[0].intent.id).toBe("retry-policy");
    expect(checked.matches[0].matched_paths).toEqual(["src/inngest/functions/send.ts"]);
    expect(checked.unmatched_paths).toEqual(["src/other.ts"]);

    const windowsStylePath = await checkIntentsForPaths(["src\\inngest\\functions\\send.ts"], root);
    expect(windowsStylePath.matches[0].matched_paths).toEqual(["src/inngest/functions/send.ts"]);
  });

  it("validates duplicate ids and warns when active intents omit rejected alternatives", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-intents-invalid-"));
    await writeIntent(
      root,
      "documentation/intents/one.md",
      `---
id: duplicate
status: active
scope: src/**/*.ts
---

# Duplicate one

## Decision
One.

## Why
Because.
`,
    );
    await writeIntent(
      root,
      "documentation/intents/two.md",
      `---
id: duplicate
status: active
scope: src/**/*.ts
---

# Duplicate two

## Decision
Two.

## Why
Because.

## Alternatives rejected
- **Other.** No.
`,
    );

    const loaded = await loadIntents(root);
    expect(loaded.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["INTENT_DUPLICATE_ID", "INTENT_MISSING_REJECTED_ALTERNATIVES"]),
    );
    expect(loaded.issues.find((issue) => issue.code === "INTENT_DUPLICATE_ID")?.severity).toBe("error");
    expect(loaded.issues.find((issue) => issue.code === "INTENT_MISSING_REJECTED_ALTERNATIVES")?.severity).toBe("warning");
  });

  it("produces PR-level verification results without claiming semantic consistency", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-intents-verify-"));
    await writeIntent(
      root,
      "documentation/intents/env-tests.md",
      `---
id: env-tests
status: active
scope: src/**/*.test.ts
---

# Tests seed env before dynamic import

## Decision
Env-validating modules load after test env seeding.

## Why
Top-level imports validate too early.

## Alternatives rejected
- **Use top-level imports.** They fail before seeding.
`,
    );

    const result = await verifyIntentsForPaths(["src/foo.test.ts", "src/foo.ts"], { root });
    expect(result.summary).toEqual({
      consistent: 0,
      possible_violation: 0,
      unknown: 1,
      not_applicable: 1,
    });
    expect(result.results[0]).toMatchObject({
      status: "unknown",
      intent: { id: "env-tests" },
      paths: ["src/foo.test.ts"],
    });
    expect(result.results[1]).toMatchObject({
      status: "not_applicable",
      paths: ["src/foo.ts"],
    });
  });

  it("matches scopes with micromatch arrays, braces, and negation", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-intents-globs-"));
    await writeIntent(
      root,
      "documentation/intents/micromatch-scope.md",
      `---
id: micromatch-scope
status: active
scope:
  - src/{api,web}/**/*.ts
  - "!src/web/**/*.test.ts"
---

# Intent scopes use standard glob matching

## Decision
Scope matching uses micromatch-compatible patterns.

## Why
Intent roots should not invent a smaller glob language than the codebase already uses.

## Alternatives rejected
- **Custom wildcard parser.** It misses common glob syntax.
`,
    );

    const checked = await checkIntentsForPaths(["src/api/users.ts", "src/web/button.test.ts"], root);
    expect(checked.matches[0].matched_paths).toEqual(["src/api/users.ts"]);
    expect(checked.unmatched_paths).toEqual(["src/web/button.test.ts"]);
  });
});

async function writeIntent(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}
