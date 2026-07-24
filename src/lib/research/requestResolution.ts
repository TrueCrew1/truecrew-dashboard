/**
 * Pure resolve helpers for the Research queue approve path.
 * Resolve order matches ResearchRequestsContext.updateRequestStatus:
 * override → server → session → static adapter.
 */
import type { ResearchRequest, ResearchRequestStatus } from "./types";

export interface ResearchRequestResolveSources {
  override?: ResearchRequest | null;
  server?: ResearchRequest | null;
  session?: ResearchRequest | null;
  adapter?: ResearchRequest | null;
}

/** First non-null row in the approve-path resolve order. */
export function resolveResearchRequestForUpdate(
  sources: ResearchRequestResolveSources,
): ResearchRequest | null {
  return sources.override ?? sources.server ?? sources.session ?? sources.adapter ?? null;
}

/**
 * Soft-poll / ingest helper: drop overrides the server already reflects
 * (same id + status). Keep overrides that still differ so optimistic UI
 * survives until the PATCH lands or fails.
 */
export function pruneStatusOverridesMatchingServer(
  overrides: Record<string, ResearchRequest>,
  serverRows: readonly ResearchRequest[],
): Record<string, ResearchRequest> {
  if (Object.keys(overrides).length === 0) return overrides;
  const next = { ...overrides };
  let changed = false;
  for (const row of serverRows) {
    const override = next[row.id];
    if (override && override.status === row.status) {
      delete next[row.id];
      changed = true;
    }
  }
  return changed ? next : overrides;
}

/** Apply overrides onto a merged list (id match wins). */
export function applyStatusOverrides(
  rows: readonly ResearchRequest[],
  overrides: Record<string, ResearchRequest>,
): ResearchRequest[] {
  if (Object.keys(overrides).length === 0) return [...rows];
  return rows.map((row) => overrides[row.id] ?? row);
}

export type ResearchRailMode = "off" | "loading" | "live" | "degraded_session";

/**
 * Derive rail mode from live-API flag + fetch state (mirrors context rail).
 * - off: live API disabled
 * - loading: live on, first fetch not landed
 * - live: server rows present
 * - degraded_session: live on, fetch failed / no server rows
 */
export function deriveResearchRailMode(input: {
  liveApiEnabled: boolean;
  liveLoading: boolean;
  hasServerRows: boolean;
}): ResearchRailMode {
  if (!input.liveApiEnabled) return "off";
  if (input.liveLoading && !input.hasServerRows) return "loading";
  if (input.hasServerRows) return "live";
  return "degraded_session";
}

export function shouldPostCreateWhileLoading(liveApiEnabled: boolean): boolean {
  // Creates POST whenever live API is on — including during "loading".
  return liveApiEnabled;
}

export function shouldPatchWhileLoading(liveApiEnabled: boolean): boolean {
  return liveApiEnabled;
}

export type ApproveReleaseOutcome =
  | { ok: true; nextStatus: ResearchRequestStatus }
  | { ok: false; reason: "not_found" | "invalid_transition"; detail: string };

/**
 * Simulate the approve release decision against a resolved row (no I/O).
 * Used by tests to prove adapter/loading ids can reach in_progress.
 */
export function simulateApproveRelease(
  resolved: ResearchRequest | null,
): ApproveReleaseOutcome {
  if (!resolved) {
    return { ok: false, reason: "not_found", detail: "Research request not found" };
  }
  if (resolved.status !== "queued") {
    return {
      ok: false,
      reason: "invalid_transition",
      detail: `Cannot release from ${resolved.status} (expected queued)`,
    };
  }
  return { ok: true, nextStatus: "in_progress" };
}
