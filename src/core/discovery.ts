import fg from "fast-glob";

export const DISCOVERY_IGNORE_PATTERNS = [
  "node_modules/**",
  "dist/**",
  "build/**",
  ".git/**",
  ".next/**",
  "coverage/**",
  ".claude/worktrees/**",
];

export type DiscoveryCandidate = {
  pattern: string;
  reason: string;
  files: number;
  sample_paths: string[];
  recommended: boolean;
};

export type DiscoveryResult = {
  ok: true;
  recommended_docs: string[];
  profile_hints: string[];
  candidates: DiscoveryCandidate[];
  ignored_patterns: string[];
};

type CandidateRule = {
  pattern: string;
  reason: string;
  profileHints?: string[];
};

const candidateRules: CandidateRule[] = [
  {
    pattern: "README.md",
    reason: "Top-level README often contains setup, architecture, and workflow context.",
    profileHints: ["top-level-docs"],
  },
  {
    pattern: "PRODUCT.md",
    reason: "Top-level product docs often contain durable product intent.",
    profileHints: ["top-level-docs"],
  },
  {
    pattern: "docs/**/*.md",
    reason: "Standard documentation directory.",
    profileHints: ["docs"],
  },
  {
    pattern: "docs/**/*.mdx",
    reason: "Standard MDX documentation directory.",
    profileHints: ["docs"],
  },
  {
    pattern: "documentation/**/*.md",
    reason: "Common long-form documentation directory used by larger apps.",
    profileHints: ["docs-heavy"],
  },
  {
    pattern: "documentation/**/*.mdx",
    reason: "Common MDX documentation directory used by larger apps.",
    profileHints: ["docs-heavy"],
  },
  {
    pattern: "adr/**/*.md",
    reason: "Architecture decision record directory.",
    profileHints: ["adr"],
  },
  {
    pattern: "adrs/**/*.md",
    reason: "Architecture decision record directory.",
    profileHints: ["adr"],
  },
  {
    pattern: "architecture/**/*.md",
    reason: "Architecture documentation directory.",
    profileHints: ["architecture"],
  },
  {
    pattern: "apps/**/README.md",
    reason: "Monorepo app/package README files often describe service-specific behavior.",
    profileHints: ["monorepo"],
  },
  {
    pattern: "packages/**/README.md",
    reason: "Monorepo package README files often describe reusable modules.",
    profileHints: ["monorepo"],
  },
  {
    pattern: "infrastructure/**/*.md",
    reason: "Infrastructure docs and runbooks are important implementation memory.",
    profileHints: ["infra"],
  },
  {
    pattern: "skills/**/*.md",
    reason: "Repo-local agent skills contain agent-facing implementation workflow knowledge.",
    profileHints: ["agent-skills"],
  },
];

export async function discoverDocs(root: string): Promise<DiscoveryResult> {
  const candidates: DiscoveryCandidate[] = [];
  const profileHints = new Set<string>();

  for (const rule of candidateRules) {
    const matches = await fg(rule.pattern, {
      cwd: root,
      onlyFiles: true,
      unique: true,
      dot: false,
      ignore: DISCOVERY_IGNORE_PATTERNS,
    });
    const sorted = matches.sort();
    const recommended = sorted.length > 0;

    if (recommended) {
      for (const hint of rule.profileHints ?? []) {
        profileHints.add(hint);
      }
    }

    candidates.push({
      pattern: rule.pattern,
      reason: rule.reason,
      files: sorted.length,
      sample_paths: sorted.slice(0, 5),
      recommended,
    });
  }

  const recommendedDocs = candidates.filter((candidate) => candidate.recommended).map((candidate) => candidate.pattern);

  return {
    ok: true,
    recommended_docs: recommendedDocs.length > 0 ? recommendedDocs : ["docs/**/*.md"],
    profile_hints: [...profileHints].sort(),
    candidates,
    ignored_patterns: DISCOVERY_IGNORE_PATTERNS,
  };
}
