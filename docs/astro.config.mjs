import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const site = process.env.DOCS_SITE_URL ?? process.env.URL ?? 'https://docs.jumpspace.ai';

export default defineConfig({
  site,
  output: 'static',
  integrations: [
    starlight({
      title: 'Jumpspace',
      description: 'Repo-local implementation memory for AI coding agents.',
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { slug: 'getting-started' },
            { slug: 'getting-started/why-jumpspace' },
            { slug: 'getting-started/new-repo' },
            { slug: 'getting-started/task-blocks' },
            { slug: 'getting-started/first-agent-workflow' }
          ]
        },
        {
          label: 'Using With Agents',
          items: [
            { slug: 'agents/using-with-agents' },
            { slug: 'advanced/agent-skills' }
          ]
        },
        {
          label: 'Core Concepts',
          items: [
            { slug: 'core-concepts/tasks-and-graph' },
            { slug: 'core-concepts/json-contracts' }
          ]
        },
        {
          label: 'Advanced Workflows',
          items: [
            { slug: 'advanced/bootstrap' },
            { slug: 'advanced/planning-and-verification' },
            { slug: 'advanced/retrieval-and-graph-queries' },
            { slug: 'advanced/drift-ci-and-repair' }
          ]
        },
        {
          label: 'Reference',
          items: [
            { slug: 'reference/cli' },
            { slug: 'deploy/netlify' }
          ]
        }
      ]
    })
  ]
});
