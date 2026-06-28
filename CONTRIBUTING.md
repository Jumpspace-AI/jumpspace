# Contributing

Thanks for helping make Jumpspace better.

## Local Setup

```bash
npm install
npm run build
npm test
```

For the documentation site:

```bash
npm --prefix docs install
npm --prefix docs test
npm --prefix docs run build
```

## Development Workflow

1. Use Jumpspace first when working in this repo:

   ```bash
   node dist/cli.js scan
   node dist/cli.js find "<topic>" --mode any --json --compact
   node dist/cli.js context <task-id> --json
   ```

2. Keep task intent in source-controlled docs. If a change affects code, tests, docs, or agent behavior, update the relevant `<!-- jumpspace -->` block.

3. Run focused tests while iterating, then run the full suite before asking for review:

   ```bash
   npm test
   npm run build
   node dist/cli.js audit --json
   node dist/cli.js doctor --json
   ```

## Pull Requests

Before opening a PR:

- Include a short explanation of user-visible behavior.
- Link the Jumpspace task ID when one exists.
- Note tests and checks that actually ran.
- Call out known limitations instead of hiding them.

## JSON Contracts

Agent-facing JSON output must have a schema. When adding or changing command output:

```bash
npm run generate:schemas
node dist/cli.js schema coverage --json
```

Keep generated schema artifacts and SDK contract names in sync.
