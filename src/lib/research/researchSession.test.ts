import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSessionResearchRequest,
  loadSessionResearchRequests,
  mergeResearchRequests,
  saveSessionResearchRequests,
} from "./sessionStore";
import { ADAPTER_RESEARCH_REQUESTS } from "./adapterRequests";

test("buildSessionResearchRequest: session source and operator topic", () => {
  const request = buildSessionResearchRequest("M&S Painting brand rollout");
  assert.equal(request.source, "session");
  assert.equal(request.topic, "M&S Painting brand rollout");
  assert.match(request.id, /^req-session-ms-painting-brand-rollout-\d+$/);
  assert.match(request.whyItMatters, /Nothing auto-investigates/i);
});

test("mergeResearchRequests: session rows sort ahead of older adapter rows", () => {
  const session = buildSessionResearchRequest("M&S Painting brand rollout");
  const merged = mergeResearchRequests([session], ADAPTER_RESEARCH_REQUESTS);
  assert.equal(merged[0]?.id, session.id);
  assert.ok(merged.some((row) => row.source === "adapter"));
});

test("session persistence round-trip via localStorage helpers", () => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;
  const mockStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: mockStorage },
  });

  try {
    const session = buildSessionResearchRequest("M&S Painting tenant branding");
    saveSessionResearchRequests([session]);
    const loaded = loadSessionResearchRequests();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.topic, session.topic);
    assert.equal(loaded[0]?.source, "session");
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});
