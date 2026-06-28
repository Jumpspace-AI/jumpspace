import fs from "node:fs/promises";
import path from "node:path";

const cliPath = path.join(process.cwd(), "dist", "cli.js");

await fs.chmod(cliPath, 0o755);
