import fs from "node:fs/promises";
import { z } from "zod";
import { commandError, type JsonCommandError } from "./errors.js";
import { jumpAcceptanceCriterionSchema, jumpTaskRefSchema, jumpTaskSourceSchema } from "./types.js";

export const BOOTSTRAP_PROPOSAL_VERSION = 1;

export const bootstrapEvidenceSchema = z
  .object({
    path: z.string().min(1),
    heading: z.string().min(1).optional(),
    quote: z.string().min(1).optional(),
    reason: z.string().min(1).optional(),
  })
  .strict();

export const bootstrapTaskProposalSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    source: z
      .object({
        path: z.string().min(1),
        heading: z.string().min(1),
        line: z.number().int().positive().optional(),
        level: z.number().int().min(1).max(6).optional(),
        parent_headings: z.array(z.string().min(1)).optional(),
      })
      .strict(),
    type: z.enum(["spec", "engineering", "hotfix", "adr"]).default("spec"),
    status: z.enum(["draft", "proposed"]).default("proposed"),
    module: z.string().min(1).optional(),
    space: z.enum(["repo", "module", "global"]).default("repo"),
    keywords: z.array(z.string().min(1)).default([]),
    summary: z.string().min(1).optional(),
    code: z.array(z.string().min(1)).default([]),
    tests: z.array(z.string().min(1)).default([]),
    depends_on: z.array(z.string().min(1)).default([]),
    refs: z.array(jumpTaskRefSchema).default([]),
    sources: z.array(jumpTaskSourceSchema).optional(),
    acceptance_criteria: z.array(jumpAcceptanceCriterionSchema).optional(),
    evidence: z.array(bootstrapEvidenceSchema).min(1),
    confidence: z.number().min(0).max(1),
    gaps: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const bootstrapSkippedHeadingSchema = z
  .object({
    path: z.string().min(1),
    heading: z.string().min(1),
    line: z.number().int().positive().optional(),
    level: z.number().int().min(1).max(6).optional(),
    parent_headings: z.array(z.string().min(1)).optional(),
    reason: z.string().min(1),
  })
  .strict();

export const bootstrapProposalSchema = z
  .object({
    version: z.literal(BOOTSTRAP_PROPOSAL_VERSION).default(BOOTSTRAP_PROPOSAL_VERSION),
    tasks: z.array(bootstrapTaskProposalSchema).default([]),
    skipped: z.array(bootstrapSkippedHeadingSchema).default([]),
  })
  .strict();

export type BootstrapEvidence = z.infer<typeof bootstrapEvidenceSchema>;
export type BootstrapTaskProposal = z.infer<typeof bootstrapTaskProposalSchema>;
export type BootstrapProposal = z.infer<typeof bootstrapProposalSchema>;

export async function readBootstrapProposalFile(filePath: string): Promise<BootstrapProposal> {
  const raw = await fs.readFile(filePath, "utf8");
  return parseBootstrapProposal(raw);
}

export function parseBootstrapProposal(raw: string): BootstrapProposal {
  return bootstrapProposalSchema.parse(JSON.parse(raw));
}

export function formatBootstrapProposalParseError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return error.message;
  }
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "proposal"}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function duplicateProposalIdErrors(tasks: BootstrapTaskProposal[]): JsonCommandError[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    counts.set(task.id, (counts.get(task.id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => commandError("DUPLICATE_BOOTSTRAP_TASK_ID", `Bootstrap proposal contains duplicate task ID "${id}".`, { taskId: id }));
}
