import {
  addJumpspaceSkills,
  resolveAgentSkillName,
  SUPPORTED_AGENT_SKILLS,
  SUPPORTED_SKILL_AGENTS,
  type AgentSkillName,
  type SkillAgent,
} from "../core/agentSkills.js";
import { commandError, errorEnvelope } from "../core/errors.js";
import { recordMutation } from "../core/mutations.js";

export type AddSkillOptions = {
  root?: string;
  skills?: string[];
  agent?: string;
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
  const skills = selectedSkills(options.skills ?? []);

  if (agents.length === 0) {
    const error = commandError(
      "MISSING_AGENT",
      "Choose at least one skill target: --codex, --claude, --agent <agent>, or --all.",
    );
    renderError(error, options.json, writeLine, errorLine);
    return 1;
  }

  if (agents.some((agent) => !isSkillAgent(agent))) {
    const unknown = agents.find((agent) => !isSkillAgent(agent));
    const error = commandError(
      "UNKNOWN_AGENT",
      `Unknown skill target "${unknown}". Supported agents: ${SUPPORTED_SKILL_AGENTS.join(", ")}.`,
    );
    renderError(error, options.json, writeLine, errorLine);
    return 1;
  }

  if (skills.some((skill) => skill === undefined)) {
    const unknown = (options.skills ?? []).find((skill) => resolveAgentSkillName(skill) === undefined);
    const error = commandError(
      "UNKNOWN_SKILL",
      `Unknown Jumpspace skill "${unknown}". Supported skills: ${SUPPORTED_AGENT_SKILLS.join(", ")}.`,
    );
    renderError(error, options.json, writeLine, errorLine);
    return 1;
  }

  const result = await addJumpspaceSkills(root, agents as SkillAgent[], {
    skills: skills as AgentSkillName[],
  });
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

function selectedAgents(options: Pick<AddSkillOptions, "agent" | "codex" | "claude" | "all">): string[] {
  if (options.all) {
    return [...SUPPORTED_SKILL_AGENTS];
  }

  const agents: string[] = [];
  if (options.agent) {
    agents.push(options.agent);
  }
  if (options.codex) {
    agents.push("codex");
  }
  if (options.claude) {
    agents.push("claude");
  }
  return agents;
}

function selectedSkills(values: string[]): Array<AgentSkillName | undefined> {
  return values.map(resolveAgentSkillName);
}

function isSkillAgent(value: string): value is SkillAgent {
  return SUPPORTED_SKILL_AGENTS.includes(value as SkillAgent);
}

function renderError(
  error: ReturnType<typeof commandError>,
  json: boolean | undefined,
  writeLine: (line: string) => void,
  errorLine: (line: string) => void,
): void {
  if (json) {
    writeLine(JSON.stringify(errorEnvelope(error), null, 2));
  } else {
    errorLine(error.message);
  }
}
