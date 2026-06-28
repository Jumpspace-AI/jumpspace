import { commandError, errorEnvelope } from "../core/errors.js";
import { checkSchemaCoverage, type SchemaCoverageReport } from "../core/schemaCoverage.js";
import { getSchema, listSchemas, SCHEMA_CONTRACT_VERSION } from "../core/schemas.js";
import { JUMPSPACE_SCHEMA_NAMES } from "../sdk/contracts.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SchemaOptions = {
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runSchemaList(options: SchemaOptions = {}): Promise<number> {
  const writeLine = options.writeLine ?? console.log;
  const payload = {
    ok: true,
    contract_version: SCHEMA_CONTRACT_VERSION,
    schemas: listSchemas(),
  };

  if (options.json) {
    writeLine(JSON.stringify(payload, null, 2));
  } else {
    writeLine(formatSchemaList(payload.schemas));
  }
  return 0;
}

export async function runSchemaShow(name: string, options: SchemaOptions = {}): Promise<number> {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const schema = getSchema(name);

  if (!schema) {
    const error = commandError("UNKNOWN_SCHEMA", `Unknown schema "${name}". Run \`jumpspace schema list\` to see available schemas.`);
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const payload = {
    ok: true,
    contract_version: SCHEMA_CONTRACT_VERSION,
    schema,
  };

  if (options.json) {
    writeLine(JSON.stringify(payload, null, 2));
  } else {
    writeLine(formatSchema(schema));
  }
  return 0;
}

export async function runSchemaCoverage(options: SchemaOptions = {}): Promise<number> {
  const writeLine = options.writeLine ?? console.log;
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const payload = await checkSchemaCoverage({
    root: packageRoot,
    sdkSchemaNames: JUMPSPACE_SCHEMA_NAMES,
  });

  if (options.json) {
    writeLine(JSON.stringify(payload, null, 2));
  } else {
    writeLine(formatSchemaCoverage(payload));
  }

  return payload.ok ? 0 : 1;
}

function formatSchemaList(schemas: ReturnType<typeof listSchemas>): string {
  const rows = schemas.map((schema) => [schema.name, schema.command, schema.description]);
  const headers = ["NAME", "COMMAND", "DESCRIPTION"];
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)) + (index === headers.length - 1 ? 0 : 2),
  );
  const formatRow = (row: string[]) => row.map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index]))).join("");
  return [formatRow(headers), ...rows.map(formatRow)].join("\n");
}

function formatSchema(schema: NonNullable<ReturnType<typeof getSchema>>): string {
  return [
    `# ${schema.name}`,
    "",
    `Command: ${schema.command}`,
    "",
    schema.description,
    "",
    "```json",
    JSON.stringify(schema.schema, null, 2),
    "```",
  ].join("\n");
}

function formatSchemaCoverage(report: SchemaCoverageReport): string {
  const lines = [
    `Schema coverage: ${report.ok ? "ok" : "failed"}`,
    "",
    `Declared commands: ${report.summary.declared}`,
    `Catalog entries: ${report.summary.catalog}`,
    `Generated artifacts: ${report.summary.artifacts}`,
    `SDK schema names: ${report.summary.sdk_names}`,
    `Issues: ${report.summary.issues} (${report.summary.errors} error${report.summary.errors === 1 ? "" : "s"})`,
  ];

  if (report.issues.length > 0) {
    lines.push("");
    for (const issue of report.issues) {
      const subject = issue.name ?? issue.path ?? issue.command;
      lines.push(`- [${issue.severity}] ${issue.code}: ${issue.message}${subject ? ` (${subject})` : ""}`);
    }
  }

  return lines.join("\n");
}
