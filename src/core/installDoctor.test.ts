import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createInstallDoctorReport, type ExecFileLike } from "./installDoctor.js";
import { schemaCatalog } from "./schemas.js";

describe("createInstallDoctorReport", () => {
  it("reports a current linked install when invoked and PATH binaries match workspace dist", async () => {
    const current = await createInstallFixture("0.1.0");
    const exec = execFixture([
      { root: current.root, version: "0.1.0", schemaCount: schemaCatalog.length },
    ]);

    const report = await createInstallDoctorReport(current.root, {
      checkedAt: "2026-06-26T00:00:00.000Z",
      argv1: current.distCli,
      execPath: process.execPath,
      env: { PATH: current.binDir },
      execFile: exec,
    });

    expect(report).toMatchObject({
      ok: true,
      checked_at: "2026-06-26T00:00:00.000Z",
      status: "current",
      summary: {
        blockers: 0,
        warnings: 0,
        repair_commands: 0,
      },
      workspace: {
        is_jumpspace_checkout: true,
        package_version: "0.1.0",
        dist_cli_exists: true,
        dist_cli_executable: true,
        schema_count: schemaCatalog.length,
      },
      binaries: {
        invoked: {
          path: current.distCli,
          realpath: current.distCliRealpath,
          package_version: "0.1.0",
          cli_version: "0.1.0",
          schema_count: schemaCatalog.length,
        },
        path: {
          path: current.binCli,
          realpath: current.distCliRealpath,
          package_version: "0.1.0",
          cli_version: "0.1.0",
          schema_count: schemaCatalog.length,
        },
      },
      comparisons: {
        invoked_matches_workspace_dist: true,
        path_matches_workspace_dist: true,
        invoked_matches_path_binary: true,
        invoked_cli_version_matches_workspace: true,
        path_cli_version_matches_workspace: true,
        invoked_schema_count_matches_workspace: true,
        path_schema_count_matches_workspace: true,
      },
      warnings: [],
      blockers: [],
      repair_commands: [],
    });
  });

  it("surfaces stale invoked and PATH binaries with concrete repair commands", async () => {
    const current = await createInstallFixture("0.1.0");
    const stale = await createInstallFixture("0.0.0");
    const exec = execFixture([
      { root: current.root, version: "0.1.0", schemaCount: schemaCatalog.length },
      { root: stale.root, version: "0.0.0", schemaCount: 12 },
    ]);

    const report = await createInstallDoctorReport(current.root, {
      checkedAt: "2026-06-26T00:00:00.000Z",
      argv1: stale.binCli,
      execPath: process.execPath,
      env: { PATH: stale.binDir },
      execFile: exec,
    });

    expect(report.ok).toBe(true);
    expect(report.status).toBe("attention");
    expect(report.comparisons).toMatchObject({
      invoked_matches_workspace_dist: false,
      path_matches_workspace_dist: false,
      invoked_matches_path_binary: true,
      invoked_cli_version_matches_workspace: false,
      path_cli_version_matches_workspace: false,
      invoked_schema_count_matches_workspace: false,
      path_schema_count_matches_workspace: false,
    });
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVOKED_BINARY_NOT_WORKSPACE_DIST", command: "npm link" }),
        expect.objectContaining({ code: "PATH_BINARY_NOT_WORKSPACE_DIST", command: "npm link" }),
        expect.objectContaining({ code: "INVOKED_CLI_VERSION_MISMATCH", actual: "0.0.0", expected: "0.1.0" }),
        expect.objectContaining({ code: "PATH_CLI_VERSION_MISMATCH", actual: "0.0.0", expected: "0.1.0" }),
        expect.objectContaining({ code: "SCHEMA_COUNT_MISMATCH", actual: "12", expected: String(schemaCatalog.length) }),
      ]),
    );
    expect(report.repair_commands).toEqual(expect.arrayContaining(["npm link", "npm run build", "npm run generate:schemas"]));
  });
});

type ExecFixtureEntry = {
  root: string;
  version: string;
  schemaCount: number;
};

async function createInstallFixture(version: string): Promise<{ root: string; distCli: string; distCliRealpath: string; binDir: string; binCli: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-install-"));
  const distDir = path.join(root, "dist");
  const binDir = path.join(root, "bin");
  const distCli = path.join(distDir, "cli.js");
  const binCli = path.join(binDir, "jumpspace");
  await fs.mkdir(distDir, { recursive: true });
  await fs.mkdir(binDir, { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "jumpspace",
        version,
      },
      null,
      2,
    ),
  );
  await fs.writeFile(distCli, "#!/usr/bin/env node\n");
  await fs.chmod(distCli, 0o755);
  await fs.symlink(distCli, binCli);
  return { root, distCli, distCliRealpath: await fs.realpath(distCli), binDir, binCli };
}

function execFixture(entries: ExecFixtureEntry[]): ExecFileLike {
  return async (file, args) => {
    const entry = entries.find((candidate) => path.resolve(file).startsWith(candidate.root));
    if (!entry) {
      throw new Error(`Unexpected command: ${file} ${args.join(" ")}`);
    }
    if (args[0] === "--version") {
      return { stdout: `${entry.version}\n`, stderr: "" };
    }
    if (args[0] === "schema" && args[1] === "list" && args[2] === "--json") {
      return {
        stdout: JSON.stringify({
          ok: true,
          contract_version: 1,
          schemas: Array.from({ length: entry.schemaCount }, (_, index) => ({
            name: `schema.${index}`,
            command: `command ${index}`,
            description: `schema ${index}`,
          })),
        }),
        stderr: "",
      };
    }
    throw new Error(`Unexpected command: ${file} ${args.join(" ")}`);
  };
}
