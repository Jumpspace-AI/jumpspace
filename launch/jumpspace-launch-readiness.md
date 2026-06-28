# Jumpspace OSS Launch Readiness

This tracker replaces the generic document-ticket launch checklist with Jumpspace-specific launch work.

## Status Summary

| Area | Status | Evidence | Remaining Work |
| --- | --- | --- | --- |
| CLI integration tests | Done | `npm test` passed after CLI helper timeout fix. | Keep full suite green in CI. |
| Package metadata | Done | `jumpspace release doctor --json` reports local readiness and pack dry-run includes required files. | Review package wording before publish. |
| OSS files | Done | README, LICENSE, CHANGELOG, CONTRIBUTING, SECURITY, SUPPORT, Code of Conduct. | Review wording before public announcement. |
| GitHub templates | Done | PR template, bug template, feature template, Dependabot config. | Enable issue labels and private security advisories in GitHub UI. |
| GitHub workflows | Done locally | CI workflow and Jumpspace PR assistant workflow exist; unauthenticated GitHub API returned 404 for `christopherrote/jumpspace`. | Push/connect the hosted repo and verify green GitHub Actions runs. |
| Docs site | Done locally | Starlight module builds and Netlify config exists; `https://jumpspace.netlify.app` returned 200 but `/deploy/netlify/` returned 404. | Deploy the current docs build on Netlify and confirm the final URL. |
| Roadmap | In progress | `docs/specs/jumpspace-v0.md` tracks Jumpspace tasks through JS-050. | Keep launch blockers as explicit gaps until external checks pass. |
| npm release | External | Local pack dry-run passes; direct registry check for `https://registry.npmjs.org/jumpspace` returned 404 on 2026-06-28, so the name appeared unclaimed at check time. | Publish with npm credentials and smoke test public install. |
| GitHub release | External | Release notes draft can be based on CHANGELOG. | Create tag, GitHub release, and verify branch protection. |

## Go/No-Go Criteria

| ID | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| LG-1 | Full local tests pass. | Done | `npm test` |
| LG-2 | Package builds and packs intentionally. | Done | `npm run build`, `npm pack --dry-run --json` |
| LG-3 | JSON schemas are published and synchronized. | Done | `node dist/cli.js schema coverage --json` |
| LG-4 | Docs build locally. | Done | `npm --prefix docs test`, `npm --prefix docs run build` |
| LG-5 | GitHub CI passes on PR and main. | External | Requires pushed branch and GitHub Actions run. |
| LG-6 | Netlify docs are deployed and reachable. | External | Root URL returned 200, but `/deploy/netlify/` returned 404, so the current docs build is not verified as deployed. |
| LG-7 | npm package name and version are available. | Done | `curl https://registry.npmjs.org/jumpspace` returned HTTP 404 on 2026-06-28; re-check immediately before publish. |
| LG-8 | Public install smoke test passes. | External | Requires published package. |
| LG-9 | Branch protection and release tag are configured. | External | Requires GitHub repository admin access. |

## External Release Commands

Run these when the repo is pushed to GitHub and network access is available:

```bash
node dist/cli.js release doctor --check-registry --json
npm pack --dry-run --json
npm publish --access public
npm install -g jumpspace
jumpspace release install-doctor --json
```

Run these against GitHub:

```bash
gh workflow run CI
gh run list --workflow CI
gh release create v0.1.0 --title "Jumpspace v0.1.0" --notes-file CHANGELOG.md
```
