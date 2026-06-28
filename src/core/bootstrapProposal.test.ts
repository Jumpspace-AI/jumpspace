import { describe, expect, it } from "vitest";
import { parseBootstrapProposal } from "./bootstrapProposal.js";

describe("parseBootstrapProposal", () => {
  it("parses proposal defaults", () => {
    const proposal = parseBootstrapProposal(
      JSON.stringify({
        tasks: [
          {
            id: "DOC-ONE",
            title: "First feature",
            source: {
              path: "README.md",
              heading: "First feature",
              line: 7,
              level: 2,
              parent_headings: ["Product"],
            },
            evidence: [
              {
                path: "README.md",
                heading: "First feature",
              },
            ],
            confidence: 0.8,
          },
        ],
      }),
    );

    expect(proposal).toMatchObject({
      version: 1,
      tasks: [
        {
          id: "DOC-ONE",
          source: {
            line: 7,
            level: 2,
            parent_headings: ["Product"],
          },
          type: "spec",
          status: "proposed",
          space: "repo",
          code: [],
          tests: [],
          depends_on: [],
          refs: [],
          gaps: [],
        },
      ],
      skipped: [],
    });
  });
});
