import { describe, expect, it } from "vitest";
import { pickModel } from "../lib/llm/router.js";
import { getMaxTokens } from "../lib/llm/types.js";

describe("llm router — pickModel", () => {
  it("routes research lane by complexity", () => {
    expect(pickModel({ lane: "research", complexity: "low" })).toBe("deepseek");
    expect(pickModel({ lane: "research", complexity: "medium" })).toBe("deepseek");
    expect(pickModel({ lane: "research", complexity: "high" })).toBe("kimi");
  });

  it("routes builder lane by complexity", () => {
    expect(pickModel({ lane: "builder", complexity: "low" })).toBe("deepseek");
    expect(pickModel({ lane: "builder", complexity: "medium" })).toBe("gpt5mini");
    expect(pickModel({ lane: "builder", complexity: "high" })).toBe("gpt5mini");
  });

  it("routes chief lane by complexity", () => {
    expect(pickModel({ lane: "chief", complexity: "low" })).toBe("deepseek");
    expect(pickModel({ lane: "chief", complexity: "medium" })).toBe("deepseek");
    expect(pickModel({ lane: "chief", complexity: "high" })).toBe("gpt5mini");
  });
});

describe("llm router — getMaxTokens", () => {
  it("returns the documented token ceiling per complexity", () => {
    expect(getMaxTokens("low")).toBe(400);
    expect(getMaxTokens("medium")).toBe(600);
    expect(getMaxTokens("high")).toBe(800);
  });
});
