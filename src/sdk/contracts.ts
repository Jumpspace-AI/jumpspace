import { getSchema, listSchemas, SCHEMA_CONTRACT_VERSION, type JsonSchemaDefinition, type SchemaListEntry } from "../core/schemas.js";
import type { AuditResult } from "../commands/audit.js";
import type { AskSummary } from "../core/ask.js";
import type { BootstrapApplyResult, BootstrapContext, BootstrapValidationResult } from "../core/bootstrap.js";
import type { BootstrapProposeResult } from "../core/bootstrapPropose.js";
import type { ChangedFilesResult } from "../core/changed.js";
import type { CiReport } from "../core/ci.js";
import type { DoctorReport } from "../core/doctor.js";
import type { DriftResult } from "../core/drift.js";
import type { JsonCommandError } from "../core/errors.js";
import type { GraphQueryReport } from "../core/graphQuery.js";
import type { HandoffPacket } from "../core/handoff.js";
import type { InstallDoctorReport } from "../core/installDoctor.js";
import type { PrAssistantReport } from "../core/prAssistant.js";
import type { ReleaseDoctorReport } from "../core/releaseDoctor.js";
import type { DriftRepairReport } from "../core/repair.js";
import type { SchemaCoverageReport } from "../core/schemaCoverage.js";
import type { SemanticBuildResult, SemanticSearchResultPacket, SemanticStatusResult } from "../commands/semantic.js";
import type { SemanticEvaluationReport } from "../core/semanticIndex.js";
import type { LinkSuggestionEvalReport } from "../core/taskLinkEval.js";
import type { InstallCiWorkflowResult } from "../core/ciWorkflow.js";
import type { LastMutationSummary, MutationHistoryReport } from "../core/mutations.js";
import type { TaskSearchResult, SearchMode } from "../core/searchTasks.js";
import type { WorkPacket } from "../core/workPacket.js";
import type { JumpIndex, JumpPlan, JumpPlanStep, JumpTask, JumpTaskStatus, JumpVerificationRecord } from "../core/types.js";
import type { ExecutionState } from "../core/execution.js";

export const JUMPSPACE_CONTRACT_VERSION = SCHEMA_CONTRACT_VERSION;

export const JUMPSPACE_SCHEMA_NAMES = [
  "error",
  "schema.list",
  "schema.show",
  "schema.coverage",
  "list",
  "find",
  "find.compact",
  "audit",
  "last",
  "history",
  "handoff",
  "init.ci",
  "doctor",
  "release.doctor",
  "release.install-doctor",
  "context",
  "related",
  "related.compact",
  "plan.review",
  "plan.save",
  "plan.show",
  "plan.validate",
  "ready",
  "execute",
  "next",
  "step.complete",
  "status",
  "verify",
  "work",
  "ask",
  "ask.compact",
  "semantic.build",
  "semantic.status",
  "semantic.search",
  "semantic.eval",
  "query",
  "drift",
  "ci",
  "pr.comment",
  "repair",
  "link",
  "link.suggest",
  "link.eval",
  "bootstrap.context",
  "bootstrap.discover",
  "bootstrap.propose",
  "bootstrap.validate",
  "bootstrap.apply",
] as const;

export type JumpspaceSchemaName = (typeof JUMPSPACE_SCHEMA_NAMES)[number];

export type JumpspaceError = JsonCommandError;

export type JumpspaceErrorEnvelope = {
  ok: false;
  errors: JumpspaceError[];
};

export type JumpspaceCommandResult<T> = T | JumpspaceErrorEnvelope;

export type SchemaListCommandResult = {
  ok: true;
  contract_version: typeof JUMPSPACE_CONTRACT_VERSION;
  schemas: SchemaListEntry[];
};

export type SchemaShowCommandResult = {
  ok: true;
  contract_version: typeof JUMPSPACE_CONTRACT_VERSION;
  schema: JsonSchemaDefinition;
};
export type SchemaCoverageCommandResult = SchemaCoverageReport;

export type ListCommandResult = {
  tasks: JumpTask[];
};

export type FindCommandResult = {
  query: string;
  mode: SearchMode;
  results: TaskSearchResult[];
};

export type ContextCommandResult = {
  task: JumpTask;
  plan: JumpPlan | null;
  execution: ExecutionState | undefined;
};

export type PlanReviewCommandResult = ExecutionState;
export type PlanSaveCommandResult = {
  ok: true;
  task_id: string;
  plan: JumpPlan;
};
export type PlanShowCommandResult = {
  task_id: string;
  plan: JumpPlan;
};
export type PlanValidateCommandResult = {
  task_id: string;
  ok: boolean;
  issues: unknown[];
  errors: JumpspaceError[];
};
export type ReadyCommandResult = {
  tasks: ExecutionState[];
};
export type NextCommandResult = {
  task_id: string;
  steps: JumpPlanStep[];
};
export type ExecuteCommandResult = ExecutionState & {
  ok: boolean;
  forced: boolean;
  errors?: JumpspaceError[];
};
export type StepCompleteCommandResult = {
  ok: true;
  task_id: string;
  step: JumpPlanStep;
  plan: JumpPlan;
};
export type StatusCommandResult = {
  ok: true;
  task_id: string;
  status: Exclude<JumpTaskStatus, "verified">;
};
export type VerifyCommandResult = {
  ok: true;
  task_id: string;
  status: "verified";
  record: JumpVerificationRecord;
};

export type ChangedCommandResult = ChangedFilesResult;
export type DriftCommandResult = DriftResult;
export type RepairCommandResult = DriftRepairReport;
export type AuditCommandResult = AuditResult & {
  errors: AuditResult["issues"];
  warnings: AuditResult["issues"];
};
export type LastCommandResult = {
  ok: true;
  summary: LastMutationSummary;
};
export type HistoryCommandResult = MutationHistoryReport & {
  ok: true;
};
export type HandoffCommandResult = HandoffPacket;
export type DoctorCommandResult = DoctorReport;
export type ReleaseDoctorCommandResult = ReleaseDoctorReport;
export type ReleaseInstallDoctorCommandResult = InstallDoctorReport;
export type InitCiCommandResult = InstallCiWorkflowResult;
export type AskCommandResult = AskSummary;
export type SemanticBuildCommandResult = SemanticBuildResult;
export type SemanticStatusCommandResult = SemanticStatusResult;
export type SemanticSearchCommandResult = SemanticSearchResultPacket;
export type SemanticEvalCommandResult = SemanticEvaluationReport;
export type LinkEvalCommandResult = LinkSuggestionEvalReport;
export type QueryCommandResult = GraphQueryReport;
export type WorkCommandResult = WorkPacket;
export type CiCommandResult = CiReport;
export type PrCommentCommandResult = PrAssistantReport;
export type BootstrapContextCommandResult = BootstrapContext;
export type BootstrapProposeCommandResult = BootstrapProposeResult & {
  proposal_file?: string;
};
export type BootstrapValidateCommandResult = BootstrapValidationResult;
export type BootstrapApplyCommandResult = BootstrapApplyResult;
export type IndexJson = JumpIndex;

export function listSdkSchemas(): SchemaListEntry[] {
  return listSchemas();
}

export function getSdkSchema(name: JumpspaceSchemaName): JsonSchemaDefinition {
  const schema = getSchema(name);
  if (!schema) {
    throw new Error(`Unknown Jumpspace schema "${name}".`);
  }
  return schema;
}

export function isJumpspaceSchemaName(value: string): value is JumpspaceSchemaName {
  return (JUMPSPACE_SCHEMA_NAMES as readonly string[]).includes(value);
}

export function isJumpspaceErrorEnvelope(value: unknown): value is JumpspaceErrorEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as { ok?: unknown; errors?: unknown };
  return candidate.ok === false && Array.isArray(candidate.errors);
}

export function assertOk<T>(result: JumpspaceCommandResult<T>): T {
  if (isJumpspaceErrorEnvelope(result)) {
    const message = result.errors.map((error) => error.message).join("; ") || "Unknown Jumpspace error.";
    throw new Error(message);
  }
  return result;
}
