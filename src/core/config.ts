import fs from "node:fs/promises";
import path from "node:path";
import { atomicWriteFile } from "./atomicWrite.js";
import { jumpConfigSchema, jumpIndexSchema, type JumpConfig, type JumpIndex } from "./types.js";

export const CONFIG_PATH = ".jumpspace/config.json";

export const DEFAULT_CONFIG: JumpConfig = {
  docs: ["docs/**/*.md"],
  intents: ["documentation/intents/*.md"],
  indexPath: ".jumpspace/index.json",
};

export function resolveRepoPath(root: string, repoPath: string): string {
  return path.resolve(root, repoPath);
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function loadConfig(root = process.cwd()): Promise<JumpConfig> {
  const configFile = resolveRepoPath(root, CONFIG_PATH);
  if (!(await pathExists(configFile))) {
    return DEFAULT_CONFIG;
  }

  const raw = await fs.readFile(configFile, "utf8");
  const parsed = jumpConfigSchema.parse(JSON.parse(raw));
  return parsed;
}

export async function writeConfig(root: string, config: JumpConfig = DEFAULT_CONFIG): Promise<void> {
  const configFile = resolveRepoPath(root, CONFIG_PATH);
  await atomicWriteFile(configFile, `${JSON.stringify(config, null, 2)}\n`);
}

export async function readIndex(root = process.cwd(), indexPath?: string): Promise<JumpIndex> {
  const activeIndexPath = indexPath ?? (await loadConfig(root)).indexPath;
  const indexFile = resolveRepoPath(root, activeIndexPath);
  const raw = await fs.readFile(indexFile, "utf8");
  return jumpIndexSchema.parse(JSON.parse(raw));
}

export async function writeIndex(root: string, index: JumpIndex, indexPath?: string): Promise<void> {
  const activeIndexPath = indexPath ?? (await loadConfig(root)).indexPath;
  const indexFile = resolveRepoPath(root, activeIndexPath);
  await atomicWriteFile(indexFile, `${JSON.stringify(index, null, 2)}\n`);
}

export function emptyIndex(): JumpIndex {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    tasks: [],
  };
}
