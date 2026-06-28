import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { jumpTaskMetadataSchema, type JumpIssue, type JumpTask } from "./types.js";

type Heading = {
  level: number;
  title: string;
  index: number;
  line: number;
  parentHeadings: string[];
};

export type ParsedMarkdown = {
  tasks: JumpTask[];
  issues: JumpIssue[];
};

const headingPattern = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/gm;
const jumpspaceCommentPattern = /<!--\s*jumpspace\b([\s\S]*?)-->/g;

export function parseMarkdownTasks(markdown: string, docPath: string): ParsedMarkdown {
  const headings = collectHeadings(markdown);
  const tasks: JumpTask[] = [];
  const issues: JumpIssue[] = [];

  for (const match of markdown.matchAll(jumpspaceCommentPattern)) {
    const commentStart = match.index ?? 0;
    const commentEnd = commentStart + match[0].length;
    const line = lineNumberAt(markdown, commentStart);
    const heading = nearestHeading(headings, commentStart);

    if (!heading) {
      issues.push({
        severity: "error",
        code: "MISSING_HEADING",
        message: "Jumpspace block must appear after a Markdown heading.",
        path: docPath,
        line,
      });
    }

    const rawYaml = match[1].trim();
    let metadata: z.infer<typeof jumpTaskMetadataSchema>;

    try {
      const parsedYaml = parseYaml(rawYaml);
      metadata = jumpTaskMetadataSchema.parse(parsedYaml);
    } catch (error) {
      issues.push({
        severity: "error",
        code: "INVALID_METADATA",
        message: `Invalid jumpspace metadata: ${formatParseError(error)}`,
        path: docPath,
        line,
      });
      continue;
    }

    const title = heading?.title ?? metadata.id;
    const headingTitle = heading?.title ?? metadata.id;
    const specEnd = heading ? nextPeerHeadingIndex(headings, commentEnd, heading.level) : markdown.length;
    const spec = markdown.slice(commentEnd, specEnd).trim();

    tasks.push({
      id: metadata.id,
      title,
      type: metadata.type,
      status: metadata.status,
      module: metadata.module,
      space: metadata.space,
      keywords: metadata.keywords,
      doc: heading
        ? {
            path: docPath,
            heading: headingTitle,
            line: heading.line,
            level: heading.level,
            parent_headings: heading.parentHeadings,
          }
        : {
            path: docPath,
            heading: headingTitle,
          },
      spec,
      code: metadata.code,
      tests: metadata.tests,
      gaps: metadata.gaps,
      depends_on: metadata.depends_on,
      refs: metadata.refs,
      sources: metadata.sources,
      plan: metadata.plan,
      acceptance_criteria: metadata.acceptance_criteria,
      verification_records: metadata.verification_records,
      external: metadata.external,
    });
  }

  return { tasks, issues };
}

function collectHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const stack: Heading[] = [];
  for (const match of markdown.matchAll(headingPattern)) {
    const index = match.index ?? 0;
    while (stack.length > 0 && stack[stack.length - 1].level >= match[1].length) {
      stack.pop();
    }
    const heading: Heading = {
      level: match[1].length,
      title: stripClosingHashes(match[2].trim()),
      index,
      line: lineNumberAt(markdown, index),
      parentHeadings: stack.map((parent) => parent.title),
    };
    headings.push(heading);
    stack.push(heading);
  }
  return headings;
}

function stripClosingHashes(title: string): string {
  return title.replace(/[ \t]+#+$/, "").trim();
}

function nearestHeading(headings: Heading[], beforeIndex: number): Heading | undefined {
  let candidate: Heading | undefined;
  for (const heading of headings) {
    if (heading.index >= beforeIndex) {
      break;
    }
    candidate = heading;
  }
  return candidate;
}

function nextPeerHeadingIndex(headings: Heading[], afterIndex: number, currentLevel: number): number {
  for (const heading of headings) {
    if (heading.index > afterIndex && heading.level <= currentLevel) {
      return heading.index;
    }
  }
  return Number.POSITIVE_INFINITY;
}

function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

function formatParseError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".") || "metadata"}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
