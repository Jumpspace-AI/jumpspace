import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runScan } from "./scan.js";
import { auditJumpspace } from "./audit.js";

describe("auditJumpspace", () => {
  it("reports a stale index when docs changed after scan", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-audit-"));
    await fs.mkdir(path.join(root, "docs", "specs"), { recursive: true });
    await fs.writeFile(
      path.join(root, "docs", "specs", "example.md"),
      `# Example

## Draft task

<!-- jumpspace
id: JS-001
type: spec
status: draft
code: []
tests: []
depends_on: []
-->

Initial spec.
`,
    );

    await runScan({
      root,
      writeLine: () => {},
      errorLine: () => {},
    });
    await fs.appendFile(path.join(root, "docs", "specs", "example.md"), "\nChanged spec.\n");

    const result = await auditJumpspace(root);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "STALE_INDEX",
        path: ".jumpspace/index.json",
      }),
    );
  });
});
