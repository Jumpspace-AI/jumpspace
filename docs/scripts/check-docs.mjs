import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootUrl = new URL('../', import.meta.url);

const requiredFiles = [
  'package.json',
  'package-lock.json',
  'netlify.toml',
  'astro.config.mjs',
  'tsconfig.json',
  'src/content/config.ts',
  'public/llms.txt',
  'public/llms-full.txt',
  'src/content/docs/index.md',
  'src/content/docs/start-here/welcome.md',
  'src/content/docs/start-here/quickstart.md',
  'src/content/docs/start-here/existing-repo-bootstrap.md',
  'src/content/docs/start-here/agent-setup.md',
  'src/content/docs/start-here/why-jumpspace.md',
  'src/content/docs/start-here/faq.md',
  'src/content/docs/workflows/add-jumpspace-to-a-repo.md',
  'src/content/docs/workflows/bootstrap-existing-docs.md',
  'src/content/docs/workflows/canonical-demo.md',
  'src/content/docs/workflows/ask-questions-with-evidence.md',
  'src/content/docs/workflows/start-agent-work.md',
  'src/content/docs/workflows/verify-work.md',
  'src/content/docs/workflows/review-pr-drift.md',
  'src/content/docs/workflows/handoff-between-agents.md',
  'src/content/docs/agent-skills/overview.md',
  'src/content/docs/agent-skills/claude-code.md',
  'src/content/docs/agent-skills/codex.md',
  'src/content/docs/agent-skills/cursor.md',
  'src/content/docs/agent-skills/github-copilot.md',
  'src/content/docs/agent-skills/opencode.md',
  'src/content/docs/agent-skills/manual-install.md',
  'src/content/docs/agent-skills/skill-authoring.md',
  'src/content/docs/core-concepts/intents.md',
  'src/content/docs/core-concepts/scopes-and-lookup.md',
  'src/content/docs/core-concepts/rejected-alternatives.md',
  'src/content/docs/core-concepts/task-blocks.md',
  'src/content/docs/core-concepts/source-backed-memory.md',
  'src/content/docs/core-concepts/plans.md',
  'src/content/docs/core-concepts/acceptance-criteria.md',
  'src/content/docs/core-concepts/verification-records.md',
  'src/content/docs/core-concepts/dependencies-and-refs.md',
  'src/content/docs/core-concepts/drift-and-repair.md',
  'src/content/docs/core-concepts/semantic-retrieval.md',
  'src/content/docs/reference/cli.md',
  'src/content/docs/reference/json-schemas.md',
  'src/content/docs/reference/config.md',
  'src/content/docs/reference/status-lifecycle.md',
  'src/content/docs/reference/error-envelopes.md',
  'src/content/docs/reference/ci.md',
  'src/content/docs/reference/sdks.md',
  'src/content/docs/jumpspace-cloud.md',
  'src/content/docs/contribute/development-setup.md',
  'src/content/docs/contribute/adding-commands.md',
  'src/content/docs/contribute/adding-schemas.md',
  'src/content/docs/contribute/adding-skills.md',
  'src/content/docs/contribute/future-improvements.md',
  'src/content/docs/contribute/release-checklist.md'
];

const contentChecks = [
  ['src/content/docs/index.md', ['repo-local intent memory', 'add-skill --all', 'intent check --for', 'alpha software', '@jumpspace/cli']],
  ['src/content/docs/start-here/quickstart.md', ['init --auto', 'bootstrap propose', 'add-skill --all', 'alpha software', '@jumpspace/cli']],
  ['src/content/docs/core-concepts/intents.md', ['code alone cannot explain', 'Alternatives rejected', 'intent validate --json']],
  ['src/content/docs/core-concepts/scopes-and-lookup.md', ['intent check --for', 'micromatch', 'YAML array']],
  ['src/content/docs/core-concepts/rejected-alternatives.md', ['highest-value part', 'intent validate', 'Alternatives rejected']],
  ['src/content/docs/start-here/why-jumpspace.md', ['repo-local intent memory', 'Git remembers what changed', 'Why Not Just Vector Search?', 'Why Agents Like It']],
  ['src/content/docs/start-here/faq.md', ['Merge Conflicts', 'Vector Search', 'evidence summary']],
  ['src/content/docs/workflows/bootstrap-existing-docs.md', ['bootstrap context', 'bootstrap validate', 'dry-run']],
  ['src/content/docs/workflows/canonical-demo.md', ['bootstrap propose', '@jumpspace/cli task work', '@jumpspace/cli task verify', 'handoff']],
  ['src/content/docs/workflows/ask-questions-with-evidence.md', ['evidence summary', '--mode any', 'semantic build']],
  ['src/content/docs/workflows/start-agent-work.md', ['work DOC-PROJECT-001', 'next executable steps', 'handoff']],
  ['src/content/docs/workflows/verify-work.md', ['`verified` is protected', '@jumpspace/cli task verify', 'exit codes']],
  ['src/content/docs/workflows/review-pr-drift.md', ['changed --since main', 'drift --since main', 'pr comment']],
  ['src/content/docs/agent-skills/overview.md', ['--codex', '--claude', 'jumpspace-work --agent claude']],
  ['src/content/docs/agent-skills/cursor.md', ['does not ship a dedicated Cursor installer']],
  ['src/content/docs/reference/cli.md', ['bootstrap discover', 'schema coverage', 'release install-doctor']],
  ['src/content/docs/reference/json-schemas.md', ['ok": false', 'schema show task.work', 'alpha software']],
  ['src/content/docs/reference/sdks.md', ['contract helpers', 'alpha software', '@jumpspace/cli/sdk']],
  ['src/content/docs/jumpspace-cloud.md', ['early design partners', 'hi@jumpspace.ai']],
  ['src/content/docs/contribute/release-checklist.md', ['semver', '@jumpspace/cli', 'NPM_TOKEN', '--follow-tags']],
  ['src/content/docs/contribute/future-improvements.md', ['not current commands', '@jumpspace/cli demo', '@jumpspace/cli onboard', 'Broader Skill Ecosystem']],
  ['public/llms.txt', ['Jumpspace Docs For Agents', 'Trust rule']]
];

const bannedExampleTerms = [
  'KOD',
  'DOC-MON',
  'portfolio-monitoring',
  'portfolio monitoring',
  'Metric approval',
  'ApprovalPanel',
  'approval-flow',
  'Analysts'
];

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(file))) {
    errors.push(`Missing required docs file: ${file}`);
  }
}

for (const [file, terms] of contentChecks) {
  const path = resolve(file);
  if (!existsSync(path)) {
    continue;
  }
  const content = readFileSync(path, 'utf8');
  for (const term of terms) {
    if (!content.includes(term)) {
      errors.push(`Expected ${file} to include "${term}".`);
    }
  }
}

for (const file of requiredFiles.filter((candidate) => candidate.startsWith('src/content/docs/'))) {
  const path = resolve(file);
  const content = readFileSync(path, 'utf8');
  for (const term of bannedExampleTerms) {
    if (content.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`Expected ${file} to avoid product-specific example term "${term}".`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log(`Docs structure check passed (${requiredFiles.length} files).`);

function resolve(path) {
  return fileURLToPath(new URL(path, rootUrl));
}
