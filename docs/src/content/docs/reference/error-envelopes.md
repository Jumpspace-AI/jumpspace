---
title: Error Envelopes
description: The standard JSON failure shape used by Jumpspace commands.
---

JSON commands return structured failures:

```json
{
  "ok": false,
  "errors": [
    {
      "code": "TASK_NOT_FOUND",
      "message": "Task DOC-PROJECT-001 was not found.",
      "taskId": "DOC-PROJECT-001"
    }
  ]
}
```

Fields may include:

- `code`
- `message`
- `taskId`
- `path`
- `stepId`

Agents should branch on `code` and show `message` to humans.
