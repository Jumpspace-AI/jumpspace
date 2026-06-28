---
title: Deploy On Netlify
description: Host the Jumpspace docs module as an Astro Starlight static site on Netlify.
---

This documentation site is a separate module rooted at `docs/`.

## Local Development

```bash
cd docs
npm install
npm run dev
```

Build locally:

```bash
cd docs
npm run build
npm run preview
```

## Netlify Project Settings

Create a Netlify site from the repository and set `docs` as the base directory.

Recommended settings:

| Setting | Value |
| --- | --- |
| Base directory | `docs` |
| Package directory | `docs` |
| Build command | `npm run build` |
| Publish directory | `docs/dist` |
| Node version | `20` |

The module includes `docs/netlify.toml` with the build command, publish directory, Node version, and static-site security headers. If Netlify uses `docs` as the base directory, the `publish = "dist"` value in that file resolves to `docs/dist`.

## Domain

The docs module sets Astro's `site` option from environment variables:

```bash
DOCS_SITE_URL=https://docs.example.com npm run build
```

On Netlify, set `DOCS_SITE_URL` to the canonical docs domain after the production site is assigned. If that variable is not set, the config falls back to Netlify's `URL` build environment variable and then to `https://jumpspace.netlify.app` for local builds.

This keeps sitemap and canonical URL generation enabled during local verification while still letting the hosted production URL be controlled by Netlify settings.

## Jumpspace Scan Glob

This repo keeps source task specs under `docs/specs/` and the website under `docs/src/content/docs/`. The root `.jumpspace/config.json` scans `docs/specs/**/*.md` so tutorial examples in the docs site do not become live task blocks.

If you use a different layout, set the docs glob intentionally:

```json
{
  "docs": ["docs/specs/**/*.md"]
}
```

## Verify Before Deploy

```bash
npm run build
npx jumpspace scan
npx jumpspace audit --json
```

For this repo, run the docs build from the docs module:

```bash
npm --prefix docs run build
```
