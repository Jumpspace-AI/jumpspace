import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const site = process.env.DOCS_SITE_URL ?? process.env.URL ?? 'https://docs.jumpspace.ai';

export default defineConfig({
  site,
  output: 'static',
  integrations: [
    starlight({
      title: 'Jumpspace',
      description: 'Repo-local intent memory for AI coding agents.',
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { slug: 'start-here/welcome' },
            { slug: 'start-here/quickstart' },
            { slug: 'start-here/existing-repo-bootstrap' },
            { slug: 'start-here/agent-setup' },
            { slug: 'start-here/why-jumpspace' },
            { slug: 'start-here/faq' }
          ]
        },
        {
          label: 'Workflows',
          items: [
            { slug: 'workflows/add-jumpspace-to-a-repo' },
            { slug: 'workflows/bootstrap-existing-docs' },
            { slug: 'workflows/canonical-demo' },
            { slug: 'workflows/ask-questions-with-evidence' },
            { slug: 'workflows/start-agent-work' },
            { slug: 'workflows/verify-work' },
            { slug: 'workflows/review-pr-drift' },
            { slug: 'workflows/handoff-between-agents' }
          ]
        },
        {
          label: 'Agent Skills',
          items: [
            { slug: 'agent-skills/overview' },
            { slug: 'agent-skills/claude-code' },
            { slug: 'agent-skills/codex' },
            { slug: 'agent-skills/cursor' },
            { slug: 'agent-skills/github-copilot' },
            { slug: 'agent-skills/opencode' },
            { slug: 'agent-skills/manual-install' },
            { slug: 'agent-skills/skill-authoring' }
          ]
        },
        {
          label: 'Core Concepts',
          items: [
            { slug: 'core-concepts/source-backed-memory' },
            { slug: 'core-concepts/intents' },
            { slug: 'core-concepts/scopes-and-lookup' },
            { slug: 'core-concepts/rejected-alternatives' },
            { slug: 'core-concepts/json-contracts' }
          ]
        },
        {
          label: 'Advanced Task Graph',
          items: [
            { slug: 'advanced/bootstrap' },
            { slug: 'advanced/planning-and-verification' },
            { slug: 'advanced/drift-ci-and-repair' },
            { slug: 'advanced/retrieval-and-graph-queries' },
            { slug: 'advanced/agent-skills' },
            { slug: 'core-concepts/tasks-and-graph' },
            { slug: 'core-concepts/task-blocks' },
            { slug: 'core-concepts/plans' },
            { slug: 'core-concepts/acceptance-criteria' },
            { slug: 'core-concepts/verification-records' },
            { slug: 'core-concepts/dependencies-and-refs' },
            { slug: 'core-concepts/drift-and-repair' },
            { slug: 'core-concepts/semantic-retrieval' }
          ]
        },
        {
          label: 'Reference',
          items: [
            { slug: 'reference/cli' },
            { slug: 'reference/json-schemas' },
            { slug: 'reference/config' },
            { slug: 'reference/status-lifecycle' },
            { slug: 'reference/error-envelopes' },
            { slug: 'reference/ci' },
            { slug: 'reference/sdks' }
          ]
        },
        {
          label: 'Jumpspace Cloud',
          items: [
            { slug: 'jumpspace-cloud' }
          ]
        },
        {
          label: 'Contribute',
          items: [
            { slug: 'contribute/development-setup' },
            { slug: 'contribute/adding-commands' },
            { slug: 'contribute/adding-schemas' },
            { slug: 'contribute/adding-skills' },
            { slug: 'contribute/future-improvements' },
            { slug: 'contribute/release-checklist' }
          ]
        }
      ]
    })
  ]
});
