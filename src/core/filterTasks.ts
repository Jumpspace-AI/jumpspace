import {
  JUMP_TASK_SPACES,
  JUMP_TASK_STATUSES,
  JUMP_TASK_TYPES,
  type JumpIndex,
  type JumpTask,
} from "./types.js";

export type TaskFilterOptions = {
  status?: string;
  type?: string;
  module?: string;
  space?: string;
};

export function filterTasks(index: JumpIndex, options: TaskFilterOptions): JumpTask[] {
  return index.tasks.filter((task) => {
    if (options.status && task.status !== options.status) {
      return false;
    }
    if (options.type && task.type !== options.type) {
      return false;
    }
    if (options.module && task.module !== options.module) {
      return false;
    }
    if (options.space && task.space !== options.space) {
      return false;
    }
    return true;
  });
}

export function validateTaskFilters(options: TaskFilterOptions): void {
  validateFilter("status", options.status, JUMP_TASK_STATUSES);
  validateFilter("type", options.type, JUMP_TASK_TYPES);
  validateFilter("space", options.space, JUMP_TASK_SPACES);
}

function validateFilter(name: string, value: string | undefined, allowed: readonly string[]): void {
  if (value && !allowed.includes(value)) {
    throw new Error(`Invalid ${name} "${value}". Expected one of: ${allowed.join(", ")}.`);
  }
}
