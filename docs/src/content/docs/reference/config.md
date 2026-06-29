---
title: Config
description: Repo-local configuration for docs globs and generated state.
---

Jumpspace config lives under `.jumpspace/`.

Initialize it with:

```bash
npx jumpspace init --auto
```

`--auto` detects common docs directories. Plain `init` uses conservative
defaults.

After changing config, run:

```bash
npx jumpspace scan
npx jumpspace doctor
```

Generated indexes are local implementation state. Decide as a team which
generated files belong in source control.
