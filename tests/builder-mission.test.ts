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
  completeBuilderMission,
  createBuilderMissionFromProposal,
  launchBuilderMissionFromProposal,
  missionShouldFail,
  queueBuilderMission,
  runBuilderMission,
  runBuilderMissionSteps,
  startBuilderMission,
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

describe("launchBuilderMissionFromProposal", () => {
  it("creates and completes a mission from an approved forwardable Builder proposal", () => {
    const proposal = makeForwardableApprovedProposal();
    const result = launchBuilderMissionFromProposal(proposal);

    expect(result.outcome).toBe("launched");
    if (result.outcome !== "launched") return;

    expect(result.record.status).toBe("completed");
    expect(result.record.mission.proposalId).toBe(proposal.id);
    expect(result.record.mission.missionId).toBe(builderMissionIdForProposal(proposal.id));
    expect(result.record.mission.workStoryId).toBe(workStoryIdForProposal(proposal.id));
    expect(result.record.result?.status).toBe("completed");
    expect(result.steps.queued.status).toBe("queued");
    expect(result.steps.running.status).toBe("running");
    expect(result.steps.final.status).toBe("completed");
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
    expect(parsed.result?.missionId).toBe(record.mission.missionId);
    expect(parsed.result?.artifacts?.testsSummary).toBeTruthy();
    expect(typeof parsed.mission.createdAt).toBe("string");
    expect(typeof parsed.updatedAt).toBe("string");
  });

  it("failed results remain serializable", () => {
    const mission = createBuilderMissionFromProposal(
      makeForwardableApprovedProposal({
        recommendedAction: "Force a stub failure [FAIL]",
      }),
    );
    const record = runBuilderMission(mission, () => "2026-07-18T12:04:00.000Z");
    const parsed = JSON.parse(JSON.stringify(record)) as BuilderMissionRecord;

    expect(parsed.status).toBe("failed");
    expect(parsed.result?.status).toBe("failed");
    expect(parsed.result?.artifacts?.failureReason).toBeTruthy();
  });
});

describe("evidence/approval policy still gates launch", () => {
  it("approved + high confidence without evidence cannot launch", () => {
    const card = createApprovalCardFromBuildRequest(
      makeBuildRequest({
        confidence: 0.96,
        evidence: undefined,
      }),
    );
    // Even if an operator somehow approved, policy disposition blocks launch.
    const policy = evaluateApprovalPolicy({ proposal: card });
    const proposal = applyPolicyToProposal(
      { ...card, status: "approved" },
      policy,
    );

    expect(policy.canApprove).toBe(false);
    expect(policy.missingSignals).toContain("high_confidence_without_evidence");
    expect(launchBuilderMissionFromProposal(proposal).outcome).toBe("blocked");
  });

  it("carries evidence summary into the mission context when launching", () => {
    const proposal = makeForwardableApprovedProposal();
    const result = launchBuilderMissionFromProposal(proposal);
    expect(result.outcome).toBe("launched");
    if (result.outcome !== "launched") return;

    expect(result.record.mission.context?.evidenceSummary).toContain("PR 156");
  });
});
