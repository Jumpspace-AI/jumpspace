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
  'src/content/docs/index.md',
  'src/content/docs/getting-started/index.md',
  'src/content/docs/getting-started/why-jumpspace.md',
  'src/content/docs/getting-started/new-repo.md',
  'src/content/docs/getting-started/task-blocks.md',
  'src/content/docs/getting-started/first-agent-workflow.md',
  'src/content/docs/agents/using-with-agents.md',
  'src/content/docs/core-concepts/tasks-and-graph.md',
  'src/content/docs/core-concepts/json-contracts.md',
  'src/content/docs/advanced/bootstrap.md',
  'src/content/docs/advanced/planning-and-verification.md',
  'src/content/docs/advanced/retrieval-and-graph-queries.md',
  'src/content/docs/advanced/drift-ci-and-repair.md',
  'src/content/docs/advanced/agent-skills.md',
  'src/content/docs/reference/cli.md',
  'src/content/docs/deploy/netlify.md'
];

const contentChecks = [
  ['src/content/docs/index.md', ['npx jumpspace scan', 'npx jumpspace work']],
  ['src/content/docs/getting-started/index.md', ['init --auto', 'add-skill', 'ask']],
  ['src/content/docs/getting-started/why-jumpspace.md', ['source-controlled graph', 'linked code and tests', 'portable repo state', 'feature intent', 'honest fallback']],
  ['src/content/docs/getting-started/new-repo.md', ['bootstrap discover', 'bootstrap propose', 'ask your agent']],
  ['src/content/docs/getting-started/task-blocks.md', ['acceptance_criteria', 'jumpspace verify']],
  ['src/content/docs/getting-started/first-agent-workflow.md', ['plan save', 'step complete', 'verify']],
  ['src/content/docs/agents/using-with-agents.md', ['Codex', 'Claude Code', 'plain-English']],
  ['src/content/docs/advanced/bootstrap.md', ['bootstrap discover', 'bootstrap context', 'bootstrap apply']],
  ['src/content/docs/advanced/planning-and-verification.md', ['plan validate', 'next', 'verified']],
  ['src/content/docs/advanced/retrieval-and-graph-queries.md', ['semantic build', 'query', 'link suggest']],
  ['src/content/docs/advanced/drift-ci-and-repair.md', ['changed --since', 'drift --since', 'repair --since']],
  ['src/content/docs/advanced/agent-skills.md', ['add-skill --codex', 'add-skill --claude', 'release install-doctor']],
  ['src/content/docs/core-concepts/json-contracts.md', ['schema list', 'jumpspace/sdk', 'jumpspace_sdk']],
  ['src/content/docs/deploy/netlify.md', ['Netlify Project Settings', 'Base directory', 'Publish directory']]
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
