import { describe, expect, it } from "vitest";
import {
  buildDailyTurnoverSnapshot,
  countApprovedActivity24h,
  formatDailyTurnoverSlackMessage,
  TURNOVER_PREFIX,
} from "../lib/chief/dailyTurnover.js";
import type { ApprovalActivityRecord } from "../lib/approvals/types.js";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../lib/missions/types.js";

const GENERATED_AT = "2026-07-20T12:00:00.000Z";

function makeVaultRecord(
  overrides: Partial<ApprovalActivityRecord> = {},
): ApprovalActivityRecord {
  return {
    proposalId: "apr-research-psh-wf-1",
    title: "Project handoff",
    summary: "summary",
    decision: "approved",
    decidedAt: "2026-07-20T10:00:00.000Z",
    actor: "founder",
    recordedAt: "2026-07-20T10:00:00.000Z",
    missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    ...overrides,
  };
}

describe("dailyTurnover", () => {
  it("counts governed approved activity within the window", () => {
    const count = countApprovedActivity24h({
      generatedAt: GENERATED_AT,
      windowHours: 24,
      vaultRecords: [
        makeVaultRecord(),
        makeVaultRecord({
          proposalId: "apr-research-incident-inc-1",
          missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
          decidedAt: "2026-07-19T08:00:00.000Z",
        }),
        makeVaultRecord({
          proposalId: "apr-unrelated",
          missionKind: undefined,
        }),
      ],
      supabaseDecisions: [
        {
          proposalId: "apr-monitor-platform-vercel",
          status: "approved",
          decidedAt: "2026-07-20T11:00:00.000Z",
        },
      ],
    });

    expect(count).toBe(2);
  });

  it("formats a turnover Slack message with required sections", () => {
    const snapshot = buildDailyTurnoverSnapshot({
      generatedAt: GENERATED_AT,
      windowHours: 24,
      vaultRecords: [makeVaultRecord()],
      supabaseDecisions: [],
      missions: [
        {
          id: "psh-1",
          kind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
          status: "failed",
          projectId: "wf-1",
          projectTitle: "Build",
          proposalId: "apr-research-psh-wf-1",
          createdAt: "2026-07-20T09:00:00.000Z",
          updatedAt: "2026-07-20T09:30:00.000Z",
        },
        {
          id: "mip-1",
          kind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
          status: "queued",
          incidentId: "inc-1",
          incidentTitle: "Outage",
          serviceName: "dispatch",
          proposalId: "apr-research-incident-inc-1",
          createdAt: "2026-07-20T08:00:00.000Z",
          updatedAt: "2026-07-20T08:00:00.000Z",
        },
      ],
      health: {
        vault: "configured",
        supabase: "configured",
        slackWebhook: "configured",
        githubWebhook: "not configured",
        repoHealth: "not yet wired",
      },
      dataNotes: ["vault activity unreadable: example"],
    });

    const message = formatDailyTurnoverSlackMessage(snapshot);

    expect(message.startsWith(`${TURNOVER_PREFIX} Chief daily turnover`)).toBe(true);
    expect(message).toContain("Approved activity (24h): 1");
    expect(message).toContain("Failed/blocked missions (24h): 1");
    expect(message).toContain("Pending approvals: n/a");
    expect(message).toContain("Queued missions (awaiting run): 1");
    expect(message).toContain("Integration health:");
    expect(message).toContain("- repo health: not yet wired");
    expect(message).toContain(GENERATED_AT);
    expect(message).toContain("Data notes: vault activity unreadable: example");
  });
});
