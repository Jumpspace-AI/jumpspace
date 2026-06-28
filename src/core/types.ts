import { z } from "zod";

export const JUMP_TASK_TYPES = ["spec", "engineering", "hotfix", "adr"] as const;

export type JumpTaskType = (typeof JUMP_TASK_TYPES)[number];

export const JUMP_TASK_STATUSES = [
  "draft",
  "proposed",
  "approved",
  "partial",
  "implemented",
  "verified",
  "stale",
] as const;

export type JumpTaskStatus = (typeof JUMP_TASK_STATUSES)[number];

export const JUMP_TASK_SPACES = ["repo", "module", "global"] as const;

export type JumpTaskSpace = (typeof JUMP_TASK_SPACES)[number];

export const JUMP_TASK_REF_TYPES = [
  "depends_on",
  "related_to",
  "implements",
  "supersedes",
  "conflicts_with",
  "informs",
] as const;

export type JumpTaskRefType = (typeof JUMP_TASK_REF_TYPES)[number];

export type JumpTaskSource = {
  type: string;
  id?: string;
  url?: string;
  title?: string;
};

export type JumpAcceptanceCriterion = {
  id: string;
  description: string;
};

export type JumpVerificationCheck = {
  command: string;
  exit_code: number;
};

export type JumpVerificationRecord = {
  id: string;
  verified_at: string;
  commit: string;
  checks: JumpVerificationCheck[];
  acceptance_criteria_covered: string[];
  evidence: string[];
};

export type JumpTaskRef = {
  type: JumpTaskRefType;
  id: string;
  note?: string;
};

export const JUMP_PLAN_STATUSES = ["planned", "in_progress", "complete", "blocked"] as const;

export type JumpPlanStatus = (typeof JUMP_PLAN_STATUSES)[number];

export const JUMP_PLAN_STEP_STATUSES = ["pending", "in_progress", "complete", "blocked"] as const;

export type JumpPlanStepStatus = (typeof JUMP_PLAN_STEP_STATUSES)[number];

export type JumpPlanStep = {
  id: string;
  outcome: string;
  status: JumpPlanStepStatus;
  depends_on: string[];
  source_files: string[];
  tests: string[];
  checks: string[];
  evidence: string[];
};

export type JumpPlan = {
  task_id: string;
  goal: string;
  status: JumpPlanStatus;
  steps: JumpPlanStep[];
};

export type JumpTask = {
  id: string;
  title: string;
  type: JumpTaskType;
  status: JumpTaskStatus;
  module?: string;
  space?: JumpTaskSpace;
  keywords?: string[];
  doc: {
    path: string;
    heading: string;
    line?: number;
    level?: number;
    parent_headings?: string[];
  };
  spec: string;
  code: string[];
  tests: string[];
  gaps?: string[];
  depends_on: string[];
  refs?: JumpTaskRef[];
  sources?: JumpTaskSource[];
  plan?: JumpPlan;
  acceptance_criteria?: JumpAcceptanceCriterion[];
  verification_records?: JumpVerificationRecord[];
  external?: Record<string, unknown>;
};

export type JumpIndex = {
  version: 1;
  generatedAt: string;
  tasks: JumpTask[];
};

export type JumpConfig = {
  docs: string[];
  indexPath: string;
  semanticIndex?: {
    enabled?: boolean;
    path?: string;
    backend?: "auto" | "local-task-vector-v1" | "lancedb-onnx-v1" | "lancedb+onnx";
    model?: string;
    storePath?: string;
  };
};

export type IssueSeverity = "warning" | "error";

export type JumpIssue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  path?: string;
  line?: number;
  taskId?: string;
  stepId?: string;
};

export const jumpTaskSourceSchema = z
  .object({
    type: z.string().min(1),
    id: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
  })
  .strict();

export const jumpTaskRefSchema = z
  .object({
    type: z.enum(JUMP_TASK_REF_TYPES),
    id: z.string().min(1),
    note: z.string().min(1).optional(),
  })
  .strict();

export const jumpAcceptanceCriterionSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
  })
  .strict();

export const jumpVerificationCheckSchema = z
  .object({
    command: z.string().min(1),
    exit_code: z.number().int(),
  })
  .strict();

export const jumpVerificationRecordSchema = z
  .object({
    id: z.string().min(1),
    verified_at: z.string().min(1),
    commit: z.string().min(1),
    checks: z.array(jumpVerificationCheckSchema).min(1),
    acceptance_criteria_covered: z.array(z.string().min(1)).min(1),
    evidence: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const jumpPlanStepSchema = z
  .object({
    id: z.string().min(1),
    outcome: z.string().min(1),
    status: z.enum(JUMP_PLAN_STEP_STATUSES),
    depends_on: z.array(z.string().min(1)).default([]),
    source_files: z.array(z.string().min(1)).default([]),
    tests: z.array(z.string().min(1)).default([]),
    checks: z.array(z.string().min(1)).default([]),
    evidence: z.array(z.string().min(1)).default([]),
  })
  .strict();

export const jumpPlanSchema = z
  .object({
    task_id: z.string().min(1),
    goal: z.string().min(1),
    status: z.enum(JUMP_PLAN_STATUSES),
    steps: z.array(jumpPlanStepSchema).min(1),
  })
  .strict();

export const jumpTaskMetadataSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(JUMP_TASK_TYPES),
    status: z.enum(JUMP_TASK_STATUSES),
    module: z.string().min(1).optional(),
    space: z.enum(JUMP_TASK_SPACES).default("repo"),
    keywords: z.array(z.string().min(1)).optional(),
    code: z.array(z.string().min(1)).default([]),
    tests: z.array(z.string().min(1)).default([]),
    gaps: z.array(z.string().min(1)).default([]),
    depends_on: z.array(z.string().min(1)).default([]),
    refs: z.array(jumpTaskRefSchema).default([]),
    sources: z.array(jumpTaskSourceSchema).optional(),
    plan: jumpPlanSchema.optional(),
    acceptance_criteria: z.array(jumpAcceptanceCriterionSchema).optional(),
    verification_records: z.array(jumpVerificationRecordSchema).optional(),
    external: z.record(z.unknown()).optional(),
  })
  .strict();

export type JumpTaskMetadata = z.infer<typeof jumpTaskMetadataSchema>;

export const jumpTaskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    type: z.enum(JUMP_TASK_TYPES),
    status: z.enum(JUMP_TASK_STATUSES),
    module: z.string().min(1).optional(),
    space: z.enum(JUMP_TASK_SPACES).default("repo"),
    keywords: z.array(z.string()).optional(),
    doc: z.object({
      path: z.string().min(1),
      heading: z.string().min(1),
      line: z.number().int().positive().optional(),
      level: z.number().int().min(1).max(6).optional(),
      parent_headings: z.array(z.string().min(1)).optional(),
    }),
    spec: z.string(),
    code: z.array(z.string()),
    tests: z.array(z.string()),
    gaps: z.array(z.string()).default([]),
    depends_on: z.array(z.string()),
    refs: z.array(jumpTaskRefSchema).default([]),
    sources: z.array(jumpTaskSourceSchema).optional(),
    plan: jumpPlanSchema.optional(),
    acceptance_criteria: z.array(jumpAcceptanceCriterionSchema).optional(),
    verification_records: z.array(jumpVerificationRecordSchema).optional(),
    external: z.record(z.unknown()).optional(),
  })
  .strict();

export const jumpIndexSchema = z
  .object({
    version: z.literal(1),
    generatedAt: z.string().min(1),
    tasks: z.array(jumpTaskSchema),
  })
  .strict();

export const jumpConfigSchema: z.ZodType<JumpConfig> = z
  .object({
    docs: z.array(z.string().min(1)).min(1),
    indexPath: z.string().min(1),
    semanticIndex: z
      .object({
        enabled: z.boolean().default(false),
        path: z.string().min(1).optional(),
        backend: z.enum(["auto", "local-task-vector-v1", "lancedb-onnx-v1", "lancedb+onnx"]).optional(),
        model: z.string().min(1).optional(),
        storePath: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
