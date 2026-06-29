---
title: Development Setup
description: Build, test, and run the Jumpspace CLI locally.
---

Install dependencies:

```bash
npm install
npm --prefix docs install
```

Build the CLI:

```bash
npm run build
```

Run tests:

```bash
npm test
npm --prefix docs test
```

Run the docs site:

```bash
npm --prefix docs run dev
```

Use the repo against itself:

```bash
node dist/cli.js scan
node dist/cli.js audit --json
node dist/cli.js doctor --json
```
