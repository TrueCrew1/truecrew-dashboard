import { describe, expect, it } from "vitest";
import { mockData } from "../src/data/mockData";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
} from "../src/components/chief/chiefLiveContext";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../lib/missions/types";

describe("deriveApprovalCandidates (operator path)", () => {
  it("emits executable Research cards from real incidents/workflows when present", () => {
    const ctx = buildChiefLiveContext(mockData);
    const proposals = deriveApprovalCandidates(mockData, ctx);

    const stubs = proposals.filter((p) => p.workTruth === "stub");
    expect(stubs).toHaveLength(0);

    const postmortems = proposals.filter(
      (p) => p.missionKind === RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
    );
    const handoffs = proposals.filter(
      (p) => p.missionKind === RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    );

    // Mock data may or may not include a Sev1–2 without repair / In Progress workflow.
    for (const card of [...postmortems, ...handoffs]) {
      expect(card.workTruth).toBe("executable");
      expect(card.missionProjectId).toBeTruthy();
    }

    for (const card of proposals.filter((p) => p.workTruth === "grounded")) {
      expect(card.missionKind).toBeUndefined();
    }
  });

  it("does not invent customer/focus/overdue/alert approval cards", () => {
    const ctx = buildChiefLiveContext(mockData);
    const proposals = deriveApprovalCandidates(mockData, ctx);
    const banned = new Set([
      "onboarding",
      "customer_link",
      "workflow_link",
      "focus_escalation",
      "overdue_review",
      "alert_action",
    ]);
    for (const proposal of proposals) {
      if (proposal.category) {
        expect(banned.has(proposal.category)).toBe(false);
      }
    }
  });
});
