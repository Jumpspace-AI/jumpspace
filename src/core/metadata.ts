import fs from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { atomicWriteFile } from "./atomicWrite.js";
import { resolveRepoPath } from "./config.js";
import { withMutationLock, type MutationLockOptions } from "./mutationLock.js";
import { jumpTaskMetadataSchema, type JumpTask, type JumpTaskMetadata } from "./types.js";

const jumpspaceCommentPattern = /<!--\s*jumpspace\b([\s\S]*?)-->/g;

export type MetadataUpdater = (metadata: JumpTaskMetadata) => JumpTaskMetadata;
export type UpdateTaskMetadataOptions = {
  lock?: MutationLockOptions;
  beforeWrite?: () => Promise<void>;
};

export async function updateTaskMetadata(
  root: string,
  task: JumpTask,
  updater: MetadataUpdater,
  options: UpdateTaskMetadataOptions = {},
): Promise<JumpTaskMetadata> {
  return withMutationLock(
    root,
    async () => {
      const docPath = resolveRepoPath(root, task.doc.path);
      const markdown = await fs.readFile(docPath, "utf8");
      let found = false;
      let updatedMetadata: JumpTaskMetadata | undefined;

      const updated = markdown.replace(jumpspaceCommentPattern, (fullMatch, rawYaml: string) => {
        const parsed = jumpTaskMetadataSchema.parse(parseYaml(rawYaml.trim()));
        if (parsed.id !== task.id) {
          return fullMatch;
        }

        found = true;
        updatedMetadata = jumpTaskMetadataSchema.parse(updater(parsed));
        return `<!-- jumpspace\n${stringifyYaml(updatedMetadata, { lineWidth: 0 }).trimEnd()}\n-->`;
      });

      if (!found || !updatedMetadata) {
        throw new Error(`Could not find Jumpspace block for task ${task.id} in ${task.doc.path}.`);
      }

      await options.beforeWrite?.();
      await atomicWriteFile(docPath, updated);
      return updatedMetadata;
    },
    options.lock,
  );
}
