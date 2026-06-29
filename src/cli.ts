#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { createRequire } from "node:module";
import { runAddSkill } from "./commands/addSkill.js";
import { runAsk } from "./commands/ask.js";
import { runAudit } from "./commands/audit.js";
import { runBootstrapApply, runBootstrapContext, runBootstrapDiscover, runBootstrapPropose, runBootstrapValidate } from "./commands/bootstrap.js";
import { runChanged } from "./commands/changed.js";
import { runCi } from "./commands/ci.js";
import { runDrift } from "./commands/drift.js";
import { runDoctor } from "./commands/doctor.js";
import { runContext } from "./commands/context.js";
import { runExecute } from "./commands/execute.js";
import { runFind } from "./commands/find.js";
import { runHandoff } from "./commands/handoff.js";
import { runHistory } from "./commands/history.js";
import { runInit } from "./commands/init.js";
import { runLast } from "./commands/last.js";
import { runLinkEval, runLinkSuggest, runLinkUpdate } from "./commands/link.js";
import { runList } from "./commands/list.js";
import { runNext } from "./commands/next.js";
import { runPlanReview, runPlanSave, runPlanShow, runPlanValidate } from "./commands/plan.js";
import { runPrComment } from "./commands/pr.js";
import { runQuery } from "./commands/query.js";
import { runReady } from "./commands/ready.js";
import { runRelated } from "./commands/related.js";
import { runRepair } from "./commands/repair.js";
import { runReleaseDoctor, runReleaseInstallDoctor } from "./commands/release.js";
import { runScan } from "./commands/scan.js";
import { runSchemaCoverage, runSchemaList, runSchemaShow } from "./commands/schema.js";
import { runSemanticBuild, runSemanticEval, runSemanticSearch, runSemanticStatus } from "./commands/semantic.js";
import { runStepComplete } from "./commands/step.js";
import { runStatus } from "./commands/status.js";
import { runVerify } from "./commands/verify.js";
import { runWork } from "./commands/work.js";
import { renderJsonError } from "./core/errors.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

const program = new Command();

program
  .name("jumpspace")
  .description("Repo-local implementation memory for AI coding agents.")
  .version(packageJson.version);

program
  .command("init")
  .description("Create starter Jumpspace files in the current repo.")
  .option("--force", "overwrite existing starter files")
  .option("--auto", "detect common existing doc roots for starter config")
  .option("--agent <agent>", "install repo-local guidance for an agent")
  .option("--ci <provider>", "install repo-local CI workflow integration")
  .option("--dry-run", "preview CI workflow installation without writing files")
  .option("--json", "print machine-readable JSON")
  .action((options: { force?: boolean; auto?: boolean; agent?: string; ci?: string; dryRun?: boolean; json?: boolean }) =>
    runCommand(
      () =>
        runInit({
          force: options.force,
          auto: options.auto,
          agent: options.agent,
          ci: options.ci,
          dryRun: options.dryRun,
          json: options.json,
        }),
      { json: options.json },
    ),
  );

program
  .command("add-skill")
  .description("Install repo-local Jumpspace skill definitions for coding agents.")
  .argument(
    "[skills...]",
    "optional skill names or aliases: jumpspace-workflow, jumpspace-bootstrap, jumpspace-work, jumpspace-review, jumpspace-handoff",
  )
  .option("--agent <agent>", "install for one supported agent: codex or claude")
  .option("--codex", "install Codex guidance and skill definition")
  .option("--claude", "install Claude guidance and skill definition")
  .option("--all", "install every supported agent skill")
  .option("--json", "print machine-readable JSON")
  .action((skills: string[], options: { agent?: string; codex?: boolean; claude?: boolean; all?: boolean; json?: boolean }) =>
    runCommand(
      () =>
        runAddSkill({
          skills,
          agent: options.agent,
          codex: options.codex,
          claude: options.claude,
          all: options.all,
          json: options.json,
        }),
      { json: options.json },
    ),
  );

program
  .command("scan")
  .description("Parse Markdown task blocks and write the repo-local Jumpspace index.")
  .action(() => runCommand(() => runScan()));

program
  .command("last")
  .description("Show the most recent Jumpspace mutation summary.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) => runCommand(() => runLast({ json: options.json }), { json: options.json }));

program
  .command("history")
  .description("Show the generated Jumpspace mutation history.")
  .option("--task <id>", "filter to mutation entries that mention a task ID")
  .option("--limit <n>", "maximum entries to return", "20")
  .option("--json", "print machine-readable JSON")
  .action((options: { task?: string; limit?: string; json?: boolean }) =>
    runCommand(() => runHistory({ task: options.task, limit: options.limit, json: options.json }), { json: options.json }),
  );

program
  .command("handoff")
  .description("Summarize recent Jumpspace work, health, task state, and next commands.")
  .option("--task <id>", "include task-specific plan and next-step state")
  .option("--limit <n>", "maximum mutation entries to summarize", String(8))
  .option("--json", "print machine-readable JSON")
  .action((options: { task?: string; limit?: string; json?: boolean }) =>
    runCommand(() => runHandoff({ task: options.task, limit: options.limit, json: options.json }), { json: options.json }),
  );

program
  .command("doctor")
  .description("Run post-mutation diagnostics and repair suggestions.")
  .option("--since <ref>", "include repair opportunities since a Git ref")
  .option("--json", "print machine-readable JSON")
  .action((options: { since?: string; json?: boolean }) =>
    runCommand(() => runDoctor({ since: options.since, json: options.json }), { json: options.json }),
  );

const releaseCommand = program
  .command("release")
  .description("Inspect package release readiness.")
  .action(() => releaseCommand.help());

releaseCommand
  .command("doctor")
  .description("Run package release-readiness diagnostics before npm publish.")
  .option("--check-registry", "attempt an npm registry name/version availability check")
  .option("--json", "print machine-readable JSON")
  .action((options: { checkRegistry?: boolean; json?: boolean }) =>
    runCommand(() => runReleaseDoctor({ checkRegistry: options.checkRegistry, json: options.json }), { json: options.json }),
  );

releaseCommand
  .command("install-doctor")
  .description("Inspect which Jumpspace binary this shell and agent are actually running.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) =>
    runCommand(() => runReleaseInstallDoctor({ json: options.json }), { json: options.json }),
  );

const schemaCommand = program
  .command("schema")
  .description("Print stable JSON schema contracts for agent-facing command output.")
  .action(() => schemaCommand.help());

schemaCommand
  .command("list")
  .description("List available command output schemas.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) => runCommand(() => runSchemaList({ json: options.json }), { json: options.json }));

schemaCommand
  .command("show")
  .description("Show one command output schema.")
  .argument("<name>", "schema name")
  .option("--json", "print machine-readable JSON")
  .action((name: string, options: { json?: boolean }) => runCommand(() => runSchemaShow(name, { json: options.json }), { json: options.json }));

schemaCommand
  .command("coverage")
  .description("Check JSON command declarations against schemas, generated artifacts, and SDK names.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) => runCommand(() => runSchemaCoverage({ json: options.json }), { json: options.json }));

program
  .command("list")
  .description("List indexed Jumpspace tasks.")
  .option("--status <status>", "filter by task status")
  .option("--type <type>", "filter by task type")
  .option("--module <module>", "filter by task module")
  .option("--space <space>", "filter by task space")
  .option("--json", "print machine-readable JSON")
  .action((options: { status?: string; type?: string; module?: string; space?: string; json?: boolean }) =>
    runCommand(() =>
      runList({
        status: options.status,
        type: options.type,
        module: options.module,
        space: options.space,
        json: options.json,
      }),
      { json: options.json },
    ),
  );

program
  .command("find")
  .description("Search indexed Jumpspace tasks.")
  .argument("<query...>", "search query")
  .option("--status <status>", "filter by task status")
  .option("--type <type>", "filter by task type")
  .option("--module <module>", "filter by task module")
  .option("--space <space>", "filter by task space")
  .option("--mode <mode>", "term matching mode: all or any", "all")
  .option("--compact", "with --json, print bounded task briefs instead of full task payloads")
  .option("--json", "print machine-readable JSON")
  .action((query: string[], options: { status?: string; type?: string; module?: string; space?: string; mode?: string; compact?: boolean; json?: boolean }) =>
    runCommand(() =>
      runFind(query.join(" "), {
        status: options.status,
        type: options.type,
        module: options.module,
        space: options.space,
        mode: options.mode,
        compact: options.compact,
        json: options.json,
      }),
      { json: options.json },
    ),
  );

program
  .command("context")
  .description("Print an agent-ready context packet for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { json?: boolean }) => runCommand(() => runContext(id, { json: options.json }), { json: options.json }));

program
  .command("ask")
  .description("Summarize repo-local Jumpspace evidence for a question.")
  .argument("<question...>", "question to investigate")
  .option("--compact", "with --json, print bounded evidence briefs instead of full evidence payloads")
  .option("--json", "print machine-readable JSON")
  .action((question: string[], options: { compact?: boolean; json?: boolean }) =>
    runCommand(() => runAsk(question.join(" "), { compact: options.compact, json: options.json }), { json: options.json }),
  );

const semanticCommand = program
  .command("semantic")
  .description("Manage the optional generated semantic retrieval index.")
  .action(() => semanticCommand.help());

semanticCommand
  .command("build")
  .description("Build and enable the local semantic task index.")
  .option("--backend <backend>", "semantic backend: auto, local-task-vector-v1, or lancedb+onnx")
  .option("--model <model>", "local embedding model name or path for dense backends")
  .option("--store-path <path>", "repo-local LanceDB store path for dense backends")
  .option("--json", "print machine-readable JSON")
  .action((options: { backend?: string; model?: string; storePath?: string; json?: boolean }) =>
    runCommand(
      () =>
        runSemanticBuild({
          backend: options.backend,
          model: options.model,
          storePath: options.storePath,
          json: options.json,
        }),
      { json: options.json },
    ),
  );

semanticCommand
  .command("status")
  .description("Inspect semantic index readiness and staleness.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) => runCommand(() => runSemanticStatus({ json: options.json }), { json: options.json }));

semanticCommand
  .command("search")
  .description("Search the generated semantic task index.")
  .argument("<query...>", "semantic search query")
  .option("--limit <n>", "maximum results to return")
  .option("--json", "print machine-readable JSON")
  .action((query: string[], options: { limit?: string; json?: boolean }) =>
    runCommand(
      () =>
        runSemanticSearch(query.join(" "), {
          limit: parsePositiveInteger(options.limit),
          json: options.json,
        }),
      { json: options.json },
    ),
  );

semanticCommand
  .command("eval")
  .description("Evaluate lexical, local task-vector, and active semantic retrieval on built-in fixtures.")
  .option("--limit <n>", "maximum results per query")
  .option("--json", "print machine-readable JSON")
  .action((options: { limit?: string; json?: boolean }) =>
    runCommand(
      () =>
        runSemanticEval({
          limit: parsePositiveInteger(options.limit),
          json: options.json,
        }),
      { json: options.json },
    ),
  );

program
  .command("query")
  .description("Run deterministic structured graph queries over indexed Jumpspace tasks.")
  .option("--status <status>", "match task status; repeat for OR behavior", collect, [])
  .option("--type <type>", "match task type; repeat for OR behavior", collect, [])
  .option("--module <module>", "match task module; repeat for OR behavior", collect, [])
  .option("--space <space>", "match task space; repeat for OR behavior", collect, [])
  .option("--depends-on <id>", "match direct task dependency; repeat for AND behavior", collect, [])
  .option("--depends-on-transitive <id>", "match direct or transitive task dependency; repeat for AND behavior", collect, [])
  .option("--ref <type:id>", "match outbound structured ref; repeat for AND behavior", collect, [])
  .option("--referenced-by <type:id>", "match inbound structured ref from a task; repeat for AND behavior", collect, [])
  .option("--code-path <substring>", "match linked code path substring; repeat for AND behavior", collect, [])
  .option("--test-path <substring>", "match linked test path substring; repeat for AND behavior", collect, [])
  .option("--acceptance <id>", "match acceptance criterion ID; repeat for AND behavior", collect, [])
  .option("--has-code", "match tasks with linked code")
  .option("--no-code", "match tasks with no linked code")
  .option("--has-tests", "match tasks with linked tests")
  .option("--no-tests", "match tasks with no linked tests")
  .option("--has-gaps", "match tasks with explicit gaps")
  .option("--no-gaps", "match tasks with no explicit gaps")
  .option("--verified", "match tasks with verified status")
  .option("--unverified", "match tasks without verified status")
  .option("--where <field=value>", "compact deterministic predicate; repeat for AND behavior", collect, [])
  .option("--json", "print machine-readable JSON")
  .action(
    (options: {
      status?: string[];
      type?: string[];
      module?: string[];
      space?: string[];
      dependsOn?: string[];
      dependsOnTransitive?: string[];
      ref?: string[];
      referencedBy?: string[];
      codePath?: string[];
      testPath?: string[];
      acceptance?: string[];
      hasCode?: boolean;
      code?: boolean;
      hasTests?: boolean;
      tests?: boolean;
      hasGaps?: boolean;
      gaps?: boolean;
      verified?: boolean;
      unverified?: boolean;
      where?: string[];
      json?: boolean;
    }) =>
      runCommand(
        () =>
          runQuery({
            status: options.status,
            type: options.type,
            module: options.module,
            space: options.space,
            dependsOn: options.dependsOn,
            dependsOnTransitive: options.dependsOnTransitive,
            ref: options.ref,
            referencedBy: options.referencedBy,
            codePath: options.codePath,
            testPath: options.testPath,
            acceptance: options.acceptance,
            hasCode: options.hasCode,
            code: options.code,
            hasTests: options.hasTests,
            tests: options.tests,
            hasGaps: options.hasGaps,
            gaps: options.gaps,
            verified: options.verified,
            unverified: options.unverified,
            where: options.where,
            json: options.json,
          }),
        { json: options.json },
      ),
  );

const bootstrapCommand = program
  .command("bootstrap")
  .description("Bootstrap a source-backed Jumpspace graph from existing Markdown docs.")
  .action(() => bootstrapCommand.help());

bootstrapCommand
  .command("discover")
  .description("Discover common Markdown doc roots and recommended bootstrap config.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) => runCommand(() => runBootstrapDiscover({ json: options.json }), { json: options.json }));

bootstrapCommand
  .command("context")
  .description("Export document context for an AI agent to propose Jumpspace task blocks.")
  .argument("[paths...]", "Markdown files or glob patterns to inspect")
  .option("--json", "print machine-readable JSON")
  .action((paths: string[], options: { json?: boolean }) =>
    runCommand(() => runBootstrapContext(paths, { json: options.json }), { json: options.json }),
  );

bootstrapCommand
  .command("propose")
  .description("Create a deterministic bootstrap proposal draft from discovered docs or supplied paths.")
  .argument("[paths...]", "Markdown files or glob patterns to inspect")
  .option("--file <file>", "write the proposal JSON to a file for validate/apply")
  .option("--json", "print machine-readable JSON")
  .action((paths: string[], options: { file?: string; json?: boolean }) =>
    runCommand(() => runBootstrapPropose({ patterns: paths, file: options.file, json: options.json }), { json: options.json }),
  );

bootstrapCommand
  .command("validate")
  .description("Validate an AI-generated bootstrap proposal file.")
  .requiredOption("--file <file>", "bootstrap proposal JSON file")
  .option("--json", "print machine-readable JSON")
  .action((options: { file: string; json?: boolean }) =>
    runCommand(() => runBootstrapValidate({ file: options.file, json: options.json }), { json: options.json }),
  );

bootstrapCommand
  .command("apply")
  .description("Apply an approved bootstrap proposal file as source Markdown task blocks.")
  .requiredOption("--file <file>", "bootstrap proposal JSON file")
  .option("--dry-run", "preview planned Markdown insertions without writing files")
  .option("--json", "print machine-readable JSON")
  .action((options: { file: string; dryRun?: boolean; json?: boolean }) =>
    runCommand(() => runBootstrapApply({ file: options.file, dryRun: options.dryRun, json: options.json }), { json: options.json }),
  );

const planCommand = program
  .command("plan")
  .description("Review and manage durable task plans.")
  .action(() => planCommand.help());

planCommand
  .command("review")
  .description("Print a human approval packet for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { json?: boolean }) => runCommand(() => runPlanReview(id, { json: options.json }), { json: options.json }));

planCommand
  .command("save")
  .description("Persist a durable plan from a YAML or JSON file into a task block.")
  .argument("<id>", "Jumpspace task ID")
  .requiredOption("--file <file>", "plan file to save")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { file: string; json?: boolean }) =>
    runCommand(() => runPlanSave(id, { file: options.file, json: options.json }), { json: options.json }),
  );

planCommand
  .command("show")
  .description("Show the durable plan for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { json?: boolean }) => runCommand(() => runPlanShow(id, { json: options.json }), { json: options.json }));

planCommand
  .command("validate")
  .description("Validate the durable plan for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { json?: boolean }) => runCommand(() => runPlanValidate(id, { json: options.json }), { json: options.json }));

program
  .command("ready")
  .description("List approved tasks ready for agent execution.")
  .option("--status <status>", "filter by task status")
  .option("--type <type>", "filter by task type")
  .option("--module <module>", "filter by task module")
  .option("--space <space>", "filter by task space")
  .option("--include-blocked", "include approved tasks blocked by dependencies")
  .option("--json", "print machine-readable JSON")
  .action((options: {
    status?: string;
    type?: string;
    module?: string;
    space?: string;
    includeBlocked?: boolean;
    json?: boolean;
  }) =>
    runCommand(() =>
      runReady({
        status: options.status,
        type: options.type,
        module: options.module,
        space: options.space,
        includeBlocked: options.includeBlocked,
        json: options.json,
      }),
      { json: options.json },
    ),
  );

program
  .command("execute")
  .description("Print an agent execution packet for an approved task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--force", "print the packet even when the task is blocked")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { force?: boolean; json?: boolean }) =>
    runCommand(() => runExecute(id, { force: options.force, json: options.json }), { json: options.json }),
  );

program
  .command("work")
  .description("Print a complete agent start packet for a ready task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--since <ref>", "include drift facts and warnings since a Git ref")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { since?: string; json?: boolean }) =>
    runCommand(() => runWork(id, { since: options.since, json: options.json }), { json: options.json }),
  );

program
  .command("next")
  .description("Show pending unblocked plan steps for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { json?: boolean }) => runCommand(() => runNext(id, { json: options.json }), { json: options.json }));

const stepCommand = program.command("step").description("Update durable task plan steps.");

stepCommand
  .command("complete")
  .description("Complete a plan step with evidence.")
  .argument("<task-id>", "Jumpspace task ID")
  .argument("<step-id>", "plan step ID")
  .requiredOption("--evidence <evidence>", "completion evidence")
  .option("--json", "print machine-readable JSON")
  .action((taskId: string, stepId: string, options: { evidence: string; json?: boolean }) =>
    runCommand(() => runStepComplete(taskId, stepId, { evidence: options.evidence, json: options.json }), { json: options.json }),
  );

const linkCommand = program
  .command("link")
  .description("Update or suggest task code/test/dependency/ref/gap links.")
  .action(() => linkCommand.help());

linkCommand
  .command("update")
  .description("Add or remove task code, test, dependency, ref, and gap metadata.")
  .argument("<id>", "Jumpspace task ID")
  .option("--code <path>", "add a linked code path; repeat for multiple paths", collect, [])
  .option("--test <path>", "add a linked test path; repeat for multiple paths", collect, [])
  .option("--depends-on <id>", "add a task dependency; repeat for multiple dependencies", collect, [])
  .option("--ref <type:id>", "add a structured task ref; repeat for multiple refs", collect, [])
  .option("--gap <text>", "add an explicit task gap; repeat for multiple gaps", collect, [])
  .option("--remove-code <path>", "remove a linked code path; repeat for multiple paths", collect, [])
  .option("--remove-test <path>", "remove a linked test path; repeat for multiple paths", collect, [])
  .option("--remove-depends-on <id>", "remove a task dependency; repeat for multiple dependencies", collect, [])
  .option("--remove-ref <type:id>", "remove a structured task ref; repeat for multiple refs", collect, [])
  .option("--remove-gap <text>", "remove an explicit task gap; repeat for multiple gaps", collect, [])
  .option("--dry-run", "preview metadata mutations without writing source Markdown")
  .option("--json", "print machine-readable JSON")
  .action(
    (
      id: string,
      options: {
        code?: string[];
        test?: string[];
        dependsOn?: string[];
        ref?: string[];
        gap?: string[];
        removeCode?: string[];
        removeTest?: string[];
        removeDependsOn?: string[];
        removeRef?: string[];
        removeGap?: string[];
        dryRun?: boolean;
        json?: boolean;
      },
    ) =>
      runCommand(
        () =>
          runLinkUpdate(id, {
            code: options.code,
            test: options.test,
            dependsOn: options.dependsOn,
            ref: options.ref,
            gap: options.gap,
            removeCode: options.removeCode,
            removeTest: options.removeTest,
            removeDependsOn: options.removeDependsOn,
            removeRef: options.removeRef,
            removeGap: options.removeGap,
            dryRun: options.dryRun,
            json: options.json,
          }),
        { json: options.json },
      ),
  );

linkCommand
  .command("suggest")
  .description("Suggest code/test links from working-tree changes, changed files, or explicit candidate paths without mutating source.")
  .argument("<id>", "Jumpspace task ID")
  .option("--since <ref>", "Git ref to compare against for changed-file candidates")
  .option("--path <path>", "candidate path to score; repeat for multiple paths", collect, [])
  .option("--limit <n>", "maximum suggestions to return")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { since?: string; path?: string[]; limit?: string; json?: boolean }) =>
    runCommand(
      () =>
        runLinkSuggest(id, {
          since: options.since,
          path: options.path,
          limit: parsePositiveInteger(options.limit),
          json: options.json,
        }),
      { json: options.json },
    ),
  );

linkCommand
  .command("eval")
  .description("Evaluate built-in or file-based link suggestion ranking fixtures.")
  .option("--file <fixture-file>", "JSON fixture file to evaluate instead of the built-in suite")
  .option("--limit <n>", "maximum suggestions to keep per fixture")
  .option("--json", "print machine-readable JSON")
  .action((options: { file?: string; limit?: string; json?: boolean }) =>
    runCommand(() => runLinkEval({ file: options.file, limit: parsePositiveInteger(options.limit), json: options.json }), { json: options.json }),
  );

program
  .command("status")
  .description("Update a task status. The verified status must be earned with verify.")
  .argument("<id>", "Jumpspace task ID")
  .argument("<status>", "new task status")
  .option("--json", "print machine-readable JSON")
  .action((id: string, status: string, options: { json?: boolean }) =>
    runCommand(() => runStatus(id, status, { json: options.json }), { json: options.json }),
  );

program
  .command("verify")
  .description("Run checks and record structured verification evidence for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--check <command>", "verification command to run; repeat for multiple checks", collect, [])
  .option("--criteria <id...>", "acceptance criterion IDs covered")
  .option("--evidence <evidence>", "human-readable verification evidence")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { check: string[]; criteria?: string[]; evidence?: string; json?: boolean }) =>
    runCommand(
      () =>
        runVerify(id, {
          check: options.check,
          criteria: options.criteria,
          evidence: options.evidence,
          json: options.json,
        }),
      { json: options.json },
    ),
  );

program
  .command("related")
  .description("Show dependency and reference relationships for a task.")
  .argument("<id>", "Jumpspace task ID")
  .option("--compact", "with --json, print bounded task briefs instead of full task payloads")
  .option("--json", "print machine-readable JSON")
  .action((id: string, options: { compact?: boolean; json?: boolean }) =>
    runCommand(() => runRelated(id, { compact: options.compact, json: options.json }), { json: options.json }),
  );

program
  .command("changed")
  .description("List Git changes since a ref across committed, staged, unstaged, and untracked files.")
  .requiredOption("--since <ref>", "Git ref to compare against")
  .option("--json", "print machine-readable JSON")
  .action((options: { since: string; json?: boolean }) =>
    runCommand(() => runChanged({ since: options.since, json: options.json }), { json: options.json }),
  );

program
  .command("ci")
  .description("Run a local CI/PR Jumpspace report with drift, repair, graph, and suggestion packets.")
  .requiredOption("--since <ref>", "Git ref to compare against")
  .option("--query <field=value>", "additional graph query predicate; repeat for AND behavior", collect, [])
  .option("--json", "print machine-readable JSON")
  .action((options: { since: string; query?: string[]; json?: boolean }) =>
    runCommand(() => runCi({ since: options.since, query: options.query, json: options.json }), { json: options.json }),
  );

const prCommand = program
  .command("pr")
  .description("Generate review-only PR assistant output from the local CI packet.")
  .action(() => prCommand.help());

prCommand
  .command("comment")
  .description("Render an idempotent Jumpspace PR assistant review comment.")
  .requiredOption("--since <ref>", "Git ref to compare against")
  .option("--json", "print machine-readable JSON")
  .action((options: { since: string; json?: boolean }) =>
    runCommand(() => runPrComment({ since: options.since, json: options.json }), { json: options.json }),
  );

program
  .command("drift")
  .description("Detect factual task-memory drift and separate heuristic warnings.")
  .requiredOption("--since <ref>", "Git ref to compare against")
  .option("--json", "print machine-readable JSON")
  .action((options: { since: string; json?: boolean }) =>
    runCommand(() => runDrift({ since: options.since, json: options.json }), { json: options.json }),
  );

program
  .command("repair")
  .description("Preview or apply safe task-memory repairs for Git path drift.")
  .requiredOption("--since <ref>", "Git ref to compare against")
  .option("--apply", "apply mechanical fixes and record gaps")
  .option("--json", "print machine-readable JSON")
  .action((options: { since: string; apply?: boolean; json?: boolean }) =>
    runCommand(() => runRepair({ since: options.since, apply: options.apply, json: options.json }), { json: options.json }),
  );

program
  .command("audit")
  .description("Validate Jumpspace task metadata and linked files.")
  .option("--json", "print machine-readable JSON")
  .action((options: { json?: boolean }) => runCommand(() => runAudit({ json: options.json }), { json: options.json }));

await program.parseAsync();

async function runCommand(command: () => Promise<number>, options: { json?: boolean } = {}): Promise<void> {
  try {
    const code = await command();
    if (code !== 0) {
      process.exitCode = code;
    }
  } catch (error) {
    if (options.json) {
      console.log(renderJsonError(error));
    } else {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    }
    process.exitCode = 1;
  }
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
