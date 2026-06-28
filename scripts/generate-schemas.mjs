#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { schemaCatalog, SCHEMA_CONTRACT_VERSION } from "../dist/core/schemas.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "schemas");

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const entries = schemaCatalog.map((definition) => {
  const file = `${definition.name}.schema.json`;
  return {
    name: definition.name,
    command: definition.command,
    description: definition.description,
    file,
  };
});

for (const definition of schemaCatalog) {
  const file = `${definition.name}.schema.json`;
  await writeJson(path.join(outputDir, file), {
    contract_version: SCHEMA_CONTRACT_VERSION,
    name: definition.name,
    command: definition.command,
    description: definition.description,
    schema: definition.schema,
  });
}

await writeJson(path.join(outputDir, "catalog.json"), {
  contract_version: SCHEMA_CONTRACT_VERSION,
  schema_count: entries.length,
  schemas: entries,
});

console.log(`Generated ${entries.length} schema artifact(s) in schemas/.`);

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
