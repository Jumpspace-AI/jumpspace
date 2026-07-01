import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("package hygiene", () => {
  it("cleans dist before build and packages only intentional Python SDK files", async () => {
    const packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.name).toBe("@jumpspace/cli");
    expect(packageJson.version).not.toBe("0.0.0");
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
    expect(packageJson.license).toBe("Apache-2.0");
    expect(packageJson.publishConfig).toMatchObject({ access: "public" });
    expect(packageJson.bin).toMatchObject({ jumpspace: "dist/cli.js" });
    expect(packageJson.repository).toMatchObject({
      type: "git",
      url: expect.stringContaining("github.com/Jumpspace-AI/jumpspace"),
    });
    expect(packageJson.homepage).toContain("github.com/Jumpspace-AI/jumpspace");
    expect(packageJson.bugs).toMatchObject({
      url: expect.stringContaining("github.com/Jumpspace-AI/jumpspace/issues"),
    });
    expect(packageJson.keywords).toEqual(expect.arrayContaining(["ai", "agents", "developer-tools", "knowledge-graph"]));
    expect(packageJson.scripts.clean).toContain("rmSync('dist'");
    expect(packageJson.scripts.build).toMatch(/^npm run clean && tsc && npm run copy:templates && node scripts\/fix-bin-mode\.mjs$/);
    expect(packageJson.scripts).toMatchObject({
      "release:patch": "npm version patch",
      "release:minor": "npm version minor",
      "release:major": "npm version major",
      "release:prerelease": "npm version prerelease --preid alpha",
    });
    expect(packageJson.files).toEqual(
      expect.arrayContaining([
        "dist",
        "LICENSE",
        "NOTICE",
        "TRADEMARKS.md",
        "schemas/*.json",
        "sdk/python/jumpspace_sdk/*.py",
        "sdk/python/pyproject.toml",
      ]),
    );
    expect(packageJson.exports).toMatchObject({
      "./schemas/catalog.json": "./schemas/catalog.json",
      "./schemas/*.schema.json": "./schemas/*.schema.json",
    });
    expect(packageJson.files).not.toContain("sdk/python");
    await expect(fs.access(path.join(process.cwd(), "LICENSE"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(process.cwd(), "NOTICE"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(process.cwd(), "TRADEMARKS.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(process.cwd(), "scripts/fix-bin-mode.mjs"))).resolves.toBeUndefined();
  });

  it("keeps the CLI-visible version in sync with package metadata", async () => {
    const root = process.cwd();
    const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    const tsxLoaderPath = path.join(root, "node_modules/tsx/dist/loader.mjs");
    const cliPath = path.join(root, "src/cli.ts");
    const { stdout } = await execFileAsync(process.execPath, ["--import", tsxLoaderPath, cliPath, "--version"], {
      cwd: root,
    });

    expect(stdout.trim()).toBe(packageJson.version);
  });
});
