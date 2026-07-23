import assert from "node:assert/strict";
import test from "node:test";
import {
  applyResearchStatus,
  buildSessionResearchRequest,
  canTransitionResearchStatus,
  isMsEstimatingRoadmapTopic,
  loadSessionResearchRequests,
  mergeResearchRequests,
  saveSessionResearchRequests,
} from "./sessionStore";
import { ADAPTER_RESEARCH_REQUESTS } from "./adapterRequests";
import { MS_ESTIMATING_ROADMAP_FINDING_PATH } from "./types";

test("buildSessionResearchRequest: session source and operator topic", () => {
  const request = buildSessionResearchRequest("M&S Painting brand rollout");
  assert.equal(request.source, "session");
  assert.equal(request.status, "queued");
  assert.equal(request.topic, "M&S Painting brand rollout");
  assert.ok(request.updatedAt);
  assert.match(request.id, /^req-session-ms-painting-brand-rollout-\d+$/);
  assert.match(request.whyItMatters, /Nothing auto-investigates/i);
});

test("buildSessionResearchRequest: M&S estimating roadmap uses finding path", () => {
  const request = buildSessionResearchRequest("M&S estimating roadmap");
  assert.equal(isMsEstimatingRoadmapTopic(request.topic), true);
  assert.match(request.suggestedOutcome, /knowledge\/findings\/m-and-s\/estimating-roadmap/);
  assert.equal(request.status, "queued");
});

test("research status transitions: queued → in_progress → done with filed path", () => {
  const queued = buildSessionResearchRequest("M&S estimating roadmap");
  assert.equal(canTransitionResearchStatus("queued", "in_progress"), true);
  const active = applyResearchStatus(queued, "in_progress");
  assert.equal(active.status, "in_progress");
  const done = applyResearchStatus(active, "done", {
    filedPath: MS_ESTIMATING_ROADMAP_FINDING_PATH,
  });
  assert.equal(done.status, "done");
  assert.equal(done.filedPath, MS_ESTIMATING_ROADMAP_FINDING_PATH);
  assert.throws(() => applyResearchStatus(done, "queued"));
});

test("research status: done without filed path fails", () => {
  const active = applyResearchStatus(buildSessionResearchRequest("topic"), "in_progress");
  assert.throws(() => applyResearchStatus(active, "done"));
});

test("mergeResearchRequests: session rows sort ahead of older adapter rows", () => {
  const session = buildSessionResearchRequest("M&S Painting brand rollout");
  const merged = mergeResearchRequests([session], ADAPTER_RESEARCH_REQUESTS);
  assert.equal(merged[0]?.id, session.id);
  assert.ok(merged.every((row) => row.status));
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
    assert.equal(loaded[0]?.status, "queued");
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});
