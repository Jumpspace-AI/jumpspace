import fs from "node:fs/promises";
import { atomicWriteFile } from "./atomicWrite.js";
import { pathExists, resolveRepoPath } from "./config.js";

export type GitignorePolicyFileAction = "created" | "updated" | "unchanged";

export type GitignorePolicyFile = {
  path: typeof JUMPSPACE_GITIGNORE_PATH;
  action: GitignorePolicyFileAction;
  changed: boolean;
  managed: true;
  reason: "missing" | "managed_block" | "already_current" | "appended";
};

export const JUMPSPACE_GITIGNORE_PATH = ".gitignore";
export const JUMPSPACE_GITIGNORE_BLOCK = "gitignore";

export const JUMPSPACE_GITIGNORE_PATTERNS = [
  ".jumpspace/locks/",
  ".jumpspace/semantic-index.json",
  ".jumpspace/semantic-lancedb/",
  "/jumpspace-bootstrap.json",
  "/jumpspace-bootstrap-context.json",
] as const;

const startMarker = `# BEGIN JUMPSPACE MANAGED: ${JUMPSPACE_GITIGNORE_BLOCK}`;
const endMarker = `# END JUMPSPACE MANAGED: ${JUMPSPACE_GITIGNORE_BLOCK}`;

export async function installGitignorePolicy(root: string): Promise<GitignorePolicyFile> {
  const absolutePath = resolveRepoPath(root, JUMPSPACE_GITIGNORE_PATH);
  const exists = await pathExists(absolutePath);
  const existing = exists ? await fs.readFile(absolutePath, "utf8") : undefined;
  const next = upsertGitignorePolicy(existing);
  const file = gitignoreFileState(existing, next);

  if (file.changed) {
    await atomicWriteFile(absolutePath, next);
  }

  return file;
}

export function upsertGitignorePolicy(existing: string | undefined): string {
  const block = `${startMarker}\n${gitignorePolicyContent()}\n${endMarker}`;
  const current = existing?.trimEnd();

  if (!current) {
    return `${block}\n`;
  }

  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (pattern.test(current)) {
    return `${current.replace(pattern, block)}\n`;
  }

  return `${current}\n\n${block}\n`;
}

function gitignorePolicyContent(): string {
  return [
    "# Runtime mutex files",
    JUMPSPACE_GITIGNORE_PATTERNS[0],
    "",
    "# Derived semantic retrieval caches",
    JUMPSPACE_GITIGNORE_PATTERNS[1],
    JUMPSPACE_GITIGNORE_PATTERNS[2],
    "",
    "# One-shot bootstrap proposal files",
    JUMPSPACE_GITIGNORE_PATTERNS[3],
    JUMPSPACE_GITIGNORE_PATTERNS[4],
  ].join("\n");
}

function gitignoreFileState(existing: string | undefined, next: string): GitignorePolicyFile {
  if (existing === undefined) {
    return {
      path: JUMPSPACE_GITIGNORE_PATH,
      action: "created",
      changed: true,
      managed: true,
      reason: "missing",
    };
  }

  if (existing === next) {
    return {
      path: JUMPSPACE_GITIGNORE_PATH,
      action: "unchanged",
      changed: false,
      managed: true,
      reason: "already_current",
    };
  }

  return {
    path: JUMPSPACE_GITIGNORE_PATH,
    action: "updated",
    changed: true,
    managed: true,
    reason: existing.includes(startMarker) && existing.includes(endMarker) ? "managed_block" : "appended",
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
