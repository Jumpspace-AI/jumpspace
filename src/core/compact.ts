import type { JumpTask } from "./types.js";

export type CompactTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  module?: string;
  space?: string;
  doc: {
    path: string;
    heading: string;
    line?: number;
    level?: number;
    parent_headings?: string[];
  };
  links: {
    code: number;
    tests: number;
    gaps: number;
    depends_on: number;
    refs: number;
  };
  code: string[];
  tests: string[];
  gaps: string[];
  depends_on: string[];
};

export function compactTask(task: JumpTask): CompactTask {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    module: task.module,
    space: task.space,
    doc: task.doc,
    links: {
      code: task.code.length,
      tests: task.tests.length,
      gaps: task.gaps?.length ?? 0,
      depends_on: task.depends_on.length,
      refs: task.refs?.length ?? 0,
    },
    code: task.code,
    tests: task.tests,
    gaps: task.gaps ?? [],
    depends_on: task.depends_on,
  };
}
