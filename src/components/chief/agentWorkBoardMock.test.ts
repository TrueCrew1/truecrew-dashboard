import { describe, expect, it } from "vitest";
import { AGENT_WORK_ITEMS } from "./agentWorkBoardMock";

describe("AGENT_WORK_ITEMS", () => {
  it("includes a mock Competitive Research Agent entry", () => {
    const item = AGENT_WORK_ITEMS.find((i) => i.agent === "Competitive Research Agent");

    expect(item).toBeDefined();
    expect(item?.status).toBe("queued");
    expect(item?.source).toBe("mock");
    expect(item?.note).toBe("Mock research agent work item — local only.");
  });

  it("does not collide with the live Research Agent name", () => {
    const names = AGENT_WORK_ITEMS.map((i) => i.agent);

    expect(names).not.toContain("Research Agent");
  });
});
