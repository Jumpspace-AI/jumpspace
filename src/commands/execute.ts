import { readIndex } from "../core/config.js";
import { commandError } from "../core/errors.js";
import { getExecutionState, renderExecutionPacket } from "../core/execution.js";

export type ExecuteOptions = {
  root?: string;
  force?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
};

export async function runExecute(id: string, options: ExecuteOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const index = await readIndex(root);
  const state = getExecutionState(index, id);

  if (!state) {
    throw new Error(`Unknown Jumpspace task ID "${id}". Run \`jumpspace task find <query>\` to locate it.`);
  }

  if (!state.ready && !options.force) {
    writeLine(
      options.json
        ? JSON.stringify(
            {
              ...state,
              ok: false,
              errors: state.blockers.map((blocker) =>
                commandError("EXECUTION_BLOCKED", blocker.message, {
                  taskId: blocker.taskId,
                }),
              ),
            },
            null,
            2,
          )
        : renderExecutionPacket(state),
    );
    return 1;
  }

  writeLine(
    options.json
      ? JSON.stringify({ ...state, ok: state.ready, forced: Boolean(options.force && !state.ready) }, null, 2)
      : renderExecutionPacket(state, { forced: options.force && !state.ready }),
  );
  return 0;
}
