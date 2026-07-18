import { describe, expect, it, afterEach } from "vitest";
import { resolveFoundryEndpoint } from "../src/llm/foundryConfig";

describe("resolveFoundryEndpoint", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("prefers AZURE_AI_RESOURCE_ENDPOINT", () => {
    process.env.AZURE_AI_RESOURCE_ENDPOINT = "https://foundry.example.services.ai.azure.com/";
    process.env.AZURE_OPENAI_ENDPOINT = "https://classic.openai.azure.com";
    expect(resolveFoundryEndpoint()).toBe("https://foundry.example.services.ai.azure.com");
  });

  it("derives from AZURE_OPENAI_ENDPOINT when Foundry endpoint is missing", () => {
    delete process.env.AZURE_AI_RESOURCE_ENDPOINT;
    process.env.AZURE_OPENAI_ENDPOINT = "https://true-crew-resource.openai.azure.com";
    expect(resolveFoundryEndpoint()).toBe("https://true-crew-resource.services.ai.azure.com");
  });

  it("returns empty when neither env is set", () => {
    delete process.env.AZURE_AI_RESOURCE_ENDPOINT;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    expect(resolveFoundryEndpoint()).toBe("");
  });
});
