import { test } from "node:test";
import assert from "node:assert/strict";
import { derivePlatformBriefSummary } from "./platformHealthSummary";
import type { PlatformHealthState } from "@/types/monitor";

function healthyState(): PlatformHealthState {
  return {
    vercel: {
      data: { ok: true, latest: { state: "READY", createdAt: "2026-07-18T00:00:00.000Z", url: "x" }, recent: [] },
      loading: false,
      error: null,
    },
    supabase: {
      data: { ok: true, db_reachable: true, connection_count: 1, active_connections: 1 },
      loading: false,
      error: null,
    },
  };
}

test("derivePlatformBriefSummary: both services healthy in live mode reports healthy, not silent", () => {
  const summary = derivePlatformBriefSummary(healthyState(), true);
  assert.equal(summary.tone, "healthy");
  assert.match(summary.headline, /healthy/i);
  assert.deepEqual(summary.issues, []);
});

test("derivePlatformBriefSummary: Vercel unhealthy surfaces a Vercel-specific issue", () => {
  const state = healthyState();
  state.vercel = { data: null, loading: false, error: "Vercel monitor is not configured" };
  const summary = derivePlatformBriefSummary(state, true);
  assert.equal(summary.tone, "issue");
  assert.equal(summary.issues.length, 1);
  assert.match(summary.headline, /Vercel: Vercel monitor is not configured/);
  assert.doesNotMatch(summary.headline, /Supabase/);
});

test("derivePlatformBriefSummary: Vercel latest deploy ERROR state is treated as an issue even without a fetch error", () => {
  const state = healthyState();
  state.vercel = {
    data: { ok: true, latest: { state: "ERROR", createdAt: "2026-07-18T00:00:00.000Z", url: "x" }, recent: [] },
    loading: false,
    error: null,
  };
  const summary = derivePlatformBriefSummary(state, true);
  assert.equal(summary.tone, "issue");
  assert.match(summary.headline, /Vercel: latest deploy failed/);
});

test("derivePlatformBriefSummary: Supabase unhealthy surfaces a Supabase-specific issue", () => {
  const state = healthyState();
  state.supabase = { data: null, loading: false, error: "Database not configured" };
  const summary = derivePlatformBriefSummary(state, true);
  assert.equal(summary.tone, "issue");
  assert.equal(summary.issues.length, 1);
  assert.match(summary.headline, /Supabase: Database not configured/);
  assert.doesNotMatch(summary.headline, /Vercel:/);
});

test("derivePlatformBriefSummary: Supabase reporting db_reachable false is an issue even without an error field", () => {
  const state = healthyState();
  state.supabase = {
    data: { ok: true, db_reachable: false },
    loading: false,
    error: null,
  };
  const summary = derivePlatformBriefSummary(state, true);
  assert.equal(summary.tone, "issue");
  assert.match(summary.headline, /Supabase: database unreachable/);
});

test("derivePlatformBriefSummary: both unhealthy reports both issues, not just one", () => {
  const state = healthyState();
  state.vercel = { data: null, loading: false, error: "Failed to fetch deployments from Vercel" };
  state.supabase = { data: null, loading: false, error: "Database not configured" };
  const summary = derivePlatformBriefSummary(state, true);
  assert.equal(summary.tone, "issue");
  assert.equal(summary.issues.length, 2);
  assert.match(summary.headline, /Vercel: Failed to fetch deployments from Vercel/);
  assert.match(summary.headline, /Supabase: Database not configured/);
});

test("derivePlatformBriefSummary: mock mode never reports healthy, even with clean-looking data left over", () => {
  const summary = derivePlatformBriefSummary(healthyState(), false);
  assert.equal(summary.tone, "mock");
  assert.match(summary.headline, /mock/i);
  assert.doesNotMatch(summary.headline, /healthy/i);
});

test("derivePlatformBriefSummary: missing platform health state in live mode falls back to the honest mock/unavailable label, not healthy", () => {
  const summary = derivePlatformBriefSummary(undefined, true);
  assert.equal(summary.tone, "mock");
  assert.doesNotMatch(summary.headline, /healthy/i);
});

test("derivePlatformBriefSummary: still-loading services in live mode with no issues are 'loading', not 'healthy'", () => {
  const state = healthyState();
  state.supabase = { data: null, loading: true, error: null };
  const summary = derivePlatformBriefSummary(state, true);
  assert.equal(summary.tone, "loading");
  assert.doesNotMatch(summary.headline, /healthy/i);
});
