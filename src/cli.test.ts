import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { MUTATION_LOCK_PATH } from "./core/mutationLock.js";
import { schemaCatalog } from "./core/schemas.js";

const repoRoot = process.cwd();
const tsxLoaderPath = path.join(repoRoot, "node_modules/tsx/dist/loader.mjs");
const cliPath = path.join(repoRoot, "src/cli.ts");
const execFileAsync = promisify(execFile);

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type CliOptions = {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

describe("CLI durable plans", () => {
  it("saves, loads, validates, advances, and completes task-plan steps", async () => {
    const root = await createFixtureRepo();

    expect((await runCli(root, ["scan"])).code).toBe(0);

    const saved = await runCli(root, ["plan", "save", "JS-100", "--file", "plan.yml"]);
    expect(saved).toMatchObject({
      code: 0,
    });
    expect(saved.stdout).toContain("Saved plan for JS-100.");

    const showHuman = await runCli(root, ["plan", "show", "JS-100"]);
    expect(showHuman.stdout).toContain("# Jumpspace Plan for JS-100");
    expect(showHuman.stdout).toContain("Outcome: Implementation exists.");

    const showJson = await runCli(root, ["plan", "show", "JS-100", "--json"]);
    expect(JSON.parse(showJson.stdout)).toMatchObject({
      task_id: "JS-100",
      plan: {
        goal: "Implement durable planning.",
      },
    });

    const validation = await runCli(root, ["plan", "validate", "JS-100", "--json"]);
    expect(JSON.parse(validation.stdout)).toMatchObject({
      task_id: "JS-100",
      ok: true,
      issues: [],
    });

    const unknownTask = await runCli(root, ["plan", "show", "NOPE", "--json"]);
    expect(unknownTask.code).toBe(1);
    expect(JSON.parse(unknownTask.stdout)).toMatchObject({
      ok: false,
      errors: [
        {
          code: "UNKNOWN_TASK",
        },
      ],
    });

    const nextBefore = await runCli(root, ["next", "JS-100", "--json"]);
    expect(JSON.parse(nextBefore.stdout).steps.map((step: { id: string }) => step.id)).toEqual(["design"]);

    const blocked = await runCli(root, [
      "step",
      "complete",
      "JS-100",
      "implement",
      "--evidence",
      "Tried to finish before design.",
      "--json",
    ]);
    expect(blocked.code).toBe(1);
    expect(JSON.parse(blocked.stdout).issues).toContainEqual(
      expect.objectContaining({
        code: "BLOCKED_PLAN_STEP",
        stepId: "implement",
      }),
    );

    const completedDesign = await runCli(root, [
      "step",
      "complete",
      "JS-100",
      "design",
      "--evidence",
      "Human approved the design.",
      "--json",
    ]);
    expect(completedDesign.code).toBe(0);
    expect(JSON.parse(completedDesign.stdout)).toMatchObject({
      ok: true,
      step: {
        id: "design",
        status: "complete",
      },
    });

    const nextAfter = await runCli(root, ["next", "JS-100", "--json"]);
    expect(JSON.parse(nextAfter.stdout).steps.map((step: { id: string }) => step.id)).toEqual(["implement"]);

    const completedImplement = await runCli(root, [
      "step",
      "complete",
      "JS-100",
      "implement",
      "--evidence",
      "npm test passed.",
      "--json",
    ]);
    expect(completedImplement.code).toBe(0);
    expect(JSON.parse(completedImplement.stdout)).toMatchObject({
      ok: true,
      plan: {
        status: "complete",
      },
    });
  }, 15_000);

  it("prints work packets for ready planned tasks with optional drift", async () => {
    const root = await createFixtureRepo();

    expect((await runCli(root, ["scan"])).code).toBe(0);
    expect((await runCli(root, ["plan", "save", "JS-100", "--file", "plan.yml"])).code).toBe(0);

    const packet = await runCli(root, ["work", "JS-100", "--json"]);
    expect(packet.code).toBe(0);
    expect(JSON.parse(packet.stdout)).toMatchObject({
      ok: true,
      packet_version: 1,
      task: { id: "JS-100" },
      plan: { goal: "Implement durable planning." },
      next_steps: [{ id: "design" }],
      required_checks: ["jumpspace plan validate JS-100"],
      drift: { requested: false, since: null, facts: [], warnings: [] },
      mutation_history: {
        total: 1,
        returned: 1,
        filters: { task_id: "JS-100", limit: 5 },
        entries: [{ command: "plan save", task_ids: ["JS-100"] }],
      },
      schemas: { packet: "work", failures: "error", context: "context", audit: "audit", drift: "drift", history: "history" },
      next_action: "Work on pending unblocked step: design.",
    });

    const human = await runCli(root, ["work", "JS-100"]);
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("# Jumpspace Work Packet");
    expect(human.stdout).toContain("Work on pending unblocked step: design.");
    expect(human.stdout).toContain("## Recent History");
    expect(human.stdout).toContain("plan save");

    const unknown = await runCli(root, ["work", "NOPE", "--json"]);
    expect(unknown.code).toBe(1);
    expect(JSON.parse(unknown.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "UNKNOWN_TASK", taskId: "NOPE" }],
    });

    await initGitRepo(root);
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await fs.writeFile(path.join(root, "src", "feature.ts"), "changed\n");

    const packetWithDrift = await runCli(root, ["work", "JS-100", "--since", base, "--json"]);
    expect(packetWithDrift.code).toBe(0);
    expect(JSON.parse(packetWithDrift.stdout)).toMatchObject({
      ok: true,
      drift: {
        requested: true,
        since: base,
        facts: [expect.objectContaining({ code: "LINKED_CODE_CHANGED", taskId: "JS-100" })],
      },
    });
  });

  it("records mutation summaries and exposes last and doctor commands", async () => {
    const root = await createFixtureRepo();

    const missingLast = await runCli(root, ["last", "--json"]);
    expect(missingLast.code).toBe(1);
    expect(JSON.parse(missingLast.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "NO_LAST_MUTATION" }],
    });

    const emptyHistory = await runCli(root, ["history", "--json"]);
    expect(emptyHistory.code).toBe(0);
    expect(JSON.parse(emptyHistory.stdout)).toMatchObject({
      ok: true,
      total: 0,
      returned: 0,
      filters: { limit: 20 },
      entries: [],
    });

    expect((await runCli(root, ["scan"])).code).toBe(0);
    expect((await runCli(root, ["plan", "save", "JS-100", "--file", "plan.yml"])).code).toBe(0);

    const last = await runCli(root, ["last", "--json"]);
    expect(last.code).toBe(0);
    expect(JSON.parse(last.stdout)).toMatchObject({
      ok: true,
      summary: {
        version: 1,
        command: "plan save",
        touched_files: expect.arrayContaining(["docs/specs/feature.md", ".jumpspace/index.json"]),
        task_ids: ["JS-100"],
        index_changed: true,
      },
    });

    const lastHuman = await runCli(root, ["last"]);
    expect(lastHuman.code).toBe(0);
    expect(lastHuman.stdout).toContain("# Jumpspace Last Mutation");
    expect(lastHuman.stdout).toContain("Command: plan save");

    const doctor = await runCli(root, ["doctor", "--json"]);
    expect(doctor.code).toBe(0);
    expect(JSON.parse(doctor.stdout)).toMatchObject({
      ok: true,
      errors: [],
      last_mutation: {
        command: "plan save",
        task_ids: ["JS-100"],
      },
      checked: {
        ignored_patterns: expect.arrayContaining(["node_modules/**", "dist/**"]),
      },
    });

    const updated = await runCli(root, ["status", "JS-100", "partial", "--json"]);
    expect(updated.code).toBe(0);
    expect(JSON.parse((await runCli(root, ["last", "--json"])).stdout)).toMatchObject({
      summary: {
        command: "status",
        task_ids: ["JS-100"],
      },
    });

    const history = await runCli(root, ["history", "--task", "JS-100", "--limit", "1", "--json"]);
    expect(history.code).toBe(0);
    expect(JSON.parse(history.stdout)).toMatchObject({
      ok: true,
      history_path: ".jumpspace/mutations.jsonl",
      total: 2,
      returned: 1,
      filters: { task_id: "JS-100", limit: 1 },
      entries: [
        {
          command: "status",
          task_ids: ["JS-100"],
        },
      ],
    });

    const historyHuman = await runCli(root, ["history", "--task", "JS-100"]);
    expect(historyHuman.code).toBe(0);
    expect(historyHuman.stdout).toContain("# Jumpspace Mutation History");
    expect(historyHuman.stdout).toContain("Filters: task=JS-100, limit=20");
    expect(historyHuman.stdout).toContain("status");
    expect(historyHuman.stdout).toContain("plan save");

    const handoff = await runCli(root, ["handoff", "--task", "JS-100", "--limit", "2", "--json"]);
    expect(handoff.code, handoff.stdout || handoff.stderr).toBe(0);
    expect(JSON.parse(handoff.stdout)).toMatchObject({
      ok: true,
      packet_version: 1,
      filters: { task_id: "JS-100", limit: 2 },
      summary: {
        audit_errors: 0,
        mutations_returned: 2,
      },
      recent_mutations: {
        filters: { task_id: "JS-100", limit: 2 },
        returned: 2,
      },
      task: {
        id: "JS-100",
        status: "partial",
        plan_status: "planned",
        execution_ready: true,
        pending_step_ids: ["design"],
        required_checks: ["jumpspace plan validate JS-100"],
      },
      suggested_commands: expect.arrayContaining([
        "jumpspace scan",
        "jumpspace audit --json",
        "jumpspace doctor --json",
        "jumpspace schema coverage --json",
        "jumpspace context JS-100 --json",
        "jumpspace plan validate JS-100 --json",
        "jumpspace next JS-100 --json",
      ]),
      schemas: { packet: "handoff", failures: "error" },
    });

    const handoffHuman = await runCli(root, ["handoff", "--task", "JS-100"]);
    expect(handoffHuman.code).toBe(0);
    expect(handoffHuman.stdout).toContain("# Jumpspace Handoff");
    expect(handoffHuman.stdout).toContain("Task: JS-100 Durable planning");
    expect(handoffHuman.stdout).toContain("jumpspace context JS-100 --json");

    const unknownHandoffTask = await runCli(root, ["handoff", "--task", "NOPE", "--json"]);
    expect(unknownHandoffTask.code).toBe(1);
    expect(JSON.parse(unknownHandoffTask.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "UNKNOWN_TASK", taskId: "NOPE" }],
    });

    const invalidHistoryLimit = await runCli(root, ["history", "--limit", "nope", "--json"]);
    expect(invalidHistoryLimit.code).toBe(1);
    expect(JSON.parse(invalidHistoryLimit.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_LIMIT" }],
    });

    const invalidHandoffLimit = await runCli(root, ["handoff", "--limit", "nope", "--json"]);
    expect(invalidHandoffLimit.code).toBe(1);
    expect(JSON.parse(invalidHandoffLimit.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_LIMIT" }],
    });
  });

  it("runs release doctor as a local package-readiness packet", async () => {
    const root = await createReleasePackageRepo();

    const result = await runCli(root, ["release", "doctor", "--json"]);
    expect(result.code, result.stdout || result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      status: "ready",
      package: {
        name: "jumpspace",
        version: "0.1.0",
        license: "MIT",
        license_file: { exists: true },
        bin: {
          name: "jumpspace",
          target: "dist/cli.js",
          executable: true,
        },
      },
      package_dry_run: {
        ok: true,
        exit_code: 0,
        required_files: expect.arrayContaining([
          expect.objectContaining({ name: "dist/cli.js", status: "pass" }),
        ]),
      },
      schemas: {
        expected: schemaCatalog.length + 1,
        missing: [],
      },
      registry: {
        status: "unknown",
        check: "not_requested",
      },
      local_blockers: [],
    });

    const human = await runCli(root, ["release", "doctor"]);
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("# Jumpspace Release Doctor");
    expect(human.stdout).toContain("Local readiness: ready");
    expect(human.stdout).toContain("Registry: unknown");
  });

  it("runs release install-doctor as an active binary freshness packet", async () => {
    const root = await createReleasePackageRepo();
    const env = { PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH ?? ""}` };
    const distCliRealpath = await fs.realpath(path.join(root, "dist", "cli.js"));

    const result = await runCli(root, ["release", "install-doctor", "--json"], { env });
    expect(result.code, result.stdout || result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      workspace: {
        is_jumpspace_checkout: true,
        package_version: "0.1.0",
        dist_cli_exists: true,
        dist_cli_executable: true,
        schema_count: schemaCatalog.length,
      },
      binaries: {
        path: {
          path: path.join(root, "bin", "jumpspace"),
          realpath: distCliRealpath,
          package_version: "0.1.0",
          cli_version: "0.1.0",
          schema_count: schemaCatalog.length,
        },
      },
      comparisons: {
        path_matches_workspace_dist: true,
        path_cli_version_matches_workspace: true,
        path_schema_count_matches_workspace: true,
      },
      warnings: expect.any(Array),
      blockers: [],
      repair_commands: expect.any(Array),
    });

    const human = await runCli(root, ["release", "install-doctor"], { env });
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("# Jumpspace Install Doctor");
    expect(human.stdout).toContain("Install freshness:");
  });

  it("rejects invalid saved plans with structured JSON errors", async () => {
    const root = await createFixtureRepo();
    await fs.writeFile(
      path.join(root, "duplicate-plan.yml"),
      `task_id: JS-100
goal: Bad plan.
status: planned
steps:
  - id: same
    outcome: First.
    status: pending
  - id: same
    outcome: Duplicate.
    status: pending
`,
    );

    expect((await runCli(root, ["scan"])).code).toBe(0);

    const rejected = await runCli(root, ["plan", "save", "JS-100", "--file", "duplicate-plan.yml", "--json"]);

    expect(rejected.code).toBe(1);
    expect(JSON.parse(rejected.stdout).errors).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_PLAN_STEP_ID",
      }),
    );
  });

  it("rejects status verified and lets verify earn verified with structured records", async () => {
    const root = await createFixtureRepo();
    await initGitRepo(root);
    expect((await runCli(root, ["scan"])).code).toBe(0);

    const rejected = await runCli(root, ["status", "JS-100", "verified", "--json"]);
    expect(rejected.code).toBe(1);
    expect(JSON.parse(rejected.stdout)).toMatchObject({
      ok: false,
      errors: [
        {
          code: "PROTECTED_VERIFIED_STATUS",
          taskId: "JS-100",
        },
      ],
    });

    const verified = await runCli(root, [
      "verify",
      "JS-100",
      "--check",
      `${process.execPath} -e "process.exit(0)"`,
      "--criteria",
      "AC-1",
      "--evidence",
      "CLI smoke check passed.",
      "--json",
    ]);
    expect(verified.code).toBe(0);
    expect(JSON.parse(verified.stdout)).toMatchObject({
      ok: true,
      task_id: "JS-100",
      status: "verified",
      record: {
        checks: [
          {
            command: `${process.execPath} -e "process.exit(0)"`,
            exit_code: 0,
          },
        ],
        acceptance_criteria_covered: ["AC-1"],
        evidence: ["CLI smoke check passed."],
      },
    });

    const context = JSON.parse((await runCli(root, ["context", "JS-100", "--json"])).stdout);
    expect(context.task.status).toBe("verified");
    expect(context.task.verification_records).toHaveLength(1);
  });

  it("returns a structured JSON error when a metadata mutation lock times out", async () => {
    const root = await createFixtureRepo();
    expect((await runCli(root, ["scan"])).code).toBe(0);
    const lockPath = path.join(root, MUTATION_LOCK_PATH);
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    await fs.writeFile(
      lockPath,
      JSON.stringify({
        pid: 1,
        holder: "test",
        created_at: new Date().toISOString(),
        created_at_ms: Date.now(),
      }),
    );

    const result = await runCli(
      root,
      ["status", "JS-100", "partial", "--json"],
      {
        env: {
          JUMPSPACE_MUTATION_LOCK_TIMEOUT_MS: "0",
          JUMPSPACE_MUTATION_LOCK_STALE_MS: "60000",
          JUMPSPACE_MUTATION_LOCK_POLL_MS: "1",
        },
      },
    );

    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      errors: [
        {
          code: "MUTATION_LOCK_TIMEOUT",
          path: ".jumpspace/locks/mutation.lock",
        },
      ],
    });
  });

  it("keeps find strict by default and supports forgiving find/ask evidence summaries", async () => {
    const root = await createFixtureRepo();
    expect((await runCli(root, ["scan"])).code).toBe(0);

    const strict = await runCli(root, ["find", "durable", "unmatched", "--json"]);
    expect(JSON.parse(strict.stdout).results).toEqual([]);

    const any = await runCli(root, ["find", "durable", "unmatched", "--mode", "any", "--json"]);
    expect(JSON.parse(any.stdout)).toMatchObject({
      mode: "any",
      results: [
        {
          task: {
            id: "JS-100",
          },
          matchedTerms: ["durable"],
          unmatchedTerms: ["unmatched"],
        },
      ],
    });

    expect((await runCli(root, ["plan", "save", "JS-100", "--file", "plan.yml"])).code).toBe(0);
    const compactFind = JSON.parse((await runCli(root, ["find", "durable", "--mode", "any", "--json", "--compact"])).stdout);
    expect(compactFind).toMatchObject({
      ok: true,
      compact: true,
      results: [
        {
          task: {
            id: "JS-100",
            doc: { path: "docs/specs/feature.md" },
            links: {
              code: 1,
              tests: 1,
            },
            code: ["src/feature.ts"],
            tests: ["src/feature.test.ts"],
          },
          score: expect.any(Number),
          matchedTerms: ["durable"],
        },
      ],
    });
    expect(compactFind.results[0].task.spec).toBeUndefined();
    expect(compactFind.results[0].task.plan).toBeUndefined();
    expect(compactFind.results[0].task.acceptance_criteria).toBeUndefined();

    const asked = JSON.parse((await runCli(root, ["ask", "How", "does", "durable", "planning", "work?", "--json"])).stdout);
    expect(asked).toMatchObject({
      ok: true,
      retrieval_mode: "any",
      evidence: [
        {
          task_id: "JS-100",
          path: "docs/specs/feature.md",
        },
      ],
    });
    expect(asked.coverage.matched_terms).toEqual(expect.arrayContaining(["durable", "planning"]));

    const compactAsk = JSON.parse((await runCli(root, ["ask", "How", "does", "durable", "planning", "work?", "--json", "--compact"])).stdout);
    expect(compactAsk).toMatchObject({
      ok: true,
      compact: true,
      evidence: [
        {
          task_id: "JS-100",
          path: "docs/specs/feature.md",
          match_reasons: expect.arrayContaining(["title"]),
          linked_code_count: 1,
          linked_test_count: 1,
          connected_task_ids: [],
          graph_path_count: 0,
        },
      ],
    });
    expect(compactAsk.evidence[0].excerpt).toBeUndefined();
    expect(compactAsk.evidence[0].graph_expansion).toBeUndefined();
    expect(compactAsk.evidence[0].connected_tasks).toBeUndefined();
  });

  it("builds, inspects, and searches the optional semantic index through the CLI", async () => {
    const root = await createSemanticGraphRepo();
    expect((await runCli(root, ["scan"])).code).toBe(0);

    const unavailable = await runCli(root, ["semantic", "search", "task", "vector", "graph", "--json"]);
    expect(unavailable.code).toBe(1);
    expect(JSON.parse(unavailable.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "SEMANTIC_INDEX_UNAVAILABLE" }],
    });

    const built = await runCli(root, ["semantic", "build", "--json"]);
    expect(built.code).toBe(0);
    expect(JSON.parse(built.stdout)).toMatchObject({
      ok: true,
      index_path: ".jumpspace/semantic-index.json",
      task_count: 3,
      document_count: 3,
      config_updated: true,
      backend: {
        active: "local-task-vector-v1",
        preferred: "lancedb+onnx",
        selected: "auto",
        model: {
          name: "Xenova/all-MiniLM-L6-v2",
        },
        vector_kind: "sparse_terms",
      },
    });

    const config = JSON.parse(await fs.readFile(path.join(root, ".jumpspace", "config.json"), "utf8"));
    expect(config.semanticIndex).toMatchObject({
      enabled: true,
      path: ".jumpspace/semantic-index.json",
    });

    const status = await runCli(root, ["semantic", "status", "--json"]);
    expect(status.code).toBe(0);
    expect(JSON.parse(status.stdout)).toMatchObject({
      ok: true,
      enabled: true,
      exists: true,
      ready: true,
      stale: false,
      document_count: 3,
    });

    const search = await runCli(root, ["semantic", "search", "task", "vector", "graph", "--json"]);
    expect(search.code).toBe(0);
    const searchJson = JSON.parse(search.stdout);
    expect(searchJson).toMatchObject({ ok: true });
    expect(searchJson.results.find((result: { task_id: string }) => result.task_id === "RET-100")).toMatchObject({
      task_id: "RET-100",
      match_reasons: expect.arrayContaining(["local-task-vector-v1"]),
      graph_expansion: expect.arrayContaining([
        expect.objectContaining({ kind: "dependency", to: "GRAPH-100" }),
        expect.objectContaining({ kind: "ref", to: "ASK-100" }),
      ]),
      connected_tasks: expect.arrayContaining([
        expect.objectContaining({ task_id: "GRAPH-100", relation: "dependency" }),
        expect.objectContaining({ task_id: "ASK-100", relation: "ref" }),
      ]),
    });

    const evalResult = await runCli(root, ["semantic", "eval", "--json"]);
    expect(evalResult.code).toBe(0);
    expect(JSON.parse(evalResult.stdout)).toMatchObject({
      ok: true,
      query_count: 3,
      summary: {
        local_hits: expect.any(Number),
        active_hits: expect.any(Number),
      },
      results: expect.arrayContaining([
        expect.objectContaining({
          id: "ret-100",
          expected_task_ids: ["RET-100"],
          lexical: expect.objectContaining({ backend: "lexical-any" }),
          local: expect.objectContaining({ backend: "local-task-vector-v1" }),
        }),
      ]),
    });

    const asked = await runCli(root, ["ask", "task", "vector", "graph", "--json"]);
    expect(asked.code).toBe(0);
    const askedJson = JSON.parse(asked.stdout);
    expect(askedJson).toMatchObject({
      ok: true,
      retrieval_mode: "hybrid",
      retrieval: {
        semantic: {
          enabled: true,
          ready: true,
          used: true,
        },
      },
    });
    expect(askedJson.evidence.find((item: { task_id: string }) => item.task_id === "RET-100")).toMatchObject({
      task_id: "RET-100",
      retrieval_sources: expect.arrayContaining(["semantic"]),
      graph_expansion: expect.arrayContaining([
        expect.objectContaining({ kind: "dependency", to: "GRAPH-100" }),
        expect.objectContaining({ kind: "ref", to: "ASK-100" }),
      ]),
    });
  });

  it("runs deterministic graph queries with matched paths and structured errors", async () => {
    const root = await createGraphQueryRepo();
    expect((await runCli(root, ["scan"])).code).toBe(0);

    const queried = await runCli(root, ["query", "--depends-on-transitive", "ADR-0017", "--no-tests", "--json"]);
    expect(queried.code).toBe(0);
    expect(JSON.parse(queried.stdout)).toMatchObject({
      ok: true,
      query: {
        filters: expect.arrayContaining([
          { field: "depends_on_transitive", op: "=", value: "ADR-0017" },
          { field: "tests", op: "=", value: "none" },
        ]),
      },
      results: [
        {
          task: {
            id: "MET-001",
          },
          matched_graph_paths: expect.arrayContaining([
            expect.objectContaining({
              kind: "depends_on_transitive",
              from: "MET-001",
              to: "ADR-0017",
            }),
          ]),
        },
      ],
    });

    const human = await runCli(root, ["query", "--where", "module=metrics", "--where", "tests=none"]);
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("# Jumpspace Query");
    expect(human.stdout).toContain("MET-001");

    const related = await runCli(root, ["related", "MET-001", "--json", "--compact"]);
    expect(related.code).toBe(0);
    const relatedBody = JSON.parse(related.stdout);
    expect(relatedBody).toMatchObject({
      ok: true,
      compact: true,
      task: {
        id: "MET-001",
        doc: { path: "docs/specs/graph.md" },
      },
      dependencies: [expect.objectContaining({ id: "ADR-0017" })],
      dependents: [expect.objectContaining({ id: "MET-002" })],
      references: [
        expect.objectContaining({
          ref: expect.objectContaining({ type: "implements", id: "ADR-0017" }),
          task: expect.objectContaining({ id: "ADR-0017" }),
        }),
      ],
    });
    expect(relatedBody.task.spec).toBeUndefined();
    expect(relatedBody.task.verification_records).toBeUndefined();

    const invalid = await runCli(root, ["query", "--where", "unknown=value", "--ref", "nope:ADR-0017", "--json"]);
    expect(invalid.code).toBe(1);
    expect(JSON.parse(invalid.stdout)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: "UNKNOWN_QUERY_FIELD", path: "unknown" }),
        expect.objectContaining({ code: "UNSUPPORTED_REF_TYPE" }),
      ]),
    });
  });

  it("runs local CI reports with repair packets and task-block suggestions", async () => {
    const root = await createCiReportRepo();
    await initGitRepo(root);
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await execFileAsync("git", ["mv", "src/feature.ts", "src/renamed-feature.ts"], { cwd: root });
    await write(
      root,
      "docs/specs/import-flow.md",
      `# Import docs

## Import flow

The implementation changed near src/import.ts.

## Quarterly metrics

The quarterly metrics implementation changed near src/quarterly-metrics.ts.
`,
    );
    await write(root, "src/import.ts", "export const imported = true;\n");
    await write(root, "src/import.test.ts", "export const test = true;\n");
    await write(root, "src/quarterly-metrics.ts", "export const quarterlyMetrics = true;\n");
    await write(root, "src/quarterly-metrics.test.ts", "export const quarterlyMetricsTest = true;\n");
    await write(root, "src/unrelated-worker.ts", "export const unrelated = true;\n");

    const report = await runCli(root, ["ci", "--since", base, "--json"]);

    expect(report.code).toBe(0);
    const reportBody = JSON.parse(report.stdout);
    expect(reportBody).toMatchObject({
      ok: true,
      since: base,
      suggestions: {
        repair: {
          mechanical_fixes: [
            expect.objectContaining({
              task_id: "JS-100",
              old_path: "src/feature.ts",
              new_path: "src/renamed-feature.ts",
            }),
          ],
        },
        task_blocks: expect.arrayContaining([
          expect.objectContaining({
            path: "docs/specs/import-flow.md",
            heading: "Import flow",
            linked_code_candidates: expect.arrayContaining(["src/import.ts"]),
            linked_test_candidates: expect.arrayContaining(["src/import.test.ts"]),
            linked_code_candidate_matches: [
              expect.objectContaining({
                path: "src/import.ts",
                matched_terms: expect.arrayContaining(["import"]),
                match_reasons: expect.arrayContaining(["path:import"]),
              }),
            ],
          }),
        ]),
      },
      summary: {
        suggested_task_blocks: 3,
        repair_fixes: 1,
      },
    });
    const importTaskBlock = reportBody.suggestions.task_blocks.find((suggestion: { heading: string }) => suggestion.heading === "Import flow");
    const quarterlyTaskBlock = reportBody.suggestions.task_blocks.find((suggestion: { heading: string }) => suggestion.heading === "Quarterly metrics");
    expect(importTaskBlock.linked_code_candidates).not.toContain("src/unrelated-worker.ts");
    expect(importTaskBlock.linked_code_candidates).not.toContain("src/quarterly-metrics.ts");
    expect(importTaskBlock.rejected_candidate_matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "src/quarterly-metrics.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
      expect.objectContaining({
        path: "src/unrelated-worker.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
    ]));
    expect(quarterlyTaskBlock).toMatchObject({
      linked_code_candidates: ["src/quarterly-metrics.ts"],
      linked_test_candidates: ["src/quarterly-metrics.test.ts"],
      linked_code_candidate_matches: [
        expect.objectContaining({
          path: "src/quarterly-metrics.ts",
          matched_terms: expect.arrayContaining(["metric", "quarterly"]),
        }),
      ],
    });
    expect(quarterlyTaskBlock.linked_code_candidates).not.toContain("src/import.ts");
    expect(quarterlyTaskBlock.linked_code_candidates).not.toContain("src/unrelated-worker.ts");
    expect(quarterlyTaskBlock.rejected_candidate_matches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "src/import.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
      expect.objectContaining({
        path: "src/unrelated-worker.ts",
        reason: "NO_SOURCE_EVIDENCE",
        matched_terms: [],
      }),
    ]));
    expect(reportBody.suggestions.task_blocks.every((suggestion: { linked_code_candidate_matches: Array<{ matched_terms: string[] }> }) =>
      suggestion.linked_code_candidate_matches.every((match) => match.matched_terms.length > 0),
    )).toBe(true);
    expect(reportBody.pr_comment).toContain("# Jumpspace CI Report");

    const human = await runCli(root, ["ci", "--since", base]);
    expect(human.code).toBe(0);
    expect(human.stdout).toContain("# Jumpspace CI Report");
    expect(human.stdout).toContain("Suggested Task Blocks");

    const prJson = await runCli(root, ["pr", "comment", "--since", base, "--json"]);
    expect(prJson.code).toBe(0);
    const prPacket = JSON.parse(prJson.stdout);
    expect(prPacket).toMatchObject({
      ok: true,
      assistant_version: 1,
      since: base,
      mode: "local",
      idempotency: {
        marker: "<!-- jumpspace-pr-assistant:v1 -->",
        strategy: "replace_existing_comment_with_same_marker",
      },
      mutation_policy: {
        mutates: false,
        requires_human_approval: true,
        allowed_follow_up_commands: expect.arrayContaining([`jumpspace repair --since ${base} --apply`]),
      },
      schemas: {
        packet: "pr.comment",
        ci: "ci",
        errors: "error",
      },
      review_items: expect.arrayContaining([
        expect.objectContaining({
          type: "task_block",
          path: "docs/specs/import-flow.md",
          heading: "Import flow",
          useful_candidates: expect.arrayContaining([
            expect.objectContaining({ field: "code", path: "src/import.ts", matched_terms: expect.arrayContaining(["import"]) }),
          ]),
          rejected_candidates: expect.arrayContaining([
            expect.objectContaining({ field: "code", path: "src/quarterly-metrics.ts", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
            expect.objectContaining({ field: "code", path: "src/unrelated-worker.ts", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
          ]),
        }),
        expect.objectContaining({
          type: "task_block",
          path: "docs/specs/import-flow.md",
          heading: "Quarterly metrics",
          useful_candidates: expect.arrayContaining([
            expect.objectContaining({
              field: "code",
              path: "src/quarterly-metrics.ts",
              matched_terms: expect.arrayContaining(["metric", "quarterly"]),
            }),
          ]),
          rejected_candidates: expect.arrayContaining([
            expect.objectContaining({ field: "code", path: "src/import.ts", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
            expect.objectContaining({ field: "code", path: "src/unrelated-worker.ts", reason: "NO_SOURCE_EVIDENCE", matched_terms: [] }),
          ]),
        }),
        expect.objectContaining({ type: "repair", task_id: "JS-100", old_path: "src/feature.ts" }),
      ]),
    });
    expect(prPacket.review_comment).toContain("<!-- jumpspace-pr-assistant:v1 -->");
    expect(prPacket.review_comment).toContain("# Jumpspace CI Report");
    expect(prPacket.review_comment).toContain("useful_candidate: code src/import.ts");
    expect(prPacket.review_comment).toContain("useful_candidate: code src/quarterly-metrics.ts");
    expect(prPacket.review_comment).toContain("rejected_candidate: code src/unrelated-worker.ts reason=NO_SOURCE_EVIDENCE");

    const prHuman = await runCli(root, ["pr", "comment", "--since", base]);
    expect(prHuman.code).toBe(0);
    expect(prHuman.stdout).toContain("# Jumpspace PR Assistant");
    expect(prHuman.stdout).toContain("Apply suggestions only after human review.");

    const prFailure = await runCli(root, ["pr", "comment", "--since", "missing-ref", "--json"]);
    expect(prFailure.code).toBe(1);
    expect(JSON.parse(prFailure.stdout)).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([expect.objectContaining({ code: expect.any(String) })]),
    });
  });

  it("reports changed and drift JSON in a temp git repo", async () => {
    const root = await createFixtureRepo();
    expect((await runCli(root, ["scan"])).code).toBe(0);
    await initGitRepo(root);
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await fs.writeFile(path.join(root, "src", "feature.ts"), "changed\n");
    await fs.writeFile(path.join(root, "unmapped.txt"), "new\n");

    const changed = JSON.parse((await runCli(root, ["changed", "--since", base, "--json"])).stdout);
    expect(changed.files).toContainEqual(expect.objectContaining({ path: "src/feature.ts", sources: ["unstaged"] }));
    expect(changed.files).toContainEqual(expect.objectContaining({ path: "unmapped.txt", sources: ["untracked"] }));

    const drift = JSON.parse((await runCli(root, ["drift", "--since", base, "--json"])).stdout);
    expect(drift.facts).toContainEqual(expect.objectContaining({ code: "LINKED_CODE_CHANGED", taskId: "JS-100" }));
    expect(drift.facts).toContainEqual(expect.objectContaining({ code: "UNMAPPED_CHANGED_FILE", path: "unmapped.txt" }));
    expect(drift.warnings).toContainEqual(expect.objectContaining({ code: "DOCS_MAY_NEED_UPDATING", taskId: "JS-100" }));
  });

  it("previews and applies repair opportunities through the CLI", async () => {
    const root = await createFixtureRepo();
    expect((await runCli(root, ["scan"])).code).toBe(0);
    await initGitRepo(root);
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await execFileAsync("git", ["mv", "src/feature.ts", "src/renamed-feature.ts"], { cwd: root });

    const dryRun = await runCli(root, ["repair", "--since", base, "--json"]);
    expect(dryRun.code).toBe(0);
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      ok: true,
      mode: "dry-run",
      applied: false,
      mechanical_fixes: [
        expect.objectContaining({
          task_id: "JS-100",
          field: "code",
          old_path: "src/feature.ts",
          new_path: "src/renamed-feature.ts",
        }),
      ],
      touched_files: [],
    });

    const doctor = await runCli(root, ["doctor", "--since", base, "--json"]);
    expect(doctor.code).toBe(0);
    expect(JSON.parse(doctor.stdout)).toMatchObject({
      repair: {
        mechanical_fixes: [
          expect.objectContaining({
            task_id: "JS-100",
            old_path: "src/feature.ts",
          }),
        ],
      },
      suggestions: expect.arrayContaining([expect.objectContaining({ code: "RUN_REPAIR" })]),
    });

    const applied = await runCli(root, ["repair", "--since", base, "--apply", "--json"]);
    expect(applied.code).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({
      ok: true,
      mode: "apply",
      applied: true,
      touched_files: expect.arrayContaining(["docs/specs/feature.md", ".jumpspace/index.json"]),
    });

    const context = JSON.parse((await runCli(root, ["context", "JS-100", "--json"])).stdout);
    expect(context.task.code).toEqual(["src/renamed-feature.ts"]);
    expect(JSON.parse((await runCli(root, ["last", "--json"])).stdout)).toMatchObject({
      summary: {
        command: "repair",
        task_ids: ["JS-100"],
      },
    });
  });

  it("updates task links and suggests candidates without mutating", async () => {
    const root = await createFixtureRepo();
    await write(root, "src/durable-planning-runner.ts", "export const runner = true;\n");
    await write(root, "src/durable-planning-runner.test.ts", "export const runnerTest = true;\n");
    expect((await runCli(root, ["scan"])).code).toBe(0);

    const dryRun = await runCli(root, [
      "link",
      "update",
      "JS-100",
      "--code",
      "src/durable-planning-runner.ts",
      "--test",
      "src/durable-planning-runner.test.ts",
      "--gap",
      "Review runner ownership.",
      "--dry-run",
      "--json",
    ]);
    expect(dryRun.code).toBe(0);
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      ok: true,
      task_id: "JS-100",
      dry_run: true,
      applied: false,
      changed: true,
      operations: expect.arrayContaining([
        expect.objectContaining({ action: "add", field: "code", value: "src/durable-planning-runner.ts", changed: true }),
        expect.objectContaining({ action: "add", field: "tests", value: "src/durable-planning-runner.test.ts", changed: true }),
        expect.objectContaining({ action: "add", field: "gaps", value: "Review runner ownership.", changed: true }),
      ]),
    });
    expect(await fs.readFile(path.join(root, "docs/specs/feature.md"), "utf8")).not.toContain("durable-planning-runner");

    const applied = await runCli(root, [
      "link",
      "update",
      "JS-100",
      "--code",
      "src/durable-planning-runner.ts",
      "--test",
      "src/durable-planning-runner.test.ts",
      "--gap",
      "Review runner ownership.",
      "--json",
    ]);
    expect(applied.code).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({
      ok: true,
      applied: true,
      touched_files: expect.arrayContaining(["docs/specs/feature.md", ".jumpspace/index.json"]),
    });
    expect(await fs.readFile(path.join(root, "docs/specs/feature.md"), "utf8")).toContain("durable-planning-runner");
    expect(JSON.parse((await runCli(root, ["last", "--json"])).stdout)).toMatchObject({
      summary: { command: "link update", task_ids: ["JS-100"] },
    });

    const removed = await runCli(root, [
      "link",
      "update",
      "JS-100",
      "--remove-code",
      "src/durable-planning-runner.ts",
      "--remove-test",
      "src/durable-planning-runner.test.ts",
      "--json",
    ]);
    expect(removed.code).toBe(0);
    expect(JSON.parse(removed.stdout)).toMatchObject({
      ok: true,
      operations: expect.arrayContaining([expect.objectContaining({ action: "remove", field: "code", changed: true })]),
    });

    const missingPath = await runCli(root, ["link", "update", "JS-100", "--code", "src/missing.ts", "--json"]);
    expect(missingPath.code).toBe(1);
    expect(JSON.parse(missingPath.stdout)).toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ code: "MISSING_LINK_PATH", path: "src/missing.ts" })],
    });

    const badRef = await runCli(root, ["link", "update", "JS-100", "--ref", "bad-ref", "--json"]);
    expect(badRef.code).toBe(1);
    expect(JSON.parse(badRef.stdout)).toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ code: "INVALID_REF" })],
    });

    const explicitSuggestions = await runCli(root, [
      "link",
      "suggest",
      "JS-100",
      "--path",
      "src/durable-planning-runner.ts",
      "--path",
      "src/durable-planning-runner.test.ts",
      "--json",
    ]);
    expect(explicitSuggestions.code).toBe(0);
    expect(JSON.parse(explicitSuggestions.stdout)).toMatchObject({
      ok: true,
      mutated: false,
      suggestions: expect.arrayContaining([
        expect.objectContaining({ field: "tests", path: "src/durable-planning-runner.test.ts" }),
      ]),
    });

    await initGitRepo(root);
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await write(root, "src/durable-planning-worker.ts", "export const worker = true;\n");
    await write(root, "src/worker.ts", "export const durablePlanningWorker = true;\n");
    await write(root, "src/unrelated-worker.ts", "export const billing = true;\n");
    const changedSuggestions = await runCli(root, ["link", "suggest", "JS-100", "--since", base, "--json"]);
    expect(changedSuggestions.code).toBe(0);
    const changedSuggestionBody = JSON.parse(changedSuggestions.stdout);
    expect(changedSuggestionBody).toMatchObject({
      ok: true,
      since: base,
      mutated: false,
      suggestions: expect.arrayContaining([
        expect.objectContaining({
          field: "code",
          path: "src/durable-planning-worker.ts",
          matched_terms: expect.arrayContaining(["durable", "planning"]),
          match_reasons: expect.arrayContaining(["path:durable", "path:planning", "source:untracked"]),
        }),
        expect.objectContaining({
          field: "code",
          path: "src/worker.ts",
          matched_terms: expect.arrayContaining(["durable", "planning"]),
          match_reasons: expect.arrayContaining(["content:durable", "content:planning"]),
        }),
      ]),
    });
    expect(changedSuggestionBody.suggestions.every((suggestion: { matched_terms: string[] }) => suggestion.matched_terms.length > 0)).toBe(true);
    expect(changedSuggestionBody.suggestions.map((suggestion: { path: string }) => suggestion.path)).not.toContain("src/unrelated-worker.ts");
    expect(changedSuggestionBody.rejected_candidates).toContainEqual(expect.objectContaining({
      path: "src/unrelated-worker.ts",
      reason: "NO_SOURCE_EVIDENCE",
      matched_terms: [],
      evidence: expect.objectContaining({
        coverage: expect.objectContaining({ matched_terms: 0 }),
      }),
    }));

    const evalJson = await runCli(root, ["link", "eval", "--json"]);
    expect(evalJson.code).toBe(0);
    expect(JSON.parse(evalJson.stdout)).toMatchObject({
      ok: true,
      suite: "built-in",
      fixture_path: null,
      summary: {
        passed: 6,
        failed: 0,
        top1_accuracy: 1,
        mean_reciprocal_rank: 1,
      },
      cases: expect.arrayContaining([
        expect.objectContaining({
          id: "generic-changed-file-rejected",
          passed: true,
          top: null,
          suggestions: [],
        }),
      ]),
    });

    const evalHuman = await runCli(root, ["link", "eval"]);
    expect(evalHuman.code).toBe(0);
    expect(evalHuman.stdout).toContain("# Jumpspace Link Suggestion Eval");
    expect(evalHuman.stdout).toContain("Fixture: built-in");
    expect(evalHuman.stdout).toContain("PASS exact-path-phrase");

    await fs.writeFile(
      path.join(root, "link-fixture.json"),
      JSON.stringify(
        {
          suite: "shared-candidates",
          shared_candidates: [
            {
              path: "src/metrics/quarterly-extract.ts",
              statuses: ["modified"],
              sources: ["fixture"],
              content: "export function extractQuarterlyMetrics() { return true; }\n",
            },
            {
              path: "src/auth/password-entry.tsx",
              statuses: ["modified"],
              sources: ["fixture"],
              content: "export function PasswordEntryForm() { return credentialPasswordEntry(); }\n",
            },
          ],
          cases: [
            {
              id: "metrics-heading",
              task: {
                id: "TASK-METRICS",
                title: "Quarterly metrics extraction",
                module: "metrics",
                keywords: ["quarterly", "metrics"],
                spec: "Quarterly metrics extraction normalizes metric rows.",
              },
              expected: { path: "src/metrics/quarterly-extract.ts", field: "code", max_rank: 1, min_matched_terms: 2 },
            },
            {
              id: "password-heading",
              task: {
                id: "TASK-PASSWORD",
                title: "Password entry form",
                module: "auth",
                keywords: ["password", "credential"],
                spec: "Users enter credentials through the password entry form.",
              },
              expected: { path: "src/auth/password-entry.tsx", field: "code", max_rank: 1, min_matched_terms: 2 },
            },
          ],
        },
        null,
        2,
      ),
    );
    const evalFileJson = await runCli(root, ["link", "eval", "--file", "link-fixture.json", "--json"]);
    expect(evalFileJson.code).toBe(0);
    expect(JSON.parse(evalFileJson.stdout)).toMatchObject({
      ok: true,
      suite: "shared-candidates",
      fixture_path: "link-fixture.json",
      case_count: 2,
      summary: {
        passed: 2,
        failed: 0,
      },
      cases: [
        expect.objectContaining({ id: "metrics-heading", top: expect.objectContaining({ path: "src/metrics/quarterly-extract.ts" }) }),
        expect.objectContaining({ id: "password-heading", top: expect.objectContaining({ path: "src/auth/password-entry.tsx" }) }),
      ],
    });

    await fs.writeFile(path.join(root, "bad-link-fixture.json"), JSON.stringify({ cases: [] }));
    const badEvalFile = await runCli(root, ["link", "eval", "--file", "bad-link-fixture.json", "--json"]);
    expect(badEvalFile.code).toBe(1);
    expect(JSON.parse(badEvalFile.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "INVALID_LINK_EVAL_FIXTURE", path: "bad-link-fixture.json" }],
    });
  });

  it("installs Codex guidance idempotently through the CLI", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-init-"));
    await fs.writeFile(path.join(root, "AGENTS.md"), "custom\n");

    expect((await runCli(root, ["init", "--agent", "codex"])).code).toBe(0);
    expect((await runCli(root, ["init", "--agent", "codex"])).code).toBe(0);

    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");
    expect(agents).toContain("custom");
    expect(agents.match(/BEGIN JUMPSPACE MANAGED: codex/g)).toHaveLength(1);
  });

  it("installs GitHub CI workflow through init CLI", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-init-ci-"));

    const dryRun = await runCli(root, ["init", "--ci", "github", "--dry-run", "--json"]);
    expect(dryRun.code).toBe(0);
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      ok: true,
      dry_run: true,
      files: [expect.objectContaining({ path: ".github/workflows/jumpspace.yml", action: "created", changed: true })],
    });
    await expect(fs.readFile(path.join(root, ".github/workflows/jumpspace.yml"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });

    const installed = await runCli(root, ["init", "--ci", "github", "--json"]);
    expect(installed.code).toBe(0);
    expect(JSON.parse(installed.stdout)).toMatchObject({
      ok: true,
      provider: "github",
      files: [expect.objectContaining({ action: "created", managed: true })],
    });
    const workflow = await fs.readFile(path.join(root, ".github/workflows/jumpspace.yml"), "utf8");
    expect(workflow).toContain("Jumpspace PR Assistant");
    expect(workflow).toContain("jumpspace-pr-assistant:v1");
    expect(JSON.parse((await runCli(root, ["last", "--json"])).stdout)).toMatchObject({
      summary: {
        command: "init --ci github",
        touched_files: [".github/workflows/jumpspace.yml"],
      },
    });

    const unknown = await runCli(root, ["init", "--ci", "circle", "--json"]);
    expect(unknown.code).toBe(1);
    expect(JSON.parse(unknown.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "UNKNOWN_CI_PROVIDER" }],
    });
  });

  it("adds Codex and Claude skill definitions through the CLI", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-skill-"));
    await fs.writeFile(path.join(root, "AGENTS.md"), "custom codex\n");
    await fs.writeFile(path.join(root, "CLAUDE.md"), "custom claude\n");

    const missing = await runCli(root, ["add-skill", "--json"]);
    expect(missing.code).toBe(1);
    expect(JSON.parse(missing.stdout)).toMatchObject({
      ok: false,
      errors: [
        {
          code: "MISSING_AGENT",
        },
      ],
    });

    const installed = await runCli(root, ["add-skill", "--codex", "--claude", "--json"]);
    expect(installed.code).toBe(0);
    expect(JSON.parse(installed.stdout)).toMatchObject({
      ok: true,
      agents: ["codex", "claude"],
      files: [
        { agent: "codex", path: "AGENTS.md" },
        { agent: "codex", path: ".codex/skills/jumpspace-workflow/SKILL.md" },
        { agent: "claude", path: "CLAUDE.md" },
        { agent: "claude", path: ".claude/skills/jumpspace-workflow/SKILL.md" },
      ],
    });

    const repeated = await runCli(root, ["add-skill", "--all", "--json"]);
    expect(JSON.parse(repeated.stdout).files.every((file: { action: string }) => file.action === "unchanged")).toBe(true);

    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");
    const claude = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    const codexSkill = await fs.readFile(path.join(root, ".codex/skills/jumpspace-workflow/SKILL.md"), "utf8");
    const claudeSkill = await fs.readFile(path.join(root, ".claude/skills/jumpspace-workflow/SKILL.md"), "utf8");

    expect(agents).toContain("custom codex");
    expect(claude).toContain("custom claude");
    expect(agents).toContain("@.codex/skills/jumpspace-workflow/SKILL.md");
    expect(claude).toContain("@.claude/skills/jumpspace-workflow/SKILL.md");
    expect(codexSkill).toContain("name: jumpspace-workflow");
    expect(claudeSkill).toContain("name: jumpspace-workflow");
  });

  it("publishes JSON schema contracts through the CLI", async () => {
    const root = await createFixtureRepo();

    const listed = await runCli(root, ["schema", "list", "--json"]);
    expect(listed.code).toBe(0);
    expect(JSON.parse(listed.stdout)).toMatchObject({
      ok: true,
      contract_version: 1,
      schemas: expect.arrayContaining([
        expect.objectContaining({ name: "error" }),
        expect.objectContaining({ name: "schema.coverage" }),
        expect.objectContaining({ name: "find" }),
        expect.objectContaining({ name: "find.compact" }),
        expect.objectContaining({ name: "query" }),
        expect.objectContaining({ name: "init.ci" }),
        expect.objectContaining({ name: "semantic.build" }),
        expect.objectContaining({ name: "semantic.status" }),
        expect.objectContaining({ name: "semantic.search" }),
        expect.objectContaining({ name: "semantic.eval" }),
        expect.objectContaining({ name: "work" }),
        expect.objectContaining({ name: "ask.compact" }),
        expect.objectContaining({ name: "last" }),
        expect.objectContaining({ name: "history" }),
        expect.objectContaining({ name: "doctor" }),
        expect.objectContaining({ name: "release.install-doctor" }),
        expect.objectContaining({ name: "related" }),
        expect.objectContaining({ name: "related.compact" }),
        expect.objectContaining({ name: "plan.review" }),
        expect.objectContaining({ name: "plan.save" }),
        expect.objectContaining({ name: "plan.show" }),
        expect.objectContaining({ name: "plan.validate" }),
        expect.objectContaining({ name: "ready" }),
        expect.objectContaining({ name: "execute" }),
        expect.objectContaining({ name: "next" }),
        expect.objectContaining({ name: "step.complete" }),
        expect.objectContaining({ name: "status" }),
        expect.objectContaining({ name: "verify" }),
        expect.objectContaining({ name: "drift" }),
        expect.objectContaining({ name: "ci" }),
        expect.objectContaining({ name: "pr.comment" }),
        expect.objectContaining({ name: "repair" }),
        expect.objectContaining({ name: "link" }),
        expect.objectContaining({ name: "link.suggest" }),
        expect.objectContaining({ name: "bootstrap.discover" }),
        expect.objectContaining({ name: "bootstrap.propose" }),
        expect.objectContaining({ name: "bootstrap.apply" }),
      ]),
    });

    const shown = await runCli(root, ["schema", "show", "find", "--json"]);
    expect(shown.code).toBe(0);
    expect(JSON.parse(shown.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "find",
        schema: {
          required: ["query", "mode", "results"],
        },
      },
    });

    const coverage = await runCli(root, ["schema", "coverage", "--json"]);
    expect(coverage.code).toBe(0);
    expect(JSON.parse(coverage.stdout)).toMatchObject({
      ok: true,
      summary: {
        missing: 0,
        orphaned: 0,
        stale: 0,
        errors: 0,
      },
    });

    const coverageHuman = await runCli(root, ["schema", "coverage"]);
    expect(coverageHuman.code).toBe(0);
    expect(coverageHuman.stdout).toContain("Schema coverage: ok");

    const compactFindSchema = await runCli(root, ["schema", "show", "find.compact", "--json"]);
    expect(compactFindSchema.code).toBe(0);
    expect(JSON.parse(compactFindSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "find.compact",
        schema: {
          required: expect.arrayContaining(["ok", "compact", "query", "mode", "results"]),
        },
      },
    });

    const compactRelatedSchema = await runCli(root, ["schema", "show", "related.compact", "--json"]);
    expect(compactRelatedSchema.code).toBe(0);
    expect(JSON.parse(compactRelatedSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "related.compact",
        schema: {
          required: expect.arrayContaining(["ok", "compact", "task", "dependencies", "dependents"]),
        },
      },
    });

    const compactAskSchema = await runCli(root, ["schema", "show", "ask.compact", "--json"]);
    expect(compactAskSchema.code).toBe(0);
    expect(JSON.parse(compactAskSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "ask.compact",
        schema: {
          required: expect.arrayContaining(["ok", "compact", "question", "evidence", "coverage"]),
        },
      },
    });

    const workSchema = await runCli(root, ["schema", "show", "work", "--json"]);
    expect(workSchema.code).toBe(0);
    expect(JSON.parse(workSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "work",
        schema: {
          required: expect.arrayContaining(["ok", "packet_version", "task", "plan", "next_steps", "mutation_history", "schemas", "next_action"]),
        },
      },
    });

    const initCiSchema = await runCli(root, ["schema", "show", "init.ci", "--json"]);
    expect(initCiSchema.code).toBe(0);
    expect(JSON.parse(initCiSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "init.ci",
        schema: {
          required: expect.arrayContaining(["ok", "provider", "dry_run", "files", "warnings"]),
        },
      },
    });

    const planSaveSchema = await runCli(root, ["schema", "show", "plan.save", "--json"]);
    expect(planSaveSchema.code).toBe(0);
    expect(JSON.parse(planSaveSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "plan.save",
        schema: {
          required: expect.arrayContaining(["ok", "task_id", "plan"]),
        },
      },
    });

    const stepCompleteSchema = await runCli(root, ["schema", "show", "step.complete", "--json"]);
    expect(stepCompleteSchema.code).toBe(0);
    expect(JSON.parse(stepCompleteSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "step.complete",
        schema: {
          required: expect.arrayContaining(["ok", "task_id", "step", "plan"]),
        },
      },
    });

    const verifySchema = await runCli(root, ["schema", "show", "verify", "--json"]);
    expect(verifySchema.code).toBe(0);
    expect(JSON.parse(verifySchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "verify",
        schema: {
          required: expect.arrayContaining(["ok", "task_id", "status", "record"]),
        },
      },
    });

    const statusSchema = await runCli(root, ["schema", "show", "status", "--json"]);
    expect(statusSchema.code).toBe(0);
    expect(JSON.parse(statusSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "status",
        schema: {
          required: expect.arrayContaining(["ok", "task_id", "status"]),
        },
      },
    });

    const historySchema = await runCli(root, ["schema", "show", "history", "--json"]);
    expect(historySchema.code).toBe(0);
    expect(JSON.parse(historySchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "history",
        schema: {
          required: expect.arrayContaining(["ok", "history_path", "total", "returned", "filters", "entries"]),
        },
      },
    });

    const querySchema = await runCli(root, ["schema", "show", "query", "--json"]);
    expect(querySchema.code).toBe(0);
    expect(JSON.parse(querySchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "query",
        schema: {
          required: expect.arrayContaining(["ok", "query", "results", "unanswered_constraints"]),
        },
      },
    });

    const semanticBuildSchema = await runCli(root, ["schema", "show", "semantic.build", "--json"]);
    expect(semanticBuildSchema.code).toBe(0);
    expect(JSON.parse(semanticBuildSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "semantic.build",
        schema: {
          required: expect.arrayContaining(["ok", "index_path", "backend", "source_index"]),
        },
      },
    });

    const semanticSearchSchema = await runCli(root, ["schema", "show", "semantic.search", "--json"]);
    expect(semanticSearchSchema.code).toBe(0);
    expect(JSON.parse(semanticSearchSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "semantic.search",
        schema: {
          properties: {
            results: {
              items: {
                required: expect.arrayContaining(["graph_expansion", "connected_tasks"]),
              },
            },
          },
        },
      },
    });

    const semanticEvalSchema = await runCli(root, ["schema", "show", "semantic.eval", "--json"]);
    expect(semanticEvalSchema.code).toBe(0);
    expect(JSON.parse(semanticEvalSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "semantic.eval",
        schema: {
          required: expect.arrayContaining(["ok", "query_count", "summary", "active_backend", "results"]),
        },
      },
    });

    const ciSchema = await runCli(root, ["schema", "show", "ci", "--json"]);
    expect(ciSchema.code).toBe(0);
    expect(JSON.parse(ciSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "ci",
        schema: {
          required: expect.arrayContaining(["ok", "since", "scan", "drift", "repair", "suggestions", "summary", "pr_comment"]),
        },
      },
    });

    const prCommentSchema = await runCli(root, ["schema", "show", "pr.comment", "--json"]);
    expect(prCommentSchema.code).toBe(0);
    expect(JSON.parse(prCommentSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "pr.comment",
        schema: {
          required: expect.arrayContaining(["ok", "assistant_version", "idempotency", "mutation_policy", "review_items", "review_comment"]),
          properties: {
            review_items: {
              items: {
                anyOf: expect.arrayContaining([
                  expect.objectContaining({
                    required: expect.arrayContaining(["type", "useful_candidates", "rejected_candidates", "evidence", "body"]),
                    properties: expect.objectContaining({
                      type: { const: "task_block" },
                      useful_candidates: expect.objectContaining({
                        items: expect.objectContaining({
                          required: expect.arrayContaining(["field", "path", "score", "matched_terms", "match_reasons", "evidence"]),
                        }),
                      }),
                      rejected_candidates: expect.objectContaining({
                        items: expect.objectContaining({
                          required: expect.arrayContaining(["field", "path", "reason", "matched_terms", "match_reasons", "evidence"]),
                        }),
                      }),
                    }),
                  }),
                ]),
              },
            },
          },
        },
      },
    });

    const doctorSchema = await runCli(root, ["schema", "show", "doctor", "--json"]);
    expect(doctorSchema.code).toBe(0);
    expect(JSON.parse(doctorSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "doctor",
        schema: {
          required: expect.arrayContaining(["ok", "errors", "warnings", "suggestions", "last_mutation"]),
        },
      },
    });

    const installDoctorSchema = await runCli(root, ["schema", "show", "release.install-doctor", "--json"]);
    expect(installDoctorSchema.code).toBe(0);
    expect(JSON.parse(installDoctorSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "release.install-doctor",
        schema: {
          required: expect.arrayContaining(["ok", "checked_at", "status", "binaries", "workspace", "comparisons"]),
        },
      },
    });

    const repairSchema = await runCli(root, ["schema", "show", "repair", "--json"]);
    expect(repairSchema.code).toBe(0);
    expect(JSON.parse(repairSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "repair",
        schema: {
          required: expect.arrayContaining(["ok", "since", "mode", "mechanical_fixes", "gaps"]),
        },
      },
    });

    const linkSchema = await runCli(root, ["schema", "show", "link", "--json"]);
    expect(linkSchema.code).toBe(0);
    expect(JSON.parse(linkSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "link",
        schema: {
          required: expect.arrayContaining(["ok", "task_id", "operations", "touched_files"]),
        },
      },
    });

    const linkSuggestSchema = await runCli(root, ["schema", "show", "link.suggest", "--json"]);
    expect(linkSuggestSchema.code).toBe(0);
    expect(JSON.parse(linkSuggestSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "link.suggest",
        schema: {
          required: expect.arrayContaining(["ok", "task_id", "suggestions", "rejected_candidates", "mutated"]),
        },
      },
    });

    const proposeSchema = await runCli(root, ["schema", "show", "bootstrap.propose", "--json"]);
    expect(proposeSchema.code).toBe(0);
    expect(JSON.parse(proposeSchema.stdout)).toMatchObject({
      ok: true,
      schema: {
        name: "bootstrap.propose",
        schema: {
          required: expect.arrayContaining(["ok", "propose_version", "mode", "proposal", "validation", "next_commands"]),
        },
      },
    });

    const missing = await runCli(root, ["schema", "show", "missing", "--json"]);
    expect(missing.code).toBe(1);
    expect(JSON.parse(missing.stdout)).toMatchObject({
      ok: false,
      errors: [{ code: "UNKNOWN_SCHEMA" }],
    });
  }, 15_000);

  it("discovers docs and initializes auto config through the CLI", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-discovery-"));
    await write(root, "README.md", "# App\n");
    await write(root, "documentation/specs/feature.md", "# Feature\n");
    await write(root, "apps/workers/example/README.md", "# Worker\n");

    const discovered = await runCli(root, ["bootstrap", "discover", "--json"]);
    expect(discovered.code).toBe(0);
    expect(JSON.parse(discovered.stdout)).toMatchObject({
      ok: true,
      recommended_docs: expect.arrayContaining(["README.md", "documentation/**/*.md", "apps/**/README.md"]),
    });

    const initialized = await runCli(root, ["init", "--auto"]);
    expect(initialized.code).toBe(0);
    expect(JSON.parse(await fs.readFile(path.join(root, ".jumpspace/config.json"), "utf8"))).toMatchObject({
      docs: expect.arrayContaining(["README.md", "documentation/**/*.md", "apps/**/README.md"]),
    });
  });

  it("exports, validates, and applies bootstrap proposals through the CLI", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-bootstrap-"));
    await fs.writeFile(
      path.join(root, "README.md"),
      `# Product docs

## Password entry

Users type their password into the login form.
The implementation lives in src/auth/password.ts.
`,
    );
    await fs.mkdir(path.join(root, "src/auth"), { recursive: true });
    await fs.writeFile(path.join(root, "src/auth/password.ts"), "export const ok = true;\n");

    const context = await runCli(root, ["bootstrap", "context", "README.md", "--json"]);
    expect(context.code).toBe(0);
    expect(JSON.parse(context.stdout)).toMatchObject({
      ok: true,
      headings: [
        expect.objectContaining({ heading: "Product docs" }),
        expect.objectContaining({ heading: "Password entry", line: 3, level: 2, parent_headings: ["Product docs"] }),
      ],
    });

    const proposed = await runCli(root, ["bootstrap", "propose", "README.md", "--file", "draft-proposal.json", "--json"]);
    expect(proposed.code).toBe(0);
    expect(JSON.parse(proposed.stdout)).toMatchObject({
      ok: true,
      mode: "deterministic_extraction",
      agent_generated: false,
      human_approval_required: true,
      proposal_file: "draft-proposal.json",
      proposal: {
        tasks: [
          expect.objectContaining({
            title: "Password entry",
            source: { path: "README.md", heading: "Password entry", line: 3, level: 2, parent_headings: ["Product docs"] },
            code: ["src/auth/password.ts"],
          }),
        ],
      },
      validation: { ok: true },
    });

    const proposedValidation = await runCli(root, ["bootstrap", "validate", "--file", "draft-proposal.json", "--json"]);
    expect(proposedValidation.code).toBe(0);
    expect(JSON.parse(proposedValidation.stdout)).toMatchObject({ ok: true, errors: [] });

    await fs.writeFile(
      path.join(root, "proposal.json"),
      JSON.stringify(
        {
          version: 1,
          tasks: [
            {
              id: "DOC-PASSWORD",
              title: "Password entry",
              source: { path: "README.md", heading: "Password entry", line: 3, level: 2, parent_headings: ["Product docs"] },
              keywords: ["password"],
              code: ["src/auth/password.ts"],
              evidence: [
                {
                  path: "README.md",
                  heading: "Password entry",
                  quote: "The implementation lives in src/auth/password.ts.",
                },
              ],
              confidence: 0.9,
              gaps: ["Tests are not documented."],
            },
          ],
          skipped: [{ path: "README.md", heading: "Product docs", reason: "Container heading." }],
        },
        null,
        2,
      ),
    );

    const validated = await runCli(root, ["bootstrap", "validate", "--file", "proposal.json", "--json"]);
    expect(validated.code).toBe(0);
    expect(JSON.parse(validated.stdout)).toMatchObject({
      ok: true,
      errors: [],
    });

    const beforeApply = await fs.readFile(path.join(root, "README.md"), "utf8");
    const preview = await runCli(root, ["bootstrap", "apply", "--file", "proposal.json", "--dry-run", "--json"]);
    expect(preview.code).toBe(0);
    expect(JSON.parse(preview.stdout)).toMatchObject({
      ok: true,
      dry_run: true,
      applied: [{ id: "DOC-PASSWORD", path: "README.md", heading: "Password entry", line: 3, action: "would_insert" }],
      config_paths_added: [],
    });
    await expect(fs.readFile(path.join(root, "README.md"), "utf8")).resolves.toBe(beforeApply);

    const applied = await runCli(root, ["bootstrap", "apply", "--file", "proposal.json", "--json"]);
    expect(applied.code).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({
      ok: true,
      dry_run: false,
      applied: [{ id: "DOC-PASSWORD", path: "README.md", heading: "Password entry", line: 3, action: "inserted" }],
      config_paths_added: ["README.md"],
    });

    const scan = await runCli(root, ["scan"]);
    expect(scan.code).toBe(0);

    const taskContext = JSON.parse((await runCli(root, ["context", "DOC-PASSWORD", "--json"])).stdout);
    expect(taskContext.task).toMatchObject({
      id: "DOC-PASSWORD",
      doc: { path: "README.md", heading: "Password entry" },
      code: ["src/auth/password.ts"],
    });
  });
});

async function createFixtureRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-"));
  await fs.mkdir(path.join(root, "docs", "specs"), { recursive: true });
  await fs.writeFile(
    path.join(root, "docs", "specs", "feature.md"),
    `# Feature

## Durable planning

<!-- jumpspace
id: JS-100
type: spec
status: approved
code:
  - src/feature.ts
tests:
  - src/feature.test.ts
depends_on: []
acceptance_criteria:
  - id: AC-1
    description: Durable planning works.
-->

Implement durable planning.
`,
  );
  await fs.mkdir(path.join(root, "src"), { recursive: true });
  await fs.writeFile(path.join(root, "src", "feature.ts"), "base\n");
  await fs.writeFile(path.join(root, "src", "feature.test.ts"), "base\n");
  await fs.writeFile(
    path.join(root, "plan.yml"),
    `task_id: JS-100
goal: Implement durable planning.
status: planned
steps:
  - id: design
    outcome: Design is approved.
    status: pending
    depends_on: []
    source_files:
      - docs/specs/feature.md
    tests: []
    checks:
      - jumpspace plan validate JS-100
    evidence: []
  - id: implement
    outcome: Implementation exists.
    status: pending
    depends_on:
      - design
    source_files:
      - src/feature.ts
    tests:
      - src/feature.test.ts
    checks:
      - npm test
    evidence: []
`,
  );
  return root;
}

async function createReleasePackageRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-release-"));
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
        keywords: ["ai", "agents", "developer-tools", "knowledge-graph"],
        bin: { jumpspace: "./dist/cli.js" },
        files: [
          "dist",
          "schemas/*.json",
          "sdk/python/jumpspace_sdk/*.py",
          "sdk/python/pyproject.toml",
          "README.md",
          "LICENSE"
        ],
      },
      null,
      2,
    ),
  );
  await write(root, "README.md", "# Jumpspace\n");
  await write(root, "LICENSE", "MIT\n");
  await write(
    root,
    "dist/cli.js",
    `#!/usr/bin/env node
const schemas = Array.from({ length: ${schemaCatalog.length} }, (_, index) => ({
  name: \`schema.\${index}\`,
  command: \`command \${index}\`,
  description: \`schema \${index}\`,
}));
if (process.argv[2] === "--version") {
  console.log("0.1.0");
} else if (process.argv[2] === "schema" && process.argv[3] === "list" && process.argv[4] === "--json") {
  console.log(JSON.stringify({ ok: true, contract_version: 1, schemas }));
}
`,
  );
  await fs.chmod(path.join(root, "dist", "cli.js"), 0o755);
  await fs.mkdir(path.join(root, "bin"), { recursive: true });
  await fs.symlink(path.join(root, "dist", "cli.js"), path.join(root, "bin", "jumpspace"));
  await write(root, "dist/templates/AGENTS.md", "# Agents\n");
  await write(root, "dist/templates/SKILL.md", "# Skill\n");
  await write(root, "dist/sdk/contracts.js", "export const contracts = true;\n");
  await write(root, "dist/sdk/contracts.d.ts", "export declare const contracts = true;\n");
  await write(root, "sdk/python/jumpspace_sdk/__init__.py", "\n");
  await write(root, "sdk/python/jumpspace_sdk/contracts.py", "CONTRACT_VERSION = 1\n");
  await write(root, "sdk/python/pyproject.toml", "[project]\nname = \"jumpspace-sdk\"\n");
  await write(
    root,
    "schemas/catalog.json",
    JSON.stringify({
      contract_version: 1,
      schema_count: schemaCatalog.length,
      schemas: schemaCatalog.map((schema) => ({
        name: schema.name,
        command: schema.command,
        description: schema.description,
        file: `${schema.name}.schema.json`,
      })),
    }),
  );
  for (const schema of schemaCatalog) {
    await write(
      root,
      `schemas/${schema.name}.schema.json`,
      JSON.stringify({
        contract_version: 1,
        name: schema.name,
        command: schema.command,
        description: schema.description,
        schema: schema.schema,
      }),
    );
  }
  return root;
}

async function createSemanticGraphRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-semantic-"));
  await write(
    root,
    "docs/specs/retrieval.md",
    `# Retrieval

## Task vector graph retrieval

<!-- jumpspace
id: RET-100
type: spec
status: approved
module: retrieval
space: module
keywords:
  - task vector
  - graph retrieval
code:
  - src/retrieval.ts
tests:
  - src/retrieval.test.ts
depends_on:
  - GRAPH-100
refs:
  - type: related_to
    id: ASK-100
-->

Semantic task vector graph retrieval expands matched tasks through connected evidence.

## Graph query

<!-- jumpspace
id: GRAPH-100
type: spec
status: implemented
module: graph
space: module
code:
  - src/graph.ts
tests:
  - src/graph.test.ts
depends_on: []
-->

Graph query explains task relationships.

## Ask evidence

<!-- jumpspace
id: ASK-100
type: spec
status: implemented
module: retrieval
space: module
code:
  - src/ask.ts
tests:
  - src/ask.test.ts
depends_on: []
-->

Ask returns evidence summaries for retrieval questions.
`,
  );
  await write(root, "src/retrieval.ts", "export const retrieval = true;\n");
  await write(root, "src/retrieval.test.ts", "export const retrievalTest = true;\n");
  await write(root, "src/graph.ts", "export const graph = true;\n");
  await write(root, "src/graph.test.ts", "export const graphTest = true;\n");
  await write(root, "src/ask.ts", "export const ask = true;\n");
  await write(root, "src/ask.test.ts", "export const askTest = true;\n");
  return root;
}

async function createGraphQueryRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-query-"));
  await write(
    root,
    "docs/specs/graph.md",
    `# Graph query fixtures

## ADR 0017

<!-- jumpspace
id: ADR-0017
type: adr
status: implemented
module: metrics
space: repo
code:
  - docs/specs/graph.md
tests: []
depends_on: []
-->

Metric library decision.

## Metric implementation

<!-- jumpspace
id: MET-001
type: spec
status: approved
module: metrics
space: repo
code:
  - src/metrics/library.ts
tests: []
depends_on:
  - ADR-0017
refs:
  - type: implements
    id: ADR-0017
acceptance_criteria:
  - id: AC-1
    description: Metrics are extracted.
-->

Metric implementation.

## Metric QA

<!-- jumpspace
id: MET-002
type: spec
status: verified
module: metrics
space: repo
code:
  - src/metrics/qa.ts
tests:
  - src/metrics/qa.test.ts
depends_on:
  - MET-001
verification_records:
  - id: verify-1
    verified_at: 2026-01-01T00:00:00.000Z
    commit: abc123
    checks:
      - command: npm test
        exit_code: 0
    acceptance_criteria_covered:
      - AC-1
    evidence:
      - Tests passed.
-->

Metric QA.
`,
  );
  await write(root, "src/metrics/library.ts", "export const library = true;\n");
  await write(root, "src/metrics/qa.ts", "export const qa = true;\n");
  await write(root, "src/metrics/qa.test.ts", "export const test = true;\n");
  return root;
}

async function createCiReportRepo(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-cli-ci-"));
  await write(
    root,
    "docs/specs/feature.md",
    `# Feature

## Existing task

<!-- jumpspace
id: JS-100
type: spec
status: approved
code:
  - src/feature.ts
tests: []
depends_on: []
-->

Existing task.
`,
  );
  await write(root, "src/feature.ts", "export const feature = true;\n");
  return root;
}

async function initGitRepo(root: string): Promise<void> {
  await execFileAsync("git", ["init"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "-m", "base"], { cwd: root });
}

async function write(root: string, repoPath: string, content: string): Promise<void> {
  const filePath = path.join(root, repoPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function runCli(cwd: string, args: string[], options: CliOptions = {}): Promise<CliResult> {
  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    const child = spawn(process.execPath, ["--import", tsxLoaderPath, cliPath, ...args], {
      cwd,
      env: {
        ...process.env,
        ...options.env,
        FORCE_COLOR: "0",
      },
    });
    let stdout = "";
    let stderr = "";
    const timeoutMs = options.timeoutMs ?? 30_000;
    let killTimeout: ReturnType<typeof setTimeout> | null = null;
    const timeout = setTimeout(() => {
      timedOut = true;
      stderr += `${stderr ? "\n" : ""}CLI timed out after ${timeoutMs}ms: jumpspace ${args.join(" ")}`;
      child.kill("SIGTERM");
      killTimeout = setTimeout(() => child.kill("SIGKILL"), 2_000);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (killTimeout) {
        clearTimeout(killTimeout);
      }
      resolve({
        code: 1,
        stdout: stdout.trim(),
        stderr: `${stderr}${stderr ? "\n" : ""}${String(error)}`.trim(),
      });
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (killTimeout) {
        clearTimeout(killTimeout);
      }
      resolve({
        code: timedOut ? 124 : code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}
