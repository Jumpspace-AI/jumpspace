import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { atomicWriteFile } from "../core/atomicWrite.js";
import { installAgentGuidance, isSkillAgent } from "../core/agentSkills.js";
import { installCiWorkflow, type CiWorkflowProvider } from "../core/ciWorkflow.js";
import { DEFAULT_CONFIG, emptyIndex, ensureParentDir, pathExists, resolveRepoPath } from "../core/config.js";
import { discoverDocs } from "../core/discovery.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { installGitignorePolicy } from "../core/gitignorePolicy.js";
import { recordMutation } from "../core/mutations.js";

export type InitOptions = {
  root?: string;
  force?: boolean;
  auto?: boolean;
  agent?: string;
  ci?: string;
  dryRun?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

type StarterFile = {
  source?: string;
  target: string;
  content?: string;
};

const templateDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../templates");

export async function runInit(options: InitOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const force = options.force ?? false;
  const writeLine = options.writeLine ?? console.log;

  if (options.agent) {
    return runAgentInit(options.agent, {
      root,
      json: options.json,
      writeLine,
      errorLine: options.errorLine,
    });
  }

  if (options.ci) {
    return runCiInit(options.ci, {
      root,
      dryRun: options.dryRun,
      json: options.json,
      writeLine,
      errorLine: options.errorLine,
    });
  }

  const config = options.auto
    ? {
        ...DEFAULT_CONFIG,
        docs: (await discoverDocs(root)).recommended_docs,
      }
    : DEFAULT_CONFIG;
  const files = await starterFiles(config);

  for (const file of files) {
    const targetPath = resolveRepoPath(root, file.target);
    const exists = await pathExists(targetPath);

    if (exists && !force) {
      writeLine(chalk.dim(`skipped ${file.target}`));
      continue;
    }

    await ensureParentDir(targetPath);
    await atomicWriteFile(targetPath, file.content ?? (await readTemplate(file.source ?? "")));
    writeLine(`${exists ? "updated" : "created"} ${file.target}`);
  }

  const gitignore = await installGitignorePolicy(root);
  writeLine(`${gitignore.action === "unchanged" ? "skipped" : gitignore.action} ${gitignore.path}`);

  return 0;
}

async function runAgentInit(
  agent: string,
  options: Pick<InitOptions, "root" | "json" | "writeLine" | "errorLine">,
): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;

  if (!isSkillAgent(agent)) {
    const error = commandError("UNKNOWN_AGENT", `Unknown agent "${agent}". Expected codex or claude.`);
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const file = await installAgentGuidance(root, agent);
  writeLine(options.json ? JSON.stringify({ ok: true, agent, files: [file] }, null, 2) : `${file.action} ${file.path}`);
  return 0;
}

async function runCiInit(
  provider: string,
  options: Pick<InitOptions, "root" | "dryRun" | "json" | "writeLine" | "errorLine">,
): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;

  if (!isCiWorkflowProvider(provider)) {
    const error = commandError("UNKNOWN_CI_PROVIDER", `Unknown CI provider "${provider}". Expected github.`);
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const result = await installCiWorkflow(root, { provider, dryRun: options.dryRun });
  const touchedFiles = result.files.filter((file) => file.changed && file.reason !== "user_owned").map((file) => file.path);
  if (!result.dry_run && touchedFiles.length > 0) {
    await recordMutation(root, {
      command: `init --ci ${provider}`,
      touched_files: touchedFiles,
      index_changed: false,
      warnings: result.warnings,
    });
  }

  if (options.json) {
    writeLine(JSON.stringify(result, null, 2));
  } else {
    for (const file of result.files) {
      const prefix = result.dry_run && file.changed ? wouldAction(file.action) : file.action;
      writeLine(`${prefix} ${file.path}`);
    }
    for (const warning of result.warnings) {
      errorLine(`${warning.code}: ${warning.message}`);
    }
  }
  return 0;
}

function isCiWorkflowProvider(value: string): value is CiWorkflowProvider {
  return value === "github";
}

function wouldAction(action: string): string {
  if (action === "created") {
    return "would create";
  }
  if (action === "updated") {
    return "would update";
  }
  return "would change";
}

async function starterFiles(config = DEFAULT_CONFIG): Promise<StarterFile[]> {
  return [
    {
      target: ".jumpspace/config.json",
      content: `${JSON.stringify(config, null, 2)}\n`,
    },
    {
      target: ".jumpspace/index.json",
      content: `${JSON.stringify(emptyIndex(), null, 2)}\n`,
    },
    {
      source: "example-spec.md",
      target: "docs/specs/example.md",
    },
    {
      source: "AGENTS.md",
      target: "AGENTS.md",
    },
    {
      source: "pull_request_template.md",
      target: ".github/pull_request_template.md",
    },
    {
      source: "jumpspace.yml",
      target: ".github/workflows/jumpspace.yml",
    },
  ];
}

async function readTemplate(name: string): Promise<string> {
  if (!name) {
    throw new Error("Missing template name.");
  }
  return fs.readFile(path.join(templateDir, name), "utf8");
}
