## Summary

<!-- What changed and why? -->

## Jumpspace

- Task ID(s):
- Commands used for orientation:
  - `node dist/cli.js scan`
  - `node dist/cli.js find "<topic>" --mode any --json --compact`
  - `node dist/cli.js context <task-id> --json`

## Verification

<!-- List checks actually run. Do not mark a check if it was not run. -->

- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm --prefix docs test`
- [ ] `npm --prefix docs run build`
- [ ] `node dist/cli.js audit --json`
- [ ] `node dist/cli.js doctor --json`
- [ ] `node dist/cli.js release doctor --json`

## Notes

<!-- Known limitations, follow-ups, or external checks still needed. -->
