import { loadConfig, writeIndex } from "./config.js";
import { indexTasks } from "./indexTasks.js";

export async function refreshIndex(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const indexed = await indexTasks(root, config);
  await writeIndex(root, indexed.index, config.indexPath);
}
