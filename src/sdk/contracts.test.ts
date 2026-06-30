import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSchema, jsonCommandContracts, listSchemas } from "../core/schemas.js";
import {
  assertOk,
  getSdkSchema,
  isJumpspaceErrorEnvelope,
  isJumpspaceSchemaName,
  JUMPSPACE_CONTRACT_VERSION,
  JUMPSPACE_SCHEMA_NAMES,
  listSdkSchemas,
  type FindCommandResult,
  type JumpspaceCommandResult,
} from "./contracts.js";

describe("TypeScript SDK contracts", () => {
  it("keeps SDK schema names in lockstep with the schema catalog", async () => {
    const generatedCatalog = JSON.parse(await fs.readFile(path.join(process.cwd(), "schemas/catalog.json"), "utf8"));

    expect(JUMPSPACE_CONTRACT_VERSION).toBe(1);
    expect(JUMPSPACE_SCHEMA_NAMES).toEqual(jsonCommandContracts.map((schema) => schema.name));
    expect(JUMPSPACE_SCHEMA_NAMES).toEqual(listSchemas().map((schema) => schema.name));
    expect(JUMPSPACE_SCHEMA_NAMES).toEqual(generatedCatalog.schemas.map((schema: { name: string }) => schema.name));
    expect(listSdkSchemas()).toEqual(listSchemas());
    expect(getSdkSchema("task.bootstrap.propose")).toEqual(getSchema("task.bootstrap.propose"));

    for (const schemaName of JUMPSPACE_SCHEMA_NAMES) {
      const artifact = JSON.parse(await fs.readFile(path.join(process.cwd(), "schemas", `${schemaName}.schema.json`), "utf8"));
      expect(artifact).toMatchObject({
        contract_version: JUMPSPACE_CONTRACT_VERSION,
        name: schemaName,
      });
      expect(artifact.schema).toEqual(getSchema(schemaName)?.schema);
    }
  });

  it("guards schema names and error envelopes", () => {
    expect(isJumpspaceSchemaName("task.work")).toBe(true);
    expect(isJumpspaceSchemaName("nope")).toBe(false);
    expect(isJumpspaceErrorEnvelope({ ok: false, errors: [{ code: "NOPE", message: "Nope." }] })).toBe(true);
    expect(isJumpspaceErrorEnvelope({ ok: true, errors: [] })).toBe(false);
  });

  it("supports typed command result handling", () => {
    const ok: JumpspaceCommandResult<FindCommandResult> = {
      query: "approval",
      mode: "all",
      results: [],
    };
    const failure: JumpspaceCommandResult<FindCommandResult> = {
      ok: false,
      errors: [{ code: "INVALID_FIND_MODE", message: "Invalid find mode." }],
    };

    expect(assertOk(ok).mode).toBe("all");
    expect(() => assertOk(failure)).toThrow("Invalid find mode.");
  });
});
