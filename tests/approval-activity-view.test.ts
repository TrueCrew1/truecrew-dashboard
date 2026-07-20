import { describe, expect, it } from "vitest";
import { MONITOR_PLATFORM_APPROVAL_ID } from "@/components/chief/monitorApprovalCards";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../lib/missions/types";
import type { ApprovalActivityRecord } from "../lib/approvals/types";
import type { ApprovalProposal } from "@/components/chief/types";
import {
  buildApprovalActivityItems,
  governedApprovalKindLabel,
  isGovernedApprovalProposal,
} from "@/lib/approvals/approvalActivityView";

function proposal(
  overrides: Partial<ApprovalProposal> & Pick<ApprovalProposal, "id" | "status">,
): ApprovalProposal {
  return {
    title: "Test approval",
    summary: "Summary text",
    recommendedAction: "Review",
    riskNote: "Low",
    createdAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function activityRecord(
  overrides: Partial<ApprovalActivityRecord> & Pick<ApprovalActivityRecord, "proposalId" | "decision">,
): ApprovalActivityRecord {
  return {
    title: "Decided approval",
    summary: "Decision summary",
    decidedAt: "2026-07-02T12:00:00.000Z",
    actor: "operator",
    recordedAt: "2026-07-02T12:00:01.000Z",
    ...overrides,
  };
}

describe("isGovernedApprovalProposal", () => {
  it("includes handoff, postmortem, and monitor platform cards", () => {
    expect(
      isGovernedApprovalProposal({
        id: "apr-research-psh-wf-1",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
        missionProjectId: "wf-1",
      }),
    ).toBe(true);
    expect(
      isGovernedApprovalProposal({
        id: "apr-research-incident-inc-1",
        missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
        missionProjectId: "inc-1",
      }),
    ).toBe(true);
    expect(
      isGovernedApprovalProposal({
        id: MONITOR_PLATFORM_APPROVAL_ID,
        missionKind: undefined,
        missionProjectId: undefined,
      }),
    ).toBe(true);
    expect(
      isGovernedApprovalProposal({
        id: "apr-demo-pr",
        missionKind: undefined,
        missionProjectId: undefined,
      }),
    ).toBe(false);
  });
});

describe("buildApprovalActivityItems", () => {
  it("limits to five rows with pending first then newest decided", () => {
    const approvals = [
      proposal({
        id: "apr-research-psh-old",
        status: "approved",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
        decidedAt: "2026-07-01T08:00:00.000Z",
        createdAt: "2026-07-01T07:00:00.000Z",
        title: "Old handoff",
      }),
      proposal({
        id: "apr-research-psh-pending-b",
        status: "pending",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
        createdAt: "2026-07-03T09:00:00.000Z",
        title: "Pending B",
      }),
      proposal({
        id: "apr-research-psh-pending-a",
        status: "pending",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
        createdAt: "2026-07-04T10:00:00.000Z",
        title: "Pending A",
      }),
      proposal({
        id: MONITOR_PLATFORM_APPROVAL_ID,
        status: "pending",
        createdAt: "2026-07-02T11:00:00.000Z",
        title: "Monitor platform",
      }),
      proposal({
        id: "apr-demo-pr",
        status: "pending",
        createdAt: "2026-07-05T10:00:00.000Z",
        title: "Demo PR",
      }),
    ];

    const vaultRecords = [
      activityRecord({
        proposalId: "apr-research-incident-inc-1",
        decision: "approved",
        missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
        decidedAt: "2026-07-02T15:00:00.000Z",
        title: "Postmortem decided",
      }),
      activityRecord({
        proposalId: "apr-research-psh-recent",
        decision: "rejected",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
        decidedAt: "2026-07-03T16:00:00.000Z",
        title: "Recent rejected",
      }),
      activityRecord({
        proposalId: "apr-demo-pr",
        decision: "approved",
        decidedAt: "2026-07-03T17:00:00.000Z",
        title: "Demo PR decided",
      }),
    ];

    const items = buildApprovalActivityItems({
      approvals,
      vaultRecords,
      sessionRecords: [],
      limit: 5,
    });

    expect(items.map((item) => item.proposalId)).toEqual([
      "apr-research-psh-pending-a",
      "apr-research-psh-pending-b",
      MONITOR_PLATFORM_APPROVAL_ID,
      "apr-research-psh-recent",
      "apr-research-incident-inc-1",
    ]);
    expect(items[0]?.isPending).toBe(true);
    expect(items[3]?.status).toBe("rejected");
  });

  it("prefers pending queue rows over vault history for the same proposal", () => {
    const approvals = [
      proposal({
        id: "apr-research-psh-wf-1",
        status: "pending",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
        createdAt: "2026-07-04T10:00:00.000Z",
        title: "Still pending",
      }),
    ];

    const items = buildApprovalActivityItems({
      approvals,
      vaultRecords: [
        activityRecord({
          proposalId: "apr-research-psh-wf-1",
          decision: "approved",
          missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
          decidedAt: "2026-07-01T10:00:00.000Z",
        }),
      ],
      sessionRecords: [],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.status).toBe("pending");
    expect(items[0]?.isPending).toBe(true);
  });

  it("merges session activity over older vault rows", () => {
    const items = buildApprovalActivityItems({
      approvals: [],
      vaultRecords: [
        activityRecord({
          proposalId: "apr-research-psh-wf-1",
          decision: "approved",
          missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
          decidedAt: "2026-07-01T10:00:00.000Z",
        }),
      ],
      sessionRecords: [
        activityRecord({
          proposalId: "apr-research-psh-wf-1",
          decision: "sent_back",
          missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
          decidedAt: "2026-07-02T10:00:00.000Z",
        }),
      ],
    });

    expect(items[0]?.status).toBe("sent_back");
  });
});

describe("governedApprovalKindLabel", () => {
  it("labels monitor platform approvals", () => {
    expect(
      governedApprovalKindLabel({
        id: MONITOR_PLATFORM_APPROVAL_ID,
        missionKind: undefined,
        missionProjectId: undefined,
      }),
    ).toBe("Monitor platform");
  });
});
