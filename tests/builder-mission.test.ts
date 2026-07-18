import { describe, expect, it } from "vitest";
import {
  BUILD_APPROVAL_GATES,
  createApprovalCardFromBuildRequest,
  type BuildApprovalRequest,
} from "@/components/chief/agentApprovalGates";
import { applyPolicyToProposal, evaluateApprovalPolicy } from "@/components/chief/chiefApprovalPolicy";
import {
  builderMissionIdForProposal,
  canLaunchBuilderMission,
  canRetryBuilderMission,
  completeBuilderMission,
  createBuilderMissionFromProposal,
  decideBuilderMissionStart,
  launchBuilderMissionFromProposal,
  missionShouldFail,
  prepareBuilderMissionRetry,
  queueBuilderMission,
  queueBuilderMissionFromProposal,
  retryBuilderMissionFromProposal,
  runBuilderMission,
  runBuilderMissionSteps,
  startBuilderMission,
  upsertBuilderMission,
  workStoryIdForProposal,
  type BuilderMission,
  type BuilderMissionRecord,
} from "@/components/chief/builderMission";
import type { ApprovalProposal } from "@/components/chief/types";

function makeBuildRequest(overrides: Partial<BuildApprovalRequest> = {}): BuildApprovalRequest {
  return {
    id: "apr-build-mission-test",
    gate: BUILD_APPROVAL_GATES[0],
    summary: "Ship a focused Builder change under the approved mission contract.",
    riskLevel: "low",
    testsOrChecksDone: [
      { label: "Tests pass", status: "pass" },
      { label: "Lint clean", status: "pass" },
    ],
    requestedAction: "Merge the approved Builder change.",
    filesOrAreas: ["src/components/chief/builderMission.ts"],
    createdAt: "2026-07-18T12:00:00.000Z",
    confidence: 0.95,
    evidence: { linkedPrId: 156, testStatusSummary: "pass" },
    ...overrides,
  };
}

function makeForwardableApprovedProposal(
  overrides: Partial<ApprovalProposal> = {},
): ApprovalProposal {
  const card = createApprovalCardFromBuildRequest(makeBuildRequest());
  const policy = evaluateApprovalPolicy({ proposal: card });
  const withPolicy = applyPolicyToProposal(card, policy);
  return {
    ...withPolicy,
    status: "approved",
    decidedAt: "2026-07-18T12:05:00.000Z",
    ...overrides,
  };
}

function makeFailedMissionRecord(proposal: ApprovalProposal): BuilderMissionRecord {
  const mission = createBuilderMissionFromProposal({
    ...proposal,
    recommendedAction: `${proposal.recommendedAction} [FAIL]`,
  });
  return runBuilderMission(mission, () => "2026-07-18T12:10:00.000Z");
}

describe("canLaunchBuilderMission", () => {
  it("allows an approved, forwardable Builder proposal", () => {
    const proposal = makeForwardableApprovedProposal();
    expect(proposal.routingDisposition).toBe("forwarded");
    expect(canLaunchBuilderMission(proposal)).toEqual({ ok: true });
  });

  it("blocks non-Builder sources", () => {
    const proposal = makeForwardableApprovedProposal({ source: "research_agent" });
    expect(canLaunchBuilderMission(proposal)).toEqual({
      ok: false,
      reason: "not_builder_source",
    });
  });

  it("blocks proposals that are not approved", () => {
    const proposal = makeForwardableApprovedProposal({ status: "pending" });
    expect(canLaunchBuilderMission(proposal)).toEqual({
      ok: false,
      reason: "not_approved",
    });
  });

  it("blocks high-confidence Builder proposals that fail evidence policy", () => {
    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({
        confidence: 0.95,
        evidence: undefined,
      }),
    );
    const policy = evaluateApprovalPolicy({ proposal: card });
    const proposal = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );

    expect(proposal.routingDisposition).toBe("needs_refinement");
    expect(canLaunchBuilderMission(proposal)).toEqual({
      ok: false,
      reason: "not_forwardable",
    });
  });

  it("blocks when a mission was already launched for the proposal", () => {
    const proposal = makeForwardableApprovedProposal();
    const mission = createBuilderMissionFromProposal(proposal);
    const existing: BuilderMissionRecord[] = [queueBuilderMission(mission)];

    expect(canLaunchBuilderMission(proposal, existing)).toEqual({
      ok: false,
      reason: "already_launched",
    });
  });
});

describe("idempotent launch (duplicate approval / replay)", () => {
  it("duplicate approval only creates one mission", () => {
    const proposal = makeForwardableApprovedProposal();
    const first = launchBuilderMissionFromProposal(proposal);
    expect(first.outcome).toBe("launched");
    if (first.outcome !== "launched") return;

    const second = launchBuilderMissionFromProposal(proposal, [first.record]);
    expect(second.outcome).toBe("reused");
    if (second.outcome !== "reused") return;

    expect(second.record.mission.missionId).toBe(first.record.mission.missionId);
    expect(second.reason).toBe("already_completed");
  });

  it("already-running mission is reused, not duplicated", () => {
    const proposal = makeForwardableApprovedProposal();
    const queued = queueBuilderMission(createBuilderMissionFromProposal(proposal));
    const running = startBuilderMission(queued, "2026-07-18T12:06:00.000Z");

    const decision = decideBuilderMissionStart(proposal, [running]);
    expect(decision.kind).toBe("reuse_existing");
    if (decision.kind !== "reuse_existing") return;
    expect(decision.reason).toBe("in_flight");

    const launch = queueBuilderMissionFromProposal(proposal, [running]);
    expect(launch.outcome).toBe("reused");
    if (launch.outcome !== "reused") return;
    expect(launch.record.status).toBe("running");
    expect(launch.record.mission.missionId).toBe(running.mission.missionId);
  });

  it("completed mission is reused unless explicit retry path is invoked", () => {
    const proposal = makeForwardableApprovedProposal();
    const completed = launchBuilderMissionFromProposal(proposal);
    expect(completed.outcome).toBe("launched");
    if (completed.outcome !== "launched") return;

    const again = launchBuilderMissionFromProposal(proposal, [completed.record]);
    expect(again).toMatchObject({
      outcome: "reused",
      reason: "already_completed",
    });

    // Completed missions are not retryable in this slice.
    const retry = retryBuilderMissionFromProposal(proposal, [completed.record]);
    expect(retry.outcome).toBe("reused");
    if (retry.outcome !== "reused") return;
    expect(retry.reason).toBe("already_completed");
  });

  it("failed mission without explicit retry is reused (not relaunched)", () => {
    const proposal = makeForwardableApprovedProposal();
    const failed = makeFailedMissionRecord(proposal);
    expect(failed.status).toBe("failed");

    const again = launchBuilderMissionFromProposal(proposal, [failed]);
    expect(again).toMatchObject({
      outcome: "reused",
      reason: "already_failed",
    });
  });
});

describe("retry failed missions", () => {
  it("failed mission can be retried via explicit retry path", () => {
    const proposal = makeForwardableApprovedProposal({
      recommendedAction: "Apply the approved Builder change",
    });
    // First attempt fails via payload marker, then we clear the marker for retry success.
    const failed = makeFailedMissionRecord(proposal);
    expect(failed.status).toBe("failed");
    expect(failed.attempt).toBe(1);

    const successProposal = makeForwardableApprovedProposal({
      recommendedAction: "Apply the approved Builder change",
    });
    // Swap mission objective for retry by preparing from a non-fail record shape:
    // prepare + complete path with a cleaned objective via retry helper on a
    // record whose mission no longer includes [FAIL].
    const cleanedFailed: BuilderMissionRecord = {
      ...failed,
      mission: {
        ...failed.mission,
        objective: successProposal.recommendedAction || successProposal.summary,
      },
    };

    const retried = retryBuilderMissionFromProposal(successProposal, [cleanedFailed]);
    expect(retried.outcome).toBe("retried");
    if (retried.outcome !== "retried") return;
    expect(retried.record.status).toBe("completed");
    expect(retried.record.attempt).toBe(2);
  });

  it("retry increments attempt count and preserves prior result history", () => {
    const proposal = makeForwardableApprovedProposal({
      recommendedAction: "Force a stub failure [FAIL]",
    });
    const failed = launchBuilderMissionFromProposal(proposal);
    expect(failed.outcome).toBe("launched");
    if (failed.outcome !== "launched") return;
    expect(failed.record.status).toBe("failed");
    expect(failed.record.attempt).toBe(1);

    const prepared = prepareBuilderMissionRetry(
      failed.record,
      "2026-07-18T12:20:00.000Z",
    );
    expect(prepared.status).toBe("queued");
    expect(prepared.attempt).toBe(2);
    expect(prepared.previousResults).toHaveLength(1);
    expect(prepared.previousResults[0]?.attempt).toBe(1);
    expect(prepared.previousResults[0]?.status).toBe("failed");
    expect(prepared.result).toBeUndefined();
    expect(prepared.lastError).toBeUndefined();

    const retried = retryBuilderMissionFromProposal(proposal, [failed.record]);
    expect(retried.outcome).toBe("retried");
    if (retried.outcome !== "retried") return;
    expect(retried.record.attempt).toBe(2);
    expect(retried.record.previousResults).toHaveLength(1);
    expect(retried.record.status).toBe("failed"); // still [FAIL] in objective
  });

  it("canRetryBuilderMission requires failed status and forwardable policy", () => {
    const proposal = makeForwardableApprovedProposal();
    const completed = launchBuilderMissionFromProposal(proposal);
    expect(completed.outcome).toBe("launched");
    if (completed.outcome !== "launched") return;

    expect(canRetryBuilderMission(proposal, completed.record)).toEqual({
      ok: false,
      reason: "not_retryable",
    });

    const failed = makeFailedMissionRecord(proposal);
    expect(canRetryBuilderMission(proposal, failed).ok).toBe(true);

    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({ confidence: 0.95, evidence: undefined }),
    );
    const policy = evaluateApprovalPolicy({ proposal: card });
    const blockedProposal = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );
    expect(canRetryBuilderMission(blockedProposal, failed)).toEqual({
      ok: false,
      reason: "not_forwardable",
    });
  });
});

describe("launchBuilderMissionFromProposal", () => {
  it("creates and completes a mission from an approved forwardable Builder proposal", () => {
    const proposal = makeForwardableApprovedProposal();
    const result = launchBuilderMissionFromProposal(proposal);

    expect(result.outcome).toBe("launched");
    if (result.outcome !== "launched") return;

    expect(result.record.status).toBe("completed");
    expect(result.record.attempt).toBe(1);
    expect(result.record.mission.proposalId).toBe(proposal.id);
    expect(result.record.mission.missionId).toBe(builderMissionIdForProposal(proposal.id));
    expect(result.record.mission.workStoryId).toBe(workStoryIdForProposal(proposal.id));
    expect(result.record.result?.status).toBe("completed");
    expect(result.record.result?.attempt).toBe(1);
    expect(result.steps?.queued.status).toBe("queued");
    expect(result.steps?.running.status).toBe("running");
    expect(result.steps?.final.status).toBe("completed");
  });

  it("does not launch a non-forwardable proposal", () => {
    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({ confidence: 0.5, evidence: { linkedPrId: 1 } }),
    );
    const policy = evaluateApprovalPolicy({ proposal: card });
    const proposal = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );

    const result = launchBuilderMissionFromProposal(proposal);
    expect(result).toEqual({ outcome: "blocked", reason: "not_forwardable" });
  });

  it("does not launch a rejected proposal", () => {
    const proposal = makeForwardableApprovedProposal({ status: "rejected" });
    const result = launchBuilderMissionFromProposal(proposal);
    expect(result).toEqual({ outcome: "blocked", reason: "not_approved" });
  });
});

describe("Builder mission lifecycle", () => {
  function makeMission(overrides: Partial<BuilderMission> = {}): BuilderMission {
    return {
      missionId: "mission-build-test",
      workStoryId: "ws-build-test",
      proposalId: "apr-build-mission-test",
      objective: "Apply the approved Builder change",
      acceptanceCriteria: ["Tests pass", "Lint clean"],
      context: { evidenceSummary: "PR 156" },
      createdAt: "2026-07-18T12:00:00.000Z",
      ...overrides,
    };
  }

  it("transitions queued → running → completed", () => {
    const steps = runBuilderMissionSteps(makeMission(), () => "2026-07-18T12:01:00.000Z");

    expect(steps.queued.status).toBe("queued");
    expect(steps.queued.attempt).toBe(1);
    expect(steps.running.status).toBe("running");
    expect(steps.running.startedAt).toBe("2026-07-18T12:01:00.000Z");
    expect(steps.final.status).toBe("completed");
    expect(steps.final.result?.status).toBe("completed");
    expect(steps.final.result?.artifacts?.branchName).toMatch(/^builder\//);
  });

  it("transitions queued → running → failed when the payload requests a fail path", () => {
    const mission = makeMission({
      objective: "Apply the approved Builder change [FAIL]",
    });
    expect(missionShouldFail(mission)).toBe(true);

    const steps = runBuilderMissionSteps(mission, () => "2026-07-18T12:02:00.000Z");

    expect(steps.queued.status).toBe("queued");
    expect(steps.running.status).toBe("running");
    expect(steps.final.status).toBe("failed");
    expect(steps.final.result?.status).toBe("failed");
    expect(steps.final.lastError).toBeTruthy();
    expect(steps.final.result?.artifacts?.failureReason).toBeTruthy();
  });

  it("startBuilderMission is a no-op unless status is queued", () => {
    const running = startBuilderMission(queueBuilderMission(makeMission()));
    const again = startBuilderMission(running);
    expect(again).toBe(running);
  });

  it("completeBuilderMission is a no-op unless status is running", () => {
    const queued = queueBuilderMission(makeMission());
    expect(completeBuilderMission(queued)).toBe(queued);
  });
});

describe("BuilderMissionResult shape", () => {
  it("is JSON-serializable and stable across round-trip", () => {
    const record = runBuilderMission(
      createBuilderMissionFromProposal(makeForwardableApprovedProposal()),
      () => "2026-07-18T12:03:00.000Z",
    );

    const json = JSON.stringify(record);
    const parsed = JSON.parse(json) as BuilderMissionRecord;

    expect(parsed.mission.missionId).toBe(record.mission.missionId);
    expect(parsed.status).toBe("completed");
    expect(parsed.attempt).toBe(1);
    expect(parsed.previousResults).toEqual([]);
    expect(parsed.result?.missionId).toBe(record.mission.missionId);
    expect(parsed.result?.attempt).toBe(1);
    expect(parsed.result?.artifacts?.testsSummary).toBeTruthy();
    expect(typeof parsed.mission.createdAt).toBe("string");
    expect(typeof parsed.createdAt).toBe("string");
    expect(typeof parsed.updatedAt).toBe("string");
  });

  it("failed results remain serializable including attempt history after retry prep", () => {
    const mission = createBuilderMissionFromProposal(
      makeForwardableApprovedProposal({
        recommendedAction: "Force a stub failure [FAIL]",
      }),
    );
    const record = runBuilderMission(mission, () => "2026-07-18T12:04:00.000Z");
    const prepared = prepareBuilderMissionRetry(record, "2026-07-18T12:05:00.000Z");
    const parsed = JSON.parse(JSON.stringify(prepared)) as BuilderMissionRecord;

    expect(parsed.status).toBe("queued");
    expect(parsed.attempt).toBe(2);
    expect(parsed.previousResults).toHaveLength(1);
    expect(parsed.previousResults[0]?.status).toBe("failed");
    expect(parsed.previousResults[0]?.failureReason).toBeTruthy();
  });
});

describe("queueBuilderMissionFromProposal (progressive UI path)", () => {
  it("returns a queued record without advancing to completed", () => {
    const proposal = makeForwardableApprovedProposal();
    const result = queueBuilderMissionFromProposal(proposal);

    expect(result.outcome).toBe("launched");
    if (result.outcome !== "launched") return;
    expect(result.record.status).toBe("queued");
    expect(result.record.attempt).toBe(1);
    expect(result.record.result).toBeUndefined();
  });

  it("still blocks non-forwardable proposals", () => {
    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({ confidence: 0.95, evidence: undefined }),
    );
    const policy = evaluateApprovalPolicy({ proposal: card });
    const proposal = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );

    expect(queueBuilderMissionFromProposal(proposal).outcome).toBe("blocked");
  });
});

describe("upsertBuilderMission", () => {
  it("inserts a new mission at the front", () => {
    const proposal = makeForwardableApprovedProposal();
    const queued = queueBuilderMission(createBuilderMissionFromProposal(proposal));
    const next = upsertBuilderMission([], queued);
    expect(next).toHaveLength(1);
    expect(next[0]?.status).toBe("queued");
  });

  it("replaces an existing mission by missionId so lifecycle updates don't duplicate", () => {
    const proposal = makeForwardableApprovedProposal();
    const queued = queueBuilderMission(createBuilderMissionFromProposal(proposal));
    const running = startBuilderMission(queued);
    const next = upsertBuilderMission([queued], running);

    expect(next).toHaveLength(1);
    expect(next[0]?.status).toBe("running");
    expect(next[0]?.mission.missionId).toBe(queued.mission.missionId);
  });
});

describe("evidence/approval policy still gates launch and retry", () => {
  it("approved + high confidence without evidence cannot launch", () => {
    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({
        confidence: 0.96,
        evidence: undefined,
      }),
    );
    const policy = evaluateApprovalPolicy({ proposal: card });
    const proposal = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );

    expect(policy.canApprove).toBe(false);
    expect(policy.missingSignals).toContain("high_confidence_without_evidence");
    expect(launchBuilderMissionFromProposal(proposal).outcome).toBe("blocked");
  });

  it("policy gating still blocks retry when ineligible", () => {
    const eligible = makeForwardableApprovedProposal({
      recommendedAction: "Force a stub failure [FAIL]",
    });
    const failed = launchBuilderMissionFromProposal(eligible);
    expect(failed.outcome).toBe("launched");
    if (failed.outcome !== "launched") return;

    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({
        confidence: 0.96,
        evidence: undefined,
      }),
    );
    const policy = evaluateApprovalPolicy({ proposal: card });
    const ineligible = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );

    const retry = retryBuilderMissionFromProposal(ineligible, [failed.record]);
    expect(retry).toEqual({ outcome: "blocked", reason: "not_forwardable" });
  });

  it("carries evidence summary into the mission context when launching", () => {
    const proposal = makeForwardableApprovedProposal();
    const result = launchBuilderMissionFromProposal(proposal);
    expect(result.outcome).toBe("launched");
    if (result.outcome !== "launched") return;

    expect(result.record.mission.context?.evidenceSummary).toContain("PR 156");
  });
});
