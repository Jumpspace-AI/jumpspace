---
title: Release Checklist
description: Local checks to run before publishing or cutting a release.
---

## Alpha Compatibility

Jumpspace is alpha software until a stable 1.0 release. Release notes should
call out CLI, JSON schema, task metadata, SDK, and generated agent-guidance
changes that may affect existing users.

## Versioning And Publish

Jumpspace uses semver. The npm package is `@jumpspace/cli`, but the installed
command remains `jumpspace`.

Cut a version with one of the release scripts:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

Each script delegates to `npm version`, which updates `package.json` and
`package-lock.json`, creates a version commit, and creates a matching git tag
such as `v0.1.1`. Push the commit and tag:

```bash
git push origin main --follow-tags
```

The `Publish` GitHub Actions workflow runs on semver tags, verifies the tag
matches `package.json`, and publishes `@jumpspace/cli` to npm with public
access. The workflow requires the `NPM_TOKEN` repository secret.

Run local checks:

```bash
npm test
npm run build
node dist/cli.js release doctor --json
node dist/cli.js release install-doctor --json
node dist/cli.js audit --json
npm pack --dry-run --json
```

When network and credentials are available:

```bash
node dist/cli.js release doctor --check-registry --json
npm publish --dry-run --access public
```

Verify:

- package metadata is current
- package name is `@jumpspace/cli`
- package bin exposes the `jumpspace` command
- `dist/cli.js` is executable
- `LICENSE`, `NOTICE`, and `TRADEMARKS.md` are included
- schemas and SDKs are packaged
- docs build passes
- CI is green
