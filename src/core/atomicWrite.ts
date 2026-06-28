import fs from "node:fs/promises";
import path from "node:path";

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const directory = path.dirname(filePath);
  const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  const handle = await fs.open(tempPath, "w");

  try {
    await handle.writeFile(content);
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }

  await handle.close();
  await fs.rename(tempPath, filePath);

  const directoryHandle = await fs.open(directory, "r").catch(() => undefined);
  if (directoryHandle) {
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  }
}
