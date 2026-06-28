import type { JumpIssue } from "./types.js";

export type JsonCommandError = {
  code: string;
  message: string;
  taskId?: string;
  path?: string;
  stepId?: string;
};

export type JsonErrorEnvelope = {
  ok: false;
  errors: JsonCommandError[];
};

export class JumpspaceCommandError extends Error {
  readonly errors: JsonCommandError[];

  constructor(errors: JsonCommandError | JsonCommandError[]) {
    const normalized = Array.isArray(errors) ? errors : [errors];
    super(normalized.map((error) => error.message).join("\n"));
    this.name = "JumpspaceCommandError";
    this.errors = normalized;
  }
}

export function commandError(
  code: string,
  message: string,
  details: Omit<JsonCommandError, "code" | "message"> = {},
): JsonCommandError {
  return {
    code,
    message,
    ...details,
  };
}

export function issueToCommandError(issue: JumpIssue): JsonCommandError {
  return {
    code: issue.code,
    message: issue.message,
    taskId: issue.taskId,
    path: issue.path,
    stepId: issue.stepId,
  };
}

export function issuesToCommandErrors(issues: JumpIssue[]): JsonCommandError[] {
  return issues.map(issueToCommandError);
}

export function errorEnvelope(errors: JsonCommandError | JsonCommandError[]): JsonErrorEnvelope {
  return {
    ok: false,
    errors: Array.isArray(errors) ? errors : [errors],
  };
}

export function errorsFromUnknown(error: unknown): JsonCommandError[] {
  if (error instanceof JumpspaceCommandError) {
    return error.errors;
  }
  return [
    commandError("COMMAND_FAILED", error instanceof Error ? error.message : String(error)),
  ];
}

export function renderJsonError(error: unknown): string {
  return JSON.stringify(errorEnvelope(errorsFromUnknown(error)), null, 2);
}
