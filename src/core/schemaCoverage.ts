import fs from "node:fs/promises";
import path from "node:path";
import {
  jsonCommandContracts,
  schemaCatalog,
  SCHEMA_CONTRACT_VERSION,
  type JsonCommandContractDeclaration,
  type JsonSchemaDefinition,
  type SchemaListEntry,
} from "./schemas.js";

export type SchemaCoverageIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  name?: string;
  path?: string;
  command?: string;
};

export type SchemaCoverageReport = {
  ok: boolean;
  contract_version: typeof SCHEMA_CONTRACT_VERSION;
  summary: {
    declared: number;
    catalog: number;
    artifacts: number;
    sdk_names: number;
    missing: number;
    orphaned: number;
    stale: number;
    issues: number;
    errors: number;
  };
  declared: JsonCommandContractDeclaration[];
  catalog: SchemaListEntry[];
  generated: {
    schema_dir: string;
    catalog_path: string;
    artifact_count: number;
  };
  sdk: {
    name_count: number;
    schema_names: string[];
  };
  issues: SchemaCoverageIssue[];
};

export type SchemaCoverageOptions = {
  root?: string;
  schemaDir?: string;
  declarations?: readonly JsonCommandContractDeclaration[];
  catalog?: readonly JsonSchemaDefinition[];
  sdkSchemaNames?: readonly string[];
  checkArtifacts?: boolean;
};

export async function checkSchemaCoverage(options: SchemaCoverageOptions = {}): Promise<SchemaCoverageReport> {
  const root = options.root ?? process.cwd();
  const schemaDir = options.schemaDir ?? path.join(root, "schemas");
  const catalogPath = path.join(schemaDir, "catalog.json");
  const declarations = [...(options.declarations ?? jsonCommandContracts)];
  const catalog = [...(options.catalog ?? schemaCatalog)];
  const sdkSchemaNames = [...(options.sdkSchemaNames ?? catalog.map((schema) => schema.name))];
  const issues: SchemaCoverageIssue[] = [];

  const declarationsByName = groupByName(declarations);
  const catalogByName = groupByName(catalog);

  for (const [name, entries] of declarationsByName) {
    if (entries.length > 1) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_SCHEMA_DECLARATION",
        message: `Schema command declaration "${name}" appears ${entries.length} times.`,
        name,
      });
    }
  }

  for (const [name, entries] of catalogByName) {
    if (entries.length > 1) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_SCHEMA_CATALOG_ENTRY",
        message: `Schema catalog entry "${name}" appears ${entries.length} times.`,
        name,
      });
    }
  }

  for (const declaration of declarations) {
    const catalogEntry = catalogByName.get(declaration.name)?.[0];
    if (!catalogEntry) {
      issues.push({
        severity: "error",
        code: "MISSING_SCHEMA_CATALOG_ENTRY",
        message: `Declared JSON command "${declaration.name}" has no schema catalog entry.`,
        name: declaration.name,
        command: declaration.command,
      });
      continue;
    }

    if (catalogEntry.command !== declaration.command || catalogEntry.description !== declaration.description) {
      issues.push({
        severity: "error",
        code: "STALE_SCHEMA_METADATA",
        message: `Schema catalog metadata for "${declaration.name}" does not match the declared command contract.`,
        name: declaration.name,
        command: declaration.command,
      });
    }
  }

  for (const catalogEntry of catalog) {
    if (!declarationsByName.has(catalogEntry.name)) {
      issues.push({
        severity: "error",
        code: "ORPHANED_SCHEMA_CATALOG_ENTRY",
        message: `Schema catalog entry "${catalogEntry.name}" is not declared as a JSON command contract.`,
        name: catalogEntry.name,
        command: catalogEntry.command,
      });
    }
  }

  compareSdkNames(catalog, sdkSchemaNames, issues);

  const artifactCount = await checkGeneratedArtifacts({
    schemaDir,
    catalogPath,
    catalog,
    issues,
    enabled: options.checkArtifacts !== false,
  });

  const missing = issues.filter((issue) => issue.code.startsWith("MISSING_")).length;
  const orphaned = issues.filter((issue) => issue.code.startsWith("ORPHANED_")).length;
  const stale = issues.filter((issue) => issue.code.startsWith("STALE_") || issue.code.startsWith("DUPLICATE_")).length;
  const errors = issues.filter((issue) => issue.severity === "error").length;

  return {
    ok: errors === 0,
    contract_version: SCHEMA_CONTRACT_VERSION,
    summary: {
      declared: declarations.length,
      catalog: catalog.length,
      artifacts: artifactCount,
      sdk_names: sdkSchemaNames.length,
      missing,
      orphaned,
      stale,
      issues: issues.length,
      errors,
    },
    declared: declarations.map(copyContractEntry),
    catalog: catalog.map(({ name, command, description }) => ({ name, command, description })),
    generated: {
      schema_dir: schemaDir,
      catalog_path: catalogPath,
      artifact_count: artifactCount,
    },
    sdk: {
      name_count: sdkSchemaNames.length,
      schema_names: sdkSchemaNames,
    },
    issues,
  };
}

function compareSdkNames(catalog: JsonSchemaDefinition[], sdkSchemaNames: string[], issues: SchemaCoverageIssue[]): void {
  const catalogNames = new Set(catalog.map((schema) => schema.name));
  const sdkNames = new Set<string>();

  for (const name of sdkSchemaNames) {
    if (sdkNames.has(name)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_SDK_SCHEMA_NAME",
        message: `SDK schema name "${name}" appears more than once.`,
        name,
      });
    }
    sdkNames.add(name);

    if (!catalogNames.has(name)) {
      issues.push({
        severity: "error",
        code: "ORPHANED_SDK_SCHEMA_NAME",
        message: `SDK schema name "${name}" has no schema catalog entry.`,
        name,
      });
    }
  }

  for (const name of catalogNames) {
    if (!sdkNames.has(name)) {
      issues.push({
        severity: "error",
        code: "MISSING_SDK_SCHEMA_NAME",
        message: `Schema catalog entry "${name}" is not exposed by the SDK schema-name surface.`,
        name,
      });
    }
  }
}

async function checkGeneratedArtifacts(options: {
  schemaDir: string;
  catalogPath: string;
  catalog: JsonSchemaDefinition[];
  issues: SchemaCoverageIssue[];
  enabled: boolean;
}): Promise<number> {
  if (!options.enabled) {
    return 0;
  }

  const expectedCatalog = {
    contract_version: SCHEMA_CONTRACT_VERSION,
    schema_count: options.catalog.length,
    schemas: options.catalog.map((schema) => ({
      name: schema.name,
      command: schema.command,
      description: schema.description,
      file: `${schema.name}.schema.json`,
    })),
  };

  const artifactFiles = await listSchemaArtifactFiles(options.schemaDir);
  const artifactNames = new Set(artifactFiles);

  await compareJsonArtifact({
    filePath: options.catalogPath,
    expected: expectedCatalog,
    missingCode: "MISSING_SCHEMA_CATALOG_ARTIFACT",
    staleCode: "STALE_SCHEMA_CATALOG_ARTIFACT",
    missingMessage: "Generated schema catalog artifact is missing.",
    staleMessage: "Generated schema catalog artifact is stale.",
    issues: options.issues,
  });

  for (const schema of options.catalog) {
    const fileName = `${schema.name}.schema.json`;
    const artifactPath = path.join(options.schemaDir, fileName);
    await compareJsonArtifact({
      filePath: artifactPath,
      expected: {
        contract_version: SCHEMA_CONTRACT_VERSION,
        name: schema.name,
        command: schema.command,
        description: schema.description,
        schema: schema.schema,
      },
      missingCode: "MISSING_SCHEMA_ARTIFACT",
      staleCode: "STALE_SCHEMA_ARTIFACT",
      missingMessage: `Generated schema artifact "${fileName}" is missing.`,
      staleMessage: `Generated schema artifact "${fileName}" is stale.`,
      name: schema.name,
      command: schema.command,
      issues: options.issues,
    });
    artifactNames.delete(fileName);
  }

  for (const fileName of [...artifactNames].sort()) {
    options.issues.push({
      severity: "error",
      code: "ORPHANED_SCHEMA_ARTIFACT",
      message: `Generated schema artifact "${fileName}" does not map to a schema catalog entry.`,
      path: path.join(options.schemaDir, fileName),
    });
  }

  return artifactFiles.length;
}

async function compareJsonArtifact(options: {
  filePath: string;
  expected: unknown;
  missingCode: string;
  staleCode: string;
  missingMessage: string;
  staleMessage: string;
  issues: SchemaCoverageIssue[];
  name?: string;
  command?: string;
}): Promise<void> {
  const actual = await readJsonIfPresent(options.filePath);
  if (actual === undefined) {
    options.issues.push({
      severity: "error",
      code: options.missingCode,
      message: options.missingMessage,
      name: options.name,
      path: options.filePath,
      command: options.command,
    });
    return;
  }

  if (!jsonEqual(actual, options.expected)) {
    options.issues.push({
      severity: "error",
      code: options.staleCode,
      message: options.staleMessage,
      name: options.name,
      path: options.filePath,
      command: options.command,
    });
  }
}

async function readJsonIfPresent(filePath: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (isMissingPath(error)) {
      return undefined;
    }
    return Symbol.for("jumpspace.invalid-json");
  }
}

async function listSchemaArtifactFiles(schemaDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(schemaDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (isMissingPath(error)) {
      return [];
    }
    throw error;
  }
}

function groupByName<T extends { name: string }>(entries: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    groups.set(entry.name, [...(groups.get(entry.name) ?? []), entry]);
  }
  return groups;
}

function copyContractEntry(entry: JsonCommandContractDeclaration): JsonCommandContractDeclaration {
  return {
    name: entry.name,
    command: entry.command,
    description: entry.description,
  };
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}
