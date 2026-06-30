---
title: Rejected Alternatives
description: Why durable intent should record the paths the team deliberately did not take.
---

Rejected alternatives are often the highest-value part of an intent.

Code can show what exists. It usually cannot show which tempting path the team
already considered and rejected. Without that memory, a coding agent may
re-propose the same design in a later session.

## Good Rejected Alternatives

A useful rejected alternative names the option and the reason it does not fit:

```md
## Alternatives rejected
- **Runtime feature flags.** They add a second state dimension before launch.
- **Environment-variable gates.** They require redeploys and create cleanup debt.
```

Weak alternatives are vague:

```md
## Alternatives rejected
- **Other approaches.** Too complicated.
```

## Validation

`intent validate` warns when an active intent has no rejected alternatives.

```bash
npx @jumpspace/cli intent validate --json
```

That warning is a design prompt, not paperwork. If there truly was no rejected
alternative, keep the intent small and make the decision text explain why it is
worth preserving.
