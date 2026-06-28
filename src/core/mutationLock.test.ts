import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MUTATION_LOCK_PATH, acquireMutationLock, withMutationLock } from "./mutationLock.js";

describe("mutation lock", () => {
  it("serializes operations through a repo-local lock file", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-lock-"));
    const events: string[] = [];
    const firstMayFinish = deferred<void>();

    const first = withMutationLock(root, async () => {
      events.push("first-start");
      await firstMayFinish.promise;
      events.push("first-end");
    });

    while (!events.includes("first-start")) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    const second = withMutationLock(
      root,
      async () => {
        events.push("second");
      },
      { pollMs: 1, timeoutMs: 1_000 },
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(events).toEqual(["first-start"]);

    firstMayFinish.resolve();
    await Promise.all([first, second]);
    expect(events).toEqual(["first-start", "first-end", "second"]);
  });

  it("times out with a structured error when a fresh lock is held too long", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-lock-"));
    const lockPath = path.join(root, MUTATION_LOCK_PATH);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    await fs.writeFile(lockPath, JSON.stringify({ created_at_ms: 1_000, pid: 1, holder: "test" }));

    await expect(
      acquireMutationLock(lockPath, {
        now: () => 1_010,
        staleMs: 10_000,
        timeoutMs: 0,
        pollMs: 1,
        sleep: async () => {},
      }),
    ).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: "MUTATION_LOCK_TIMEOUT" })],
    });
  });

  it("recovers a stale lock before acquiring", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-lock-"));
    const lockPath = path.join(root, MUTATION_LOCK_PATH);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    await fs.writeFile(lockPath, JSON.stringify({ created_at_ms: 1_000, pid: 1, holder: "stale" }));

    const release = await acquireMutationLock(lockPath, {
      now: () => 70_000,
      staleMs: 10_000,
      timeoutMs: 100,
      pollMs: 1,
      sleep: async () => {},
    });
    await release();

    await expect(fs.access(lockPath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}
