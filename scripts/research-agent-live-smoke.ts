#!/usr/bin/env node
/**
 * Research Agent live-path API smoke — staging/prod ops tool.
 *
 * Does NOT drive the browser. It verifies the shared data contract:
 * research_requests via /api/research, approve-shaped queued → in_progress,
 * pickup oldest in_progress only, done/block refuse queued.
 *
 * Env (required):
 *   TRUECREW_API_URL
 *   TRUECREW_INTERNAL_KEY
 *
 * Usage:
 *   npm run research:smoke                 # full write smoke (seed → release → pickup → done)
 *   npm run research:smoke -- --read-only  # GET + pickup + queued-refuse only
 *
 * See docs/RESEARCH_AGENT_LIVE_PR210.md § Staging / Production smoke.
 */
import "dotenv/config";
import {
  assertRunnerMayMutate,
  countByStatus,
  createResearchRequestViaApi,
  findRequestById,
  listResearchRequestsViaApi,
  mutateReleasedRequestViaApi,
  patchResearchRequestViaApi,
  pickOldestInProgress,
  resolveResearchRunnerEnv,
} from "../lib/research/runnerClient.js";

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function expectReject(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await promise;
    throw new Error(`expected rejection matching ${pattern}`);
  } catch (error) {
    if (!(error instanceof Error) || !pattern.test(error.message)) {
      throw error;
    }
  }
}

async function main(): Promise<void> {
  const readOnly = hasFlag("--read-only");
  const resolved = resolveResearchRunnerEnv();
  if (!resolved.ok) {
    console.error(`[research-smoke] FAIL closed: ${resolved.error}`);
    console.error(
      "[research-smoke] Set TRUECREW_API_URL + TRUECREW_INTERNAL_KEY to target staging/prod.",
    );
    process.exitCode = 1;
    return;
  }

  const { env } = resolved;
  console.log(`[research-smoke] target ${env.apiUrl} (readOnly=${readOnly})`);

  const before = await listResearchRequestsViaApi(env);
  const beforeCounts = countByStatus(before);
  console.log("[research-smoke] status counts:", beforeCounts);

  const queuedBeforeIds = before.filter((row) => row.status === "queued").map((row) => row.id);
  const pickup = pickOldestInProgress(before);
  if (pickup) {
    console.log(`[research-smoke] pickup candidate: ${pickup.id} (${pickup.status})`);
    if (pickup.status !== "in_progress") {
      throw new Error("pickup returned a non-in_progress row");
    }
  } else {
    console.log("[research-smoke] pickup: none (no in_progress rows)");
  }

  if (queuedBeforeIds[0]) {
    const sampleQueued = before.find((row) => row.id === queuedBeforeIds[0])!;
    try {
      assertRunnerMayMutate(sampleQueued, "done");
      throw new Error("expected assertRunnerMayMutate to refuse queued");
    } catch (error) {
      if (!(error instanceof Error) || !/refuses to done queued/.test(error.message)) {
        throw error;
      }
      console.log(`[research-smoke] OK refuse done on queued ${sampleQueued.id}`);
    }
  } else {
    console.log("[research-smoke] skip queued-refuse (no queued rows present)");
  }

  if (readOnly) {
    console.log("[research-smoke] PASS read-only checks");
    return;
  }

  const id = `req-smoke-live-${stamp()}`;
  const created = await createResearchRequestViaApi(env, {
    id,
    topic: `[SMOKE] Research Agent Live ${stamp()}`,
    whyItMatters: "Ops smoke only — safe to mark done.",
    suggestedOutcome: "Terminal done after runner smoke.",
  });
  if (created.status !== "queued") {
    throw new Error(`expected created row queued, got ${created.status}`);
  }
  console.log(`[research-smoke] seeded queued ${created.id}`);

  await expectReject(
    mutateReleasedRequestViaApi(env, created.id, "done", {
      filedPath: "knowledge/findings/m-and-s/_should-not-write.md",
    }),
    /refuses to done queued/,
  );
  console.log(`[research-smoke] OK refuse done while still queued`);

  // Simulate Chief approve release (API contract — browser approve remains a manual step).
  const released = await patchResearchRequestViaApi(env, created.id, "in_progress");
  if (released.status !== "in_progress") {
    throw new Error(`expected in_progress after release PATCH, got ${released.status}`);
  }
  console.log(`[research-smoke] released → in_progress ${released.id}`);

  const mid = await listResearchRequestsViaApi(env);
  const midPickup = pickOldestInProgress(mid);
  if (!midPickup || midPickup.status !== "in_progress") {
    throw new Error("pickup after release did not return an in_progress row");
  }
  if (!findRequestById(mid, created.id) || findRequestById(mid, created.id)?.status !== "in_progress") {
    throw new Error("smoke row not visible as in_progress after release");
  }
  const midQueuedIds = new Set(mid.filter((row) => row.status === "queued").map((row) => row.id));
  for (const queuedId of queuedBeforeIds) {
    if (!midQueuedIds.has(queuedId)) {
      throw new Error(`queued row mutated unexpectedly: ${queuedId}`);
    }
  }
  console.log(`[research-smoke] OK pickup=${midPickup.id}; prior queued ids unchanged`);

  const done = await mutateReleasedRequestViaApi(env, created.id, "done", {
    filedPath: "knowledge/findings/m-and-s/_smoke-research-agent-live.md",
  });
  if (done.status !== "done") {
    throw new Error(`expected done, got ${done.status}`);
  }
  console.log(`[research-smoke] OK done ${done.id}`);

  const after = await listResearchRequestsViaApi(env);
  const stillQueued = after.find((row) => row.status === "queued");
  if (stillQueued) {
    await expectReject(
      mutateReleasedRequestViaApi(env, stillQueued.id, "done", {
        filedPath: "knowledge/findings/m-and-s/_should-not-write.md",
      }),
      /refuses to done queued/,
    );
    console.log(`[research-smoke] OK still refuses queued ${stillQueued.id}`);
  }

  const finalRow = findRequestById(after, created.id);
  if (!finalRow || finalRow.status !== "done") {
    throw new Error("smoke row missing or not done after terminal PATCH");
  }

  console.log("[research-smoke] PASS full write smoke");
  console.log(
    "[research-smoke] Remaining: browser approve smoke (Chief → Approvals) once per env — see docs.",
  );
}

main().catch((error) => {
  console.error("[research-smoke] FAIL", error);
  process.exitCode = 1;
});
