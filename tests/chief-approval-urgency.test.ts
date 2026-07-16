import { describe, expect, it } from "vitest";
import {
  compareApprovalsByAge,
  formatApprovalPendingSummary,
  getApprovalUrgencyBadge,
  getUrgency,
  summarizePendingApprovalUrgency,
} from "@/components/chief/chiefApprovalUrgency";
import type { ApprovalProposal } from "@/components/chief/types";

const NOW = new Date("2026-07-08T12:00:00.000Z");

function hoursAgo(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function makeProposal(overrides: Partial<ApprovalProposal> = {}): ApprovalProposal {
  return {
    id: "p-1",
    title: "Override CI gate",
    summary: "",
    recommendedAction: "",
    riskNote: "",
    status: "pending",
    createdAt: hoursAgo(1),
    ...overrides,
  };
}

describe("getUrgency", () => {
  it("returns recent for a missing or unparsable timestamp", () => {
    expect(getUrgency(null, NOW)).toBe("recent");
    expect(getUrgency(undefined, NOW)).toBe("recent");
    expect(getUrgency("not-a-date", NOW)).toBe("recent");
  });

  it("returns recent below the due-soon threshold", () => {
    expect(getUrgency(hoursAgo(23), NOW)).toBe("recent");
  });

  it("returns dueSoon at the 24h threshold", () => {
    expect(getUrgency(hoursAgo(24), NOW)).toBe("dueSoon");
  });

  it("returns overdue past 48h", () => {
    expect(getUrgency(hoursAgo(49), NOW)).toBe("overdue");
  });

  it("treats exactly 48h as dueSoon (boundary is exclusive)", () => {
    expect(getUrgency(hoursAgo(48), NOW)).toBe("dueSoon");
  });
});

describe("formatApprovalPendingSummary", () => {
  it("shows only the pending count when nothing is overdue", () => {
    expect(formatApprovalPendingSummary(3, 0)).toBe("Pending 3");
  });

  it("appends the overdue count when present", () => {
    expect(formatApprovalPendingSummary(3, 2)).toBe("Pending 3 · 2 overdue");
  });
});

describe("getApprovalUrgencyBadge", () => {
  it("returns null for decided proposals", () => {
    expect(
      getApprovalUrgencyBadge({ status: "approved", createdAt: hoursAgo(72) }, NOW),
    ).toBeNull();
  });

  it("returns null for recent pending proposals", () => {
    expect(getApprovalUrgencyBadge({ status: "pending", createdAt: hoursAgo(1) }, NOW)).toBeNull();
  });

  it("returns a due-soon badge without escalation", () => {
    const badge = getApprovalUrgencyBadge({ status: "pending", createdAt: hoursAgo(30) }, NOW);
    expect(badge).toMatchObject({
      urgency: "dueSoon",
      label: "Due soon",
      badgeClass: "badge-yellow",
      escalate: false,
    });
  });

  it("returns an overdue badge flagged for escalation", () => {
    const badge = getApprovalUrgencyBadge({ status: "pending", createdAt: hoursAgo(72) }, NOW);
    expect(badge).toMatchObject({
      urgency: "overdue",
      label: "Overdue",
      badgeClass: "badge-red",
      escalate: true,
    });
  });
});

describe("compareApprovalsByAge", () => {
  it("orders oldest pending first", () => {
    const list = [
      makeProposal({ id: "new", createdAt: hoursAgo(1) }),
      makeProposal({ id: "old", createdAt: hoursAgo(50) }),
    ];
    list.sort(compareApprovalsByAge);
    expect(list.map((p) => p.id)).toEqual(["old", "new"]);
  });
});

describe("summarizePendingApprovalUrgency", () => {
  it("buckets pending proposals by urgency and ignores decided ones", () => {
    const approvals = [
      makeProposal({ id: "1", createdAt: hoursAgo(1) }),
      makeProposal({ id: "2", createdAt: hoursAgo(30) }),
      makeProposal({ id: "3", createdAt: hoursAgo(72) }),
      makeProposal({ id: "4", status: "approved", createdAt: hoursAgo(72) }),
    ];
    expect(summarizePendingApprovalUrgency(approvals, NOW)).toEqual({
      pending: 3,
      dueSoon: 1,
      overdue: 1,
    });
  });
});
