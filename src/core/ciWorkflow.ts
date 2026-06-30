import fs from "node:fs/promises";
import { atomicWriteFile } from "./atomicWrite.js";
import { pathExists, resolveRepoPath } from "./config.js";

export type CiWorkflowProvider = "github";

export type CiWorkflowFileAction = "created" | "updated" | "unchanged";

export type CiWorkflowFile = {
  provider: CiWorkflowProvider;
  path: string;
  action: CiWorkflowFileAction;
  changed: boolean;
  managed: boolean;
  reason: "missing" | "managed_block" | "legacy_jumpspace_template" | "already_current" | "user_owned";
};

export type CiWorkflowWarning = {
  code: string;
  message: string;
  path?: string;
};

export type InstallCiWorkflowResult = {
  ok: true;
  provider: CiWorkflowProvider;
  dry_run: boolean;
  files: CiWorkflowFile[];
  warnings: CiWorkflowWarning[];
};

export const GITHUB_CI_WORKFLOW_PATH = ".github/workflows/jumpspace.yml";
export const GITHUB_CI_WORKFLOW_BLOCK = "github-ci";

const startMarker = `# BEGIN JUMPSPACE MANAGED: ${GITHUB_CI_WORKFLOW_BLOCK}`;
const endMarker = `# END JUMPSPACE MANAGED: ${GITHUB_CI_WORKFLOW_BLOCK}`;

export async function installCiWorkflow(
  root: string,
  options: { provider: CiWorkflowProvider; dryRun?: boolean },
): Promise<InstallCiWorkflowResult> {
  const dryRun = Boolean(options.dryRun);
  const path = workflowPath(options.provider);
  const absolutePath = resolveRepoPath(root, path);
  const exists = await pathExists(absolutePath);
  const existing = exists ? await fs.readFile(absolutePath, "utf8") : undefined;
  const next = githubWorkflowTemplate();
  const warnings: CiWorkflowWarning[] = [];
  const file = workflowFileState(options.provider, path, existing, next);

  if (file.reason === "user_owned") {
    warnings.push({
      code: "USER_WORKFLOW_EXISTS",
      path,
      message: `${path} already exists and is not Jumpspace-managed. Leaving it unchanged.`,
    });
  }

  if (file.changed && !dryRun && file.reason !== "user_owned") {
    await atomicWriteFile(absolutePath, next);
  }

  return {
    ok: true,
    provider: options.provider,
    dry_run: dryRun,
    files: [dryRun ? { ...file, action: file.changed ? file.action : "unchanged" } : file],
    warnings,
  };
}

export function githubWorkflowTemplate(): string {
  return `${startMarker}
name: Jumpspace PR Assistant

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  jumpspace:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci --ignore-scripts

      - name: Build Jumpspace PR comment
        env:
          BASE_SHA: \${{ github.event.pull_request.base.sha }}
        run: |
          set +e
          npx @jumpspace/cli task scan
          SCAN_EXIT=$?
          npx @jumpspace/cli task semantic build --json > jumpspace-semantic-build.json
          SEMANTIC_EXIT=$?
          npx @jumpspace/cli task pr comment --since "$BASE_SHA" > jumpspace-pr-comment.md
          COMMENT_EXIT=$?
          npx @jumpspace/cli task audit --json > jumpspace-audit.json
          AUDIT_EXIT=$?
          npx @jumpspace/cli task doctor --json > jumpspace-doctor.json
          DOCTOR_EXIT=$?

          node <<'NODE'
          const fs = require("fs");
          const marker = "<!-- jumpspace-pr-assistant:v1 -->";
          const footer = "\\n\\n---\\n\\nOutput truncated to stay within GitHub limits. Run jumpspace task pr comment --since <base-sha> locally for the full packet.\\n";
          const source = fs.readFileSync("jumpspace-pr-comment.md", "utf8");

          function bounded(value, maxChars) {
            if (value.length <= maxChars) {
              return value;
            }
            const budget = Math.max(0, maxChars - footer.length);
            return value.slice(0, budget).replace(/\\s+$/u, "") + footer;
          }

          let comment = bounded(source, 60000);
          if (!comment.includes(marker)) {
            comment = marker + "\\n" + comment;
          }
          fs.writeFileSync("jumpspace-pr-comment-bounded.md", comment);
          fs.writeFileSync("jumpspace-pr-summary.md", bounded(source, 60000));
          NODE

          printf "%s\\n" "$SCAN_EXIT" "$SEMANTIC_EXIT" "$COMMENT_EXIT" "$AUDIT_EXIT" "$DOCTOR_EXIT" > jumpspace-exit-codes.txt
          exit 0

      - name: Add Jumpspace summary
        run: cat jumpspace-pr-summary.md >> "$GITHUB_STEP_SUMMARY"

      - name: Upsert Jumpspace PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require("fs");
            const marker = "<!-- jumpspace-pr-assistant:v1 -->";
            const body = fs.readFileSync("jumpspace-pr-comment-bounded.md", "utf8");
            const { owner, repo } = context.repo;
            const issue_number = context.issue.number;
            const comments = await github.paginate(github.rest.issues.listComments, {
              owner,
              repo,
              issue_number,
              per_page: 100,
            });
            const existing = comments.find((comment) => comment.body && comment.body.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
            } else {
              await github.rest.issues.createComment({ owner, repo, issue_number, body });
            }

      - name: Fail if Jumpspace checks failed
        run: |
          while read -r code; do
            if [ "$code" != "0" ]; then
              exit "$code"
            fi
          done < jumpspace-exit-codes.txt
${endMarker}
`;
}

function workflowPath(provider: CiWorkflowProvider): string {
  if (provider === "github") {
    return GITHUB_CI_WORKFLOW_PATH;
  }
  return provider satisfies never;
}

function workflowFileState(
  provider: CiWorkflowProvider,
  path: string,
  existing: string | undefined,
  next: string,
): CiWorkflowFile {
  if (existing === undefined) {
    return {
      provider,
      path,
      action: "created",
      changed: true,
      managed: true,
      reason: "missing",
    };
  }

  if (existing === next) {
    return {
      provider,
      path,
      action: "unchanged",
      changed: false,
      managed: true,
      reason: "already_current",
    };
  }

  if (hasManagedMarkers(existing)) {
    return {
      provider,
      path,
      action: "updated",
      changed: true,
      managed: true,
      reason: "managed_block",
    };
  }

  if (isLegacyJumpspaceWorkflow(existing)) {
    return {
      provider,
      path,
      action: "updated",
      changed: true,
      managed: true,
      reason: "legacy_jumpspace_template",
    };
  }

  return {
    provider,
    path,
    action: "unchanged",
    changed: false,
    managed: false,
    reason: "user_owned",
  };
}

function hasManagedMarkers(value: string): boolean {
  return value.includes(startMarker) && value.includes(endMarker);
}

function isLegacyJumpspaceWorkflow(value: string): boolean {
  return value.includes("name: Jumpspace Audit") && value.includes("node dist/cli.js audit");
}
