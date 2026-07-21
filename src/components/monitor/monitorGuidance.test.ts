import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveMonitorGuidance } from "./monitorGuidance";
import type { PlatformHealthState } from "@/types/monitor";

function healthyState(): PlatformHealthState {
  return {
    vercel: {
      data: { ok: true, latest: { state: "READY", createdAt: "2026-07-19T00:00:00.000Z", url: "x" }, recent: [] },
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

test("deriveMonitorGuidance: both healthy in live mode reports healthy with no checklist", () => {
  const guidance = deriveMonitorGuidance(healthyState(), true);
  assert.equal(guidance.tone, "healthy");
  assert.match(guidance.summary, /healthy/i);
  assert.deepEqual(guidance.checklist, []);
});

test("deriveMonitorGuidance: Vercel degraded (reported ok:false) recommends reviewing Vercel only", () => {
  const state = healthyState();
  state.vercel = {
    data: { ok: false, error: "Failed to fetch deployments from Vercel", recent: [] },
    loading: false,
    error: "Failed to fetch deployments from Vercel",
  };
  const guidance = deriveMonitorGuidance(state, true);
  assert.equal(guidance.tone, "vercel-degraded");
  assert.match(guidance.detail, /Vercel:/);
  assert.doesNotMatch(guidance.detail, /Supabase:/);
  assert.deepEqual(
    guidance.checklist.map((i) => i.id),
    ["review-vercel"],
  );
});

test("deriveMonitorGuidance: Supabase degraded (db_reachable false) recommends verifying Supabase only", () => {
  const state = healthyState();
  state.supabase = {
    data: { ok: true, db_reachable: false },
    loading: false,
    error: null,
  };
  const guidance = deriveMonitorGuidance(state, true);
  assert.equal(guidance.tone, "supabase-degraded");
  assert.match(guidance.detail, /Supabase: database unreachable/);
  assert.deepEqual(
    guidance.checklist.map((i) => i.id),
    ["verify-supabase"],
  );
});

test("deriveMonitorGuidance: both degraded recommends both checklist items and names both services", () => {
  const state = healthyState();
  state.vercel = {
    data: { ok: false, error: "Vercel monitor is not configured", recent: [] },
    loading: false,
    error: "Vercel monitor is not configured",
  };
  state.supabase = {
    data: { ok: false, error: "Database not configured" },
    loading: false,
    error: "Database not configured",
  };
  const guidance = deriveMonitorGuidance(state, true);
  assert.equal(guidance.tone, "both-degraded");
  assert.match(guidance.detail, /Vercel: Vercel monitor is not configured/);
  assert.match(guidance.detail, /Supabase: Database not configured/);
  assert.deepEqual(
    guidance.checklist.map((i) => i.id),
    ["review-vercel", "verify-supabase"],
  );
});

test("deriveMonitorGuidance: mock mode never reports healthy and tells the operator to enable live mode", () => {
  const guidance = deriveMonitorGuidance(healthyState(), false);
  assert.equal(guidance.tone, "mock");
  assert.match(guidance.summary, /mock/i);
  assert.doesNotMatch(guidance.summary, /healthy/i);
  assert.deepEqual(
    guidance.checklist.map((i) => i.id),
    ["rerun-live"],
  );
});

test("deriveMonitorGuidance: still-loading probes in live mode report loading, not healthy", () => {
  const state = healthyState();
  state.supabase = { data: null, loading: true, error: null };
  const guidance = deriveMonitorGuidance(state, true);
  assert.equal(guidance.tone, "loading");
  assert.doesNotMatch(guidance.summary, /healthy/i);
});

test("deriveMonitorGuidance: a probe that failed to return structured data at all is 'unavailable', not silently healthy or degraded", () => {
  const state = healthyState();
  state.vercel = { data: null, loading: false, error: "Unexpected token '<', \"<!doctype \"... is not valid JSON" };
  const guidance = deriveMonitorGuidance(state, true);
  assert.equal(guidance.tone, "unavailable");
  assert.match(guidance.summary, /could not be (fully )?confirmed/i);
  assert.deepEqual(
    guidance.checklist.map((i) => i.id),
    ["retry-probes"],
  );
});

test("deriveMonitorGuidance: an unavailable probe still surfaces a confirmed problem on the other probe", () => {
  const state = healthyState();
  state.vercel = { data: null, loading: false, error: "Failed to fetch Vercel health" };
  state.supabase = { data: { ok: true, db_reachable: false }, loading: false, error: null };
  const guidance = deriveMonitorGuidance(state, true);
  assert.equal(guidance.tone, "unavailable");
  assert.match(guidance.detail, /Vercel: Failed to fetch Vercel health/);
  assert.match(guidance.detail, /Supabase: database unreachable/);
});
