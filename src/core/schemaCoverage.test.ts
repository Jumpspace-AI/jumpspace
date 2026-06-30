import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkSchemaCoverage } from "./schemaCoverage.js";
import { jsonCommandContracts, schemaCatalog } from "./schemas.js";
import { JUMPSPACE_SCHEMA_NAMES } from "../sdk/contracts.js";

describe("schema coverage", () => {
  it("passes when declarations, catalog, generated artifacts, and SDK names agree", async () => {
    const report = await checkSchemaCoverage({
      root: process.cwd(),
      sdkSchemaNames: JUMPSPACE_SCHEMA_NAMES,
    });

    expect(report).toMatchObject({
      ok: true,
      summary: {
        missing: 0,
        orphaned: 0,
        stale: 0,
        errors: 0,
      },
    });
    expect(report.declared.map((schema) => schema.name)).toEqual(schemaCatalog.map((schema) => schema.name));
  });

  it("detects declared JSON commands without catalog schemas", async () => {
    const report = await checkSchemaCoverage({
      declarations: [
        ...jsonCommandContracts,
        {
          name: "missing.command",
          command: "jumpspace missing --json",
          description: "Missing command schema.",
        },
      ],
      checkArtifacts: false,
    });

    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "MISSING_SCHEMA_CATALOG_ENTRY",
      name: "missing.command",
    }));
  });

  it("detects catalog entries without declared JSON commands", async () => {
    const report = await checkSchemaCoverage({
      declarations: jsonCommandContracts.filter((schema) => schema.name !== "task.ask"),
      checkArtifacts: false,
    });

    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "ORPHANED_SCHEMA_CATALOG_ENTRY",
      name: "task.ask",
    }));
  });

  it("detects SDK schema-name drift", async () => {
    const report = await checkSchemaCoverage({
      sdkSchemaNames: JUMPSPACE_SCHEMA_NAMES.filter((name) => name !== "task.work"),
      checkArtifacts: false,
    });

    expect(report.ok).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "MISSING_SDK_SCHEMA_NAME",
      name: "task.work",
    }));
  });

  it("detects stale and missing generated schema artifacts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-schema-coverage-"));
    await fs.mkdir(path.join(root, "schemas"), { recursive: true });
    await fs.writeFile(path.join(root, "schemas/catalog.json"), JSON.stringify({ stale: true }, null, 2));

    const report = await checkSchemaCoverage({
      root,
      sdkSchemaNames: JUMPSPACE_SCHEMA_NAMES,
    });

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "STALE_SCHEMA_CATALOG_ARTIFACT" }),
      expect.objectContaining({ code: "MISSING_SCHEMA_ARTIFACT", name: "error" }),
    ]));
  });
});
