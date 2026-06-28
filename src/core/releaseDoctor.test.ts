import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createReleaseDoctorReport, type ExecFileLike } from "./releaseDoctor.js";
import { schemaCatalog } from "./schemas.js";

describe("createReleaseDoctorReport", () => {
  it("reports local release readiness and leaves registry state unknown by default", async () => {
    const root = await createReleaseFixture();
    const exec = execFixture(packOutput(allPackFiles()));

    const report = await createReleaseDoctorReport(root, {
      checkedAt: "2026-06-26T00:00:00.000Z",
      execFile: exec,
    });

    expect(report).toMatchObject({
      ok: true,
      status: "ready",
      checked_at: "2026-06-26T00:00:00.000Z",
      summary: {
        local_blockers: 0,
        external_warnings: 1,
      },
      package: {
        name: "jumpspace",
        version: "0.1.0",
        license: "MIT",
        license_file: { exists: true },
        bin: {
          name: "jumpspace",
          target: "dist/cli.js",
          exists: true,
          mode: "0755",
          executable: true,
        },
      },
      package_dry_run: {
        ok: true,
        command: "npm pack --dry-run --json",
        exit_code: 0,
      },
      schemas: {
        expected: schemaCatalog.length + 1,
        missing: [],
      },
      registry: {
        status: "unknown",
        check: "not_requested",
        checked: false,
      },
    });
    expect(report.package.metadata_checks.every((check) => check.status === "pass")).toBe(true);
    expect(report.package_dry_run.required_files.every((check) => check.status === "pass")).toBe(true);
    expect(report.external_warnings).toContainEqual(expect.objectContaining({ code: "REGISTRY_CHECK_NOT_REQUESTED" }));
  });

  it("blocks when required package contents are missing from the dry-run", async () => {
    const root = await createReleaseFixture();
    const files = allPackFiles().filter((file) => file !== "dist/cli.js" && file !== "schemas/catalog.json");

    const report = await createReleaseDoctorReport(root, {
      execFile: execFixture(packOutput(files)),
    });

    expect(report.ok).toBe(false);
    expect(report.local_blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PACKAGE_FILE_MISSING",
          path: "dist/cli.js",
        }),
        expect.objectContaining({
          code: "SCHEMA_ARTIFACT_MISSING_FROM_PACKAGE",
          path: "schemas/catalog.json",
        }),
      ]),
    );
  });

  it("can check npm registry availability without making it a local blocker", async () => {
    const root = await createReleaseFixture();
    const exec: ExecFileLike = async (file, args) => {
      if (file === "npm" && args[0] === "pack") {
        return { stdout: packOutput(allPackFiles()), stderr: "" };
      }
      if (file === "npm" && args[0] === "view") {
        return { stdout: JSON.stringify("0.1.0"), stderr: "" };
      }
      throw new Error(`Unexpected command: ${file} ${args.join(" ")}`);
    };

    const report = await createReleaseDoctorReport(root, {
      checkRegistry: true,
      execFile: exec,
    });

    expect(report.ok).toBe(true);
    expect(report.registry).toMatchObject({
      status: "unavailable",
      check: "checked",
      checked: true,
      version: "0.1.0",
    });
    expect(report.external_warnings).toContainEqual(expect.objectContaining({ code: "REGISTRY_NAME_UNAVAILABLE" }));
  });
});

async function createReleaseFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-release-"));
  await fs.mkdir(path.join(root, "dist"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "jumpspace",
        version: "0.1.0",
        license: "MIT",
        repository: { type: "git", url: "https://github.com/christopherrote/jumpspace.git" },
        homepage: "https://github.com/christopherrote/jumpspace#readme",
        bugs: { url: "https://github.com/christopherrote/jumpspace/issues" },
        keywords: ["ai", "agents", "developer-tools"],
        bin: { jumpspace: "./dist/cli.js" },
      },
      null,
      2,
    ),
  );
  await fs.writeFile(path.join(root, "LICENSE"), "MIT\n");
  await fs.writeFile(path.join(root, "dist", "cli.js"), "#!/usr/bin/env node\n");
  await fs.chmod(path.join(root, "dist", "cli.js"), 0o755);
  return root;
}

function allPackFiles(): string[] {
  return [
    "package.json",
    "README.md",
    "LICENSE",
    "dist/cli.js",
    "dist/templates/AGENTS.md",
    "dist/templates/SKILL.md",
    "dist/sdk/contracts.js",
    "dist/sdk/contracts.d.ts",
    "sdk/python/jumpspace_sdk/contracts.py",
    "sdk/python/pyproject.toml",
    "schemas/catalog.json",
    ...schemaCatalog.map((schema) => `schemas/${schema.name}.schema.json`),
  ];
}

function packOutput(files: string): string;
function packOutput(files: string[]): string;
function packOutput(files: string | string[]): string {
  const fileList = Array.isArray(files) ? files : [files];
  return JSON.stringify([
    {
      id: "jumpspace@0.1.0",
      name: "jumpspace",
      version: "0.1.0",
      filename: "jumpspace-0.1.0.tgz",
      entryCount: fileList.length,
      files: fileList.map((filePath) => ({
        path: filePath,
        size: 1,
        mode: filePath === "dist/cli.js" ? 493 : 420,
      })),
    },
  ]);
}

function execFixture(stdout: string): ExecFileLike {
  return async (file, args) => {
    if (file === "npm" && args[0] === "pack") {
      return { stdout, stderr: "" };
    }
    throw new Error(`Unexpected command: ${file} ${args.join(" ")}`);
  };
}
