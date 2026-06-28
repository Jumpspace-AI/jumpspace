import { addJumpspaceSkills, SUPPORTED_SKILL_AGENTS, type SkillAgent } from "../core/agentSkills.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { recordMutation } from "../core/mutations.js";

export type AddSkillOptions = {
  root?: string;
  codex?: boolean;
  claude?: boolean;
  all?: boolean;
  json?: boolean;
  writeLine?: (line: string) => void;
  errorLine?: (line: string) => void;
};

export async function runAddSkill(options: AddSkillOptions = {}): Promise<number> {
  const root = options.root ?? process.cwd();
  const writeLine = options.writeLine ?? console.log;
  const errorLine = options.errorLine ?? console.error;
  const agents = selectedAgents(options);

  if (agents.length === 0) {
    const error = commandError("MISSING_AGENT", "Choose at least one skill target: --codex, --claude, or --all.");
    if (options.json) {
      writeLine(JSON.stringify(errorEnvelope(error), null, 2));
    } else {
      errorLine(error.message);
    }
    return 1;
  }

  const result = await addJumpspaceSkills(root, agents);
  const changedFiles = result.files.filter((file) => file.action !== "unchanged");
  if (changedFiles.length > 0) {
    await recordMutation(root, {
      command: "add-skill",
      touched_files: changedFiles.map((file) => file.path),
      task_ids: [],
      index_changed: false,
    });
  }

  if (options.json) {
    writeLine(JSON.stringify(result, null, 2));
    return 0;
  }

  for (const file of result.files) {
    writeLine(`${file.action} ${file.path}`);
  }

  return 0;
}

function selectedAgents(options: Pick<AddSkillOptions, "codex" | "claude" | "all">): SkillAgent[] {
  if (options.all) {
    return [...SUPPORTED_SKILL_AGENTS];
  }

  const agents: SkillAgent[] = [];
  if (options.codex) {
    agents.push("codex");
  }
  if (options.claude) {
    agents.push("claude");
  }
  return agents;
}
