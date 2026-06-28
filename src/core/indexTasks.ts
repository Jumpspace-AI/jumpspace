import fs from "node:fs/promises";
import fg from "fast-glob";
import { loadConfig } from "./config.js";
import { parseMarkdownTasks } from "./parseMarkdown.js";
import type { JumpConfig, JumpIndex, JumpIssue } from "./types.js";

export type IndexTasksResult = {
  index: JumpIndex;
  issues: JumpIssue[];
};

export async function indexTasks(root = process.cwd(), config?: JumpConfig): Promise<IndexTasksResult> {
  const activeConfig = config ?? (await loadConfig(root));
  const files = await fg(activeConfig.docs, {
    cwd: root,
    onlyFiles: true,
    unique: true,
    dot: false,
    ignore: ["node_modules/**", "dist/**"],
  });

  const tasks = [];
  const issues: JumpIssue[] = [];

  for (const file of files.sort()) {
    const markdown = await fs.readFile(`${root}/${file}`, "utf8");
    const parsed = parseMarkdownTasks(markdown, file);
    tasks.push(...parsed.tasks);
    issues.push(...parsed.issues);
  }

  return {
    index: {
      version: 1,
      generatedAt: new Date().toISOString(),
      tasks,
    },
    issues,
  };
}

