import { describe, expect, it } from "vitest";
import { endMarker, startMarker, upsertManagedBlock } from "./managedBlocks.js";

describe("upsertManagedBlock", () => {
  it("creates, replaces, and preserves user-authored content outside markers", () => {
    const first = upsertManagedBlock("custom intro\n", {
      name: "codex",
      content: "managed v1",
    });

    expect(first).toContain("custom intro");
    expect(first).toContain(startMarker("codex"));
    expect(first).toContain("managed v1");

    const second = upsertManagedBlock(first, {
      name: "codex",
      content: "managed v2",
    });

    expect(second).toContain("custom intro");
    expect(second).toContain("managed v2");
    expect(second).not.toContain("managed v1");
    expect(second.match(new RegExp(startMarker("codex"), "g"))).toHaveLength(1);
    expect(second.match(new RegExp(endMarker("codex"), "g"))).toHaveLength(1);
  });
});
