import fs from "node:fs/promises";
import path from "node:path";
import { JumpspaceCommandError, commandError } from "./errors.js";
import { resolveRepoPath } from "./config.js";

export const MUTATION_LOCK_PATH = ".jumpspace/locks/mutation.lock";

export type MutationLockOptions = {
  timeoutMs?: number;
  staleMs?: number;
  pollMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  holder?: string;
};

type LockPayload = {
  pid: number;
  created_at: string;
  created_at_ms: number;
  holder: string;
};

const defaultTimeoutMs = 10_000;
const defaultStaleMs = 60_000;
const defaultPollMs = 25;

export async function withMutationLock<T>(
  root: string,
  operation: () => Promise<T>,
  options: MutationLockOptions = {},
): Promise<T> {
  const lockPath = resolveRepoPath(root, MUTATION_LOCK_PATH);
  const release = await acquireMutationLock(lockPath, options);
  try {
    return await operation();
  } finally {
    await release();
  }
}

export async function acquireMutationLock(
  lockPath: string,
  options: MutationLockOptions = {},
): Promise<() => Promise<void>> {
  const timeoutMs = options.timeoutMs ?? Number(process.env.JUMPSPACE_MUTATION_LOCK_TIMEOUT_MS ?? defaultTimeoutMs);
  const staleMs = options.staleMs ?? Number(process.env.JUMPSPACE_MUTATION_LOCK_STALE_MS ?? defaultStaleMs);
  const pollMs = options.pollMs ?? Number(process.env.JUMPSPACE_MUTATION_LOCK_POLL_MS ?? defaultPollMs);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? delay;
  const started = now();

  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  while (true) {
    const acquired = await tryCreateLock(lockPath, {
      pid: process.pid,
      created_at: new Date(now()).toISOString(),
      created_at_ms: now(),
      holder: options.holder ?? "metadata",
    });
    if (acquired) {
      let released = false;
      return async () => {
        if (released) {
          return;
        }
        released = true;
        await fs.unlink(lockPath).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") {
            throw error;
          }
        });
      };
    }

    await removeStaleLock(lockPath, staleMs, now);

    if (now() - started >= timeoutMs) {
      throw new JumpspaceCommandError(
        commandError("MUTATION_LOCK_TIMEOUT", `Timed out waiting for Jumpspace metadata mutation lock at ${repoLikePath(lockPath)}.`, {
          path: repoLikePath(lockPath),
        }),
      );
    }

    await sleep(pollMs);
  }
}

async function tryCreateLock(lockPath: string, payload: LockPayload): Promise<boolean> {
  try {
    const handle = await fs.open(lockPath, "wx");
    try {
      await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw error;
  }
}

async function removeStaleLock(lockPath: string, staleMs: number, now: () => number): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await fs.readFile(lockPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  const createdAtMs = lockCreatedAtMs(raw);
  if (createdAtMs !== null && now() - createdAtMs < staleMs) {
    return;
  }

  const stat = await fs.stat(lockPath).catch(() => undefined);
  if (createdAtMs === null && stat && now() - stat.mtimeMs < staleMs) {
    return;
  }

  await fs.unlink(lockPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
}

function lockCreatedAtMs(raw: string): number | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LockPayload>;
    return typeof parsed.created_at_ms === "number" ? parsed.created_at_ms : null;
  } catch {
    return null;
  }
}

function repoLikePath(lockPath: string): string {
  const marker = `${path.sep}.jumpspace${path.sep}`;
  const index = lockPath.indexOf(marker);
  return index >= 0 ? lockPath.slice(index + 1) : lockPath;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
