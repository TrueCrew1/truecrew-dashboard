import { describe, expect, it } from "vitest";
import {
  CHIEF_DEFAULT_LINE,
  deriveChiefDoingNow,
  deriveChiefOpsDeskSnapshot,
  formatChiefOperatorResponse,
} from "@/components/chief/chiefVoice";
import type { ApprovalProposal, ChiefBoardItem, ChiefResponse } from "@/components/chief/types";

function pendingProposal(overrides: Partial<ApprovalProposal> = {}): ApprovalProposal {
  return {
    id: "appr-1",
    title: "Release gate override",
    summary: "Override required gate for deploy.",
    recommendedAction: "Approve only if rollback is ready.",
    riskNote: "Production blast radius.",
    status: "pending",
    createdAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function blockedItem(overrides: Partial<ChiefBoardItem> = {}): ChiefBoardItem {
  return {
    id: "board-blocked-task-t1",
    lane: "blocked",
    title: "Paint booth PLC offline",
    detail: "Required gate failed.",
    routeTo: "/builds",
    routeLabel: "Builds",
    tone: "warn",
    ...overrides,
  };
}

describe("chiefVoice", () => {
  it("keeps the standing single-voice line", () => {
    expect(CHIEF_DEFAULT_LINE).toMatch(/single voice of the system/i);
    expect(CHIEF_DEFAULT_LINE).toMatch(/passes through him/i);
  });

  it("formats responses as Status → Recommendation → Next action", () => {
    const response: ChiefResponse = {
      summary: "2 open tasks. 1 blocked.",
      recommendedAction: "Clear the gate on task t1 first.",
      routedTo: "Chief",
      blockers: ["t1: QA gate open"],
    };

    const view = formatChiefOperatorResponse(response);
    expect(view.status).toBe(response.summary);
    expect(view.recommendation).toBe(response.recommendedAction);
    expect(view.nextAction).toBe(response.recommendedAction);
    expect(view.approvalRequest).toBeNull();
    expect(view.blockers).toEqual(["t1: QA gate open"]);
  });

  it("adds an approval request section when a gate is required", () => {
    const response: ChiefResponse = {
      summary: "Deploy candidate ready.",
      recommendedAction: "Hold for operator decision.",
      routedTo: "Chief",
      approvalNeeded: true,
      approvalPrompt: "Confirm release to production.",
      riskNote: "Irreversible without rollback.",
      approvalPacket: {
        recommendation: "Hold — verify rollback first.",
        riskLevel: "high",
        rationale: "Production deploy.",
        evidence: ["CI green"],
        nextAction: "Open Approvals and decide.",
        improvementsMade: ["Bundled related gate checks"],
      },
    };

    const view = formatChiefOperatorResponse(response);
    expect(view.nextAction).toBe("Open Approvals and decide.");
    expect(view.approvalRequest).not.toBeNull();
    expect(view.approvalRequest?.prompt).toBe("Confirm release to production.");
    expect(view.approvalRequest?.riskLevel).toBe("high");
    expect(view.approvalRequest?.improvementsMade).toContain("Bundled related gate checks");
  });

  it("derives doing-now with approval over blocker over idle", () => {
    expect(
      deriveChiefDoingNow({
        isProcessing: true,
        pendingApprovals: [],
        blockedItems: [],
      }).label,
    ).toBe("Routing");

    expect(
      deriveChiefDoingNow({
        pendingApprovals: [pendingProposal()],
        blockedItems: [blockedItem()],
      }),
    ).toMatchObject({
      label: "Holding for approval",
      detail: "Release gate override",
      tone: "critical",
    });

    expect(
      deriveChiefDoingNow({
        pendingApprovals: [],
        blockedItems: [blockedItem()],
      }),
    ).toMatchObject({
      label: "Tracking blocker",
      detail: "Paint booth PLC offline",
      tone: "warn",
    });

    expect(
      deriveChiefDoingNow({
        pendingApprovals: [],
        blockedItems: [],
      }),
    ).toMatchObject({
      label: "Monitoring queue",
      tone: "neutral",
    });
  });

  it("builds an ops-desk snapshot with queue, active, blocker, and next action", () => {
    const older = pendingProposal({
      id: "appr-old",
      title: "Older approval",
      createdAt: "2026-07-19T08:00:00.000Z",
    });
    const newer = pendingProposal({
      id: "appr-new",
      title: "Newer approval",
      createdAt: "2026-07-21T08:00:00.000Z",
    });

    const snapshot = deriveChiefOpsDeskSnapshot({
      pendingApprovals: [newer, older],
      blockedItems: [blockedItem()],
    });

    expect(snapshot.queueCount).toBe(2);
    expect(snapshot.activeTask).toBe("Older approval");
    expect(snapshot.activeTaskId).toBe("appr-old");
    expect(snapshot.blocker).toBe("Paint booth PLC offline");
    expect(snapshot.nextAction).toMatch(/oldest pending approval/i);
    expect(snapshot.nextActionTone).toBe("critical");
  });

  it("recommends clearing a blocker when the approval queue is empty", () => {
    const snapshot = deriveChiefOpsDeskSnapshot({
      pendingApprovals: [],
      blockedItems: [blockedItem()],
    });

    expect(snapshot.queueCount).toBe(0);
    expect(snapshot.activeTask).toBeNull();
    expect(snapshot.nextAction).toMatch(/Clear blocker/i);
    expect(snapshot.nextActionTone).toBe("warn");
  });
});
