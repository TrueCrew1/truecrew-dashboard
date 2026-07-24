/**
 * Research runner API client — server-side / CLI only.
 * Authenticates with TRUECREW_API_URL + TRUECREW_INTERNAL_KEY (see docs/RESEARCH_RUNNER.md).
 * Framework-free: no React, no Vite env.
 */
import type { ResearchRequestStatus } from "./status.js";

export interface RunnerResearchRequest {
  id: string;
  topic: string;
  whyItMatters: string;
  suggestedOutcome: string;
  createdAt: string;
  updatedAt: string;
  source: "adapter" | "session";
  status: ResearchRequestStatus;
  filedPath?: string;
  blockerNote?: string;
}

export interface ResearchRunnerEnv {
  apiUrl: string;
  internalKey: string;
}

export type ResearchRunnerEnvResult =
  | { ok: true; env: ResearchRunnerEnv }
  | { ok: false; error: string; missing: string[] };

export function resolveResearchRunnerEnv(
  processEnv: NodeJS.ProcessEnv = process.env,
): ResearchRunnerEnvResult {
  const apiUrl = processEnv.TRUECREW_API_URL?.trim().replace(/\/$/, "") ?? "";
  const internalKey = processEnv.TRUECREW_INTERNAL_KEY?.trim() ?? "";
  const missing: string[] = [];
  if (!apiUrl) missing.push("TRUECREW_API_URL");
  if (!internalKey) missing.push("TRUECREW_INTERNAL_KEY");
  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      error:
        `Research runner env incomplete — missing ${missing.join(", ")}. ` +
        `Set both to call the live queue (see docs/RESEARCH_RUNNER.md). ` +
        `Without them the runner cannot sync status and must use the repo-native fallback.`,
    };
  }
  return { ok: true, env: { apiUrl, internalKey } };
}

/** Oldest in_progress row — the runner's single pickup target per docs/RESEARCH_RUNNER.md. */
export function pickOldestInProgress(
  requests: readonly RunnerResearchRequest[],
): RunnerResearchRequest | null {
  const active = requests.filter((row) => row.status === "in_progress");
  if (active.length === 0) return null;
  return [...active].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  )[0]!;
}

export function countByStatus(
  requests: readonly RunnerResearchRequest[],
): Record<ResearchRequestStatus, number> {
  const tallies: Record<ResearchRequestStatus, number> = {
    queued: 0,
    in_progress: 0,
    done: 0,
    blocked: 0,
  };
  for (const row of requests) {
    tallies[row.status] += 1;
  }
  return tallies;
}

async function runnerFetch(
  env: ResearchRunnerEnv,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = `${env.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": env.internalKey,
      ...init.headers,
    },
  });
}

export async function listResearchRequestsViaApi(
  env: ResearchRunnerEnv,
): Promise<RunnerResearchRequest[]> {
  const response = await runnerFetch(env, "/api/research");
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      body.error ??
        `GET /api/research failed with ${response.status} — check INTERNAL_API_SECRET match and that research_requests exists.`,
    );
  }
  const body = (await response.json()) as { requests?: RunnerResearchRequest[] };
  return body.requests ?? [];
}

export async function patchResearchRequestViaApi(
  env: ResearchRunnerEnv,
  id: string,
  status: ResearchRequestStatus,
  options?: { filedPath?: string; blockerNote?: string },
): Promise<RunnerResearchRequest> {
  const response = await runnerFetch(env, `/api/research/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      filedPath: options?.filedPath,
      blockerNote: options?.blockerNote,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    request?: RunnerResearchRequest;
  };
  if (!response.ok || !body.request) {
    throw new Error(body.error ?? `PATCH /api/research/${id} failed with ${response.status}`);
  }
  return body.request;
}
