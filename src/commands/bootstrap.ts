import {
  applyBootstrapProposal,
  createBootstrapContext,
  renderBootstrapContext,
  renderBootstrapValidation,
  validateBootstrapProposal,
  type BootstrapValidationResult,
} from "../core/bootstrap.js";
import { createBootstrapProposalDraft, type BootstrapProposeResult } from "../core/bootstrapPropose.js";
import { discoverDocs, type DiscoveryResult } from "../core/discovery.js";
import {
  formatBootstrapProposalParseError,
  readBootstrapProposalFile,
} from "../core/bootstrapProposal.js";
import { atomicWriteFile } from "../core/atomicWrite.js";
import { CONFIG_PATH, loadConfig, pathExists, resolveRepoPath } from "../core/config.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { recordMutation } from "../core/mutations.js";

export type BootstrapOptions = {
  root?: string;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export type BootstrapFileOptions = BootstrapOptions & {
  file: string;
  dryRun?: boolean;
};

export type BootstrapProposeOptions = BootstrapOptions & {
  patterns?: string[];
  file?: string;
};

export async function runBootstrapContext(patterns: string[], options: BootstrapOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const context = await createBootstrapContext(root, patterns);

  writeLine(options.json ? JSON.stringify(context, null, 2) : renderBootstrapContext(context));
  return 0;
}

export async function runBootstrapDiscover(options: BootstrapOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const discovery = await discoverDocs(root);

  writeLine(options.json ? JSON.stringify(discovery, null, 2) : formatBootstrapDiscovery(discovery));
  return 0;
}

export async function runBootstrapPropose(options: BootstrapProposeOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const proposal = await createBootstrapProposalDraft(root, { patterns: options.patterns ?? [] });
  const proposalFile = await maybeWriteProposalFile(root, options, proposal);
  if (proposalFile === false) {
    return 1;
  }

  const output = proposalFile ? { ...proposal, proposal_file: proposalFile } : proposal;
  writeLine(options.json ? JSON.stringify(output, null, 2) : renderBootstrapPropose(output));
  return proposal.validation.ok ? 0 : 1;
}

export async function runBootstrapValidate(options: BootstrapFileOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const proposal = await readProposalOrWriteError(options);
  if (!proposal) {
    return 1;
  }

  const validation = await validateBootstrapProposal(root, proposal);
  writeLine(options.json ? JSON.stringify(validation, null, 2) : renderBootstrapValidation(validation));
  return validation.ok ? 0 : 1;
}

export async function runBootstrapApply(options: BootstrapFileOptions): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const proposal = await readProposalOrWriteError(options);
  if (!proposal) {
    return 1;
  }

  const validation = await validateBootstrapProposal(root, proposal);
  if (!validation.ok) {
    writeValidationFailure(options, validation);
    return 1;
  }

  const result = await applyBootstrapProposal(root, proposal, { dryRun: options.dryRun });
  if (!result.dry_run) {
    const config = await loadConfig(root);
    await recordMutation(root, {
      command: "task bootstrap apply",
      touched_files: [
        ...result.applied.map((item) => item.path),
        ...(result.config_paths_added.length ? [CONFIG_PATH] : []),
        config.indexPath,
      ],
      task_ids: result.applied.map((item) => item.id),
      config_changes: result.config_paths_added.map((path) => `added ${path} to ${CONFIG_PATH}`),
      index_changed: true,
    });
  }
  writeLine(
    options.json
      ? JSON.stringify(result, null, 2)
      : formatBootstrapApplyResult(result),
  );
  return 0;
}

async function maybeWriteProposalFile(
  root: string,
  options: BootstrapProposeOptions,
  proposal: BootstrapProposeResult,
): Promise<string | false | undefined> {
  if (!options.file) {
    return undefined;
  }

  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const proposalPath = resolveRepoPath(root, options.file);
  if (await pathExists(proposalPath)) {
    const error = commandError("BOOTSTRAP_PROPOSAL_FILE_EXISTS", `Bootstrap proposal file already exists: ${options.file}`, { path: options.file });
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return false;
  }

  await atomicWriteFile(proposalPath, `${JSON.stringify(proposal.proposal, null, 2)}\n`);
  return options.file;
}

function formatBootstrapApplyResult(result: Awaited<ReturnType<typeof applyBootstrapProposal>>): string {
  const verb = result.dry_run ? "Would apply" : "Applied";
  const ids = result.applied.map((item) => `${item.id} -> ${item.path}:${item.line}`).join(", ");
  return `${verb} ${result.applied.length} bootstrap task block(s): ${ids}`;
}

function renderBootstrapPropose(result: BootstrapProposeResult & { proposal_file?: string }): string {
  const lines = [
    "# Jumpspace Bootstrap Proposal",
    "",
    `Mode: ${result.mode}`,
    `Agent generated: ${result.agent_generated ? "yes" : "no"}`,
    `Human approval required: ${result.human_approval_required ? "yes" : "no"}`,
    `Documents: ${result.summary.documents}`,
    `Headings: ${result.summary.headings}`,
    `Proposed tasks: ${result.summary.proposed_tasks}`,
    `Skipped headings: ${result.summary.skipped_headings}`,
    `Validation errors: ${result.summary.validation_errors}`,
    `Validation warnings: ${result.summary.validation_warnings}`,
    result.proposal_file ? `Proposal file: ${result.proposal_file}` : "Proposal file: not written; rerun with --file <proposal-file> to save one.",
    "",
    "## Next Commands",
    `- ${result.next_commands.validate}`,
    `- ${result.next_commands.dry_run}`,
    `- ${result.next_commands.apply_after_approval}`,
    "",
    "## Notes",
    ...result.notes.map((note) => `- ${note}`),
  ];

  return lines.join("\n");
}

function formatBootstrapDiscovery(discovery: DiscoveryResult): string {
  const lines = [
    "# Jumpspace Bootstrap Discovery",
    "",
    `Recommended docs: ${discovery.recommended_docs.join(", ")}`,
    `Profile hints: ${discovery.profile_hints.join(", ") || "none"}`,
    "",
    "## Candidates",
  ];

  for (const candidate of discovery.candidates) {
    lines.push(
      "",
      `- ${candidate.recommended ? "use" : "skip"} ${candidate.pattern}`,
      `  files: ${candidate.files}`,
      `  reason: ${candidate.reason}`,
      `  samples: ${candidate.sample_paths.join(", ") || "none"}`,
    );
  }

  lines.push("", `Ignored patterns: ${discovery.ignored_patterns.join(", ")}`);
  return lines.join("\n");
}

async function readProposalOrWriteError(options: BootstrapFileOptions) {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  try {
    return await readBootstrapProposalFile(options.file);
  } catch (error) {
    const commandErrorValue = commandError("INVALID_BOOTSTRAP_PROPOSAL", `Invalid bootstrap proposal: ${formatBootstrapProposalParseError(error)}`, {
      path: options.file,
    });
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(commandErrorValue), null, 2));
    } else {
      errorLine(commandErrorValue.message);
    }
    return undefined;
  }
}

function writeValidationFailure(options: BootstrapOptions, validation: BootstrapValidationResult): void {
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  if (options.json) {
    writeLine(JSON.stringify({ ...errorEnvelope(validation.errors), issues: validation.issues, warnings: validation.warnings }, null, 2));
    return;
  }

  for (const issue of validation.issues) {
    const line = `${issue.code}${issue.taskId ? ` ${issue.taskId}` : ""}${issue.path ? ` ${issue.path}` : ""}: ${issue.message}`;
    if (issue.severity === "error") {
      errorLine(line);
    } else {
      writeLine(line);
    }
  }
}
