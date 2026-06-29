import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { addJumpspaceSkills, SUPPORTED_AGENT_SKILLS } from "./agentSkills.js";

describe("addJumpspaceSkills", () => {
  it("installs Codex guidance and a repo-local skill idempotently", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-skill-"));
    await fs.writeFile(path.join(root, "AGENTS.md"), "custom codex notes\n");

    const first = await addJumpspaceSkills(root, ["codex"]);
    const second = await addJumpspaceSkills(root, ["codex"]);

    expect(first.skills).toEqual(SUPPORTED_AGENT_SKILLS);
    expect(first.files).toHaveLength(1 + SUPPORTED_AGENT_SKILLS.length);
    expect(first.files).toEqual([
      expect.objectContaining({ agent: "codex", path: "AGENTS.md", action: "updated" }),
      ...SUPPORTED_AGENT_SKILLS.map((skillName) =>
        expect.objectContaining({
          agent: "codex",
          skill: skillName,
          path: `.codex/skills/${skillName}/SKILL.md`,
          action: "created",
        }),
      ),
    ]);
    expect(second.files).toHaveLength(1 + SUPPORTED_AGENT_SKILLS.length);
    expect(second.files.every((file) => file.action === "unchanged")).toBe(true);

    const agents = await fs.readFile(path.join(root, "AGENTS.md"), "utf8");
    const skill = await fs.readFile(path.join(root, ".codex/skills/jumpspace-workflow/SKILL.md"), "utf8");
    const workSkill = await fs.readFile(path.join(root, ".codex/skills/jumpspace-work/SKILL.md"), "utf8");

    expect(agents).toContain("custom codex notes");
    expect(agents).toContain("Jumpspace workflow for Codex");
    expect(agents).toContain("@.codex/skills/jumpspace-workflow/SKILL.md");
    expect(agents).toContain("@.codex/skills/jumpspace-bootstrap/SKILL.md");
    expect(agents).toContain("@.codex/skills/jumpspace-work/SKILL.md");
    expect(agents).toContain("@.codex/skills/jumpspace-review/SKILL.md");
    expect(agents).toContain("@.codex/skills/jumpspace-handoff/SKILL.md");
    expect(agents).toContain("Use Jumpspace by default");
    expect(agents).toContain('should not have to say "use Jumpspace"');
    expect(agents.match(/BEGIN JUMPSPACE MANAGED: codex/g)).toHaveLength(1);
    expect(skill).toContain("name: jumpspace-workflow");
    expect(skill).toContain("Use this skill by default in Codex");
    expect(skill).toContain("jumpspace bootstrap context");
    expect(skill).toContain("jumpspace pr comment --since <ref>");
    expect(skill).toContain("jumpspace init --ci github --dry-run --json");
    expect(skill).toContain("MUTATION_LOCK_TIMEOUT");
    expect(skill).toContain("plan.save");
    expect(skill).toContain("step.complete");
    expect(skill).toContain("evidence.identifier_terms");
    expect(skill).toContain("evidence.phrase_matches");
    expect(skill).toContain("jumpspace link eval --json");
    expect(skill).toContain("jumpspace link eval --file <fixture.json> --json");
    expect(skill).toContain("rejected_candidates");
    expect(skill).toContain("NO_SOURCE_EVIDENCE");
    expect(skill).toContain("rejected_candidate_matches");
    expect(skill).toContain("ranked per heading");
    expect(skill).toContain("--compact");
    expect(skill).toContain("mutation_history");
    expect(skill).toContain("jumpspace history --task <id> --json");
    expect(skill).toContain("jumpspace handoff --task <id> --json");
    expect(skill).toContain("handoff packet status");
    expect(skill).toContain("jumpspace schema show handoff --json");
    expect(skill).toContain("jumpspace schema coverage --json");
    expect(skill).toContain("jumpspace release doctor --json");
    expect(skill).toContain("jumpspace release install-doctor --json");
    expect(skill).toContain("--check-registry");
    expect(skill.match(/BEGIN JUMPSPACE MANAGED: codex-skill/g)).toHaveLength(1);
    expect(workSkill).toContain("name: jumpspace-work");
    expect(workSkill).toContain("jumpspace work <id> --json");
    expect(workSkill).toContain("jumpspace verify <id>");
    expect(workSkill.match(/BEGIN JUMPSPACE MANAGED: codex-jumpspace-work-skill/g)).toHaveLength(1);
  });

  it("installs Claude guidance and preserves existing Claude content", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-skill-"));
    await fs.writeFile(path.join(root, "CLAUDE.md"), "custom claude notes\n");

    await addJumpspaceSkills(root, ["claude"]);

    const claude = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    const skill = await fs.readFile(path.join(root, ".claude/skills/jumpspace-workflow/SKILL.md"), "utf8");
    const handoffSkill = await fs.readFile(path.join(root, ".claude/skills/jumpspace-handoff/SKILL.md"), "utf8");

    expect(claude).toContain("custom claude notes");
    expect(claude).toContain("Jumpspace workflow for Claude");
    expect(claude).toContain("@.claude/skills/jumpspace-workflow/SKILL.md");
    expect(claude).toContain("@.claude/skills/jumpspace-handoff/SKILL.md");
    expect(claude).toContain("Use Jumpspace by default");
    expect(claude).toContain('should not have to say "use Jumpspace"');
    expect(claude.match(/BEGIN JUMPSPACE MANAGED: claude/g)).toHaveLength(1);
    expect(skill).toContain("name: jumpspace-workflow");
    expect(skill).toContain("Use this skill by default in Claude");
    expect(skill).toContain("jumpspace pr comment --since <ref>");
    expect(skill).toContain("jumpspace init --ci github --dry-run --json");
    expect(skill).toContain(".jumpspace/locks/mutation.lock");
    expect(skill).toContain("verify");
    expect(skill).toContain("changed-file status is candidate context");
    expect(skill).toContain("evidence.basename_terms");
    expect(skill).toContain("evidence.phrase_matches");
    expect(skill).toContain("jumpspace link eval --json");
    expect(skill).toContain("jumpspace link eval --file <fixture.json> --json");
    expect(skill).toContain("rejected_candidates");
    expect(skill).toContain("NO_SOURCE_EVIDENCE");
    expect(skill).toContain("rejected_candidate_matches");
    expect(skill).toContain("ranked per heading");
    expect(skill).toContain("--compact");
    expect(skill).toContain("mutation_history");
    expect(skill).toContain("jumpspace history --task <id> --json");
    expect(skill).toContain("jumpspace handoff --task <id> --json");
    expect(skill).toContain("handoff packet status");
    expect(skill).toContain("jumpspace schema show handoff --json");
    expect(skill).toContain("jumpspace schema coverage --json");
    expect(skill).toContain("jumpspace release doctor --json");
    expect(skill).toContain("jumpspace release install-doctor --json");
    expect(skill).toContain("--check-registry");
    expect(skill.match(/BEGIN JUMPSPACE MANAGED: claude-skill/g)).toHaveLength(1);
    expect(handoffSkill).toContain("name: jumpspace-handoff");
    expect(handoffSkill).toContain("jumpspace handoff --task <id> --json");
    expect(handoffSkill.match(/BEGIN JUMPSPACE MANAGED: claude-jumpspace-handoff-skill/g)).toHaveLength(1);
  });

  it("appends to an existing skill file without prepending frontmatter", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-skill-"));
    const skillPath = path.join(root, ".claude/skills/jumpspace-workflow/SKILL.md");
    await fs.mkdir(path.dirname(skillPath), { recursive: true });
    await fs.writeFile(skillPath, "# Existing skill notes\n");

    await addJumpspaceSkills(root, ["claude"]);

    const skill = await fs.readFile(skillPath, "utf8");
    expect(skill.startsWith("# Existing skill notes\n")).toBe(true);
    expect(skill).not.toContain("name: jumpspace-workflow");
    expect(skill).toContain("# Existing skill notes");
    expect(skill).toContain("Jumpspace workflow");
  });

  it("installs selected pipeline skills with the reference workflow", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "jumpspace-skill-"));

    const result = await addJumpspaceSkills(root, ["claude"], {
      skills: ["jumpspace-work"],
    });

    expect(result.skills).toEqual(["jumpspace-workflow", "jumpspace-work"]);
    expect(result.files).toEqual([
      expect.objectContaining({ agent: "claude", path: "CLAUDE.md", action: "created" }),
      expect.objectContaining({
        agent: "claude",
        skill: "jumpspace-workflow",
        path: ".claude/skills/jumpspace-workflow/SKILL.md",
        action: "created",
      }),
      expect.objectContaining({
        agent: "claude",
        skill: "jumpspace-work",
        path: ".claude/skills/jumpspace-work/SKILL.md",
        action: "created",
      }),
    ]);

    const claude = await fs.readFile(path.join(root, "CLAUDE.md"), "utf8");
    await expect(fs.readFile(path.join(root, ".claude/skills/jumpspace-review/SKILL.md"), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });

    expect(claude).toContain("@.claude/skills/jumpspace-workflow/SKILL.md");
    expect(claude).toContain("@.claude/skills/jumpspace-work/SKILL.md");
    expect(claude).not.toContain("@.claude/skills/jumpspace-review/SKILL.md");
  });
});
