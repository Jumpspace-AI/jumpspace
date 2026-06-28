import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { jsonCommandContracts, schemaCatalog, SCHEMA_CONTRACT_VERSION } from "./core/schemas.js";

describe("generated schema artifacts", () => {
  it("matches the canonical schema catalog", async () => {
    const root = process.cwd();
    const catalog = await readJson(path.join(root, "schemas/catalog.json"));

    expect(catalog).toEqual({
      contract_version: SCHEMA_CONTRACT_VERSION,
      schema_count: schemaCatalog.length,
      schemas: schemaCatalog.map((schema) => ({
        name: schema.name,
        command: schema.command,
        description: schema.description,
        file: `${schema.name}.schema.json`,
      })),
    });
    expect(jsonCommandContracts.map((schema) => schema.name)).toEqual(schemaCatalog.map((schema) => schema.name));

    for (const schema of schemaCatalog) {
      const artifact = await readJson(path.join(root, "schemas", `${schema.name}.schema.json`));
      expect(artifact).toEqual({
        contract_version: SCHEMA_CONTRACT_VERSION,
        name: schema.name,
        command: schema.command,
        description: schema.description,
        schema: schema.schema,
      });
    }
  });
});

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}
