import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatGovernedApprovalCreatedMessage,
  formatGovernedApprovalUpdatedMessage,
  formatGovernedMissionStatusMessage,
  formatMonitorStateMessage,
  governedLoopSlack,
  isGovernedChiefApproval,
  scheduleGovernedApprovalUpdatedSlack,
  scheduleGovernedMissionSlack,
} from "../lib/governedLoopSlack.js";
import {
  RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
  RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
} from "../lib/missions/types.js";

describe("governedLoopSlack", () => {
  const originalWebhook = process.env.SLACK_WEBHOOK_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.SLACK_WEBHOOK_URL = originalWebhook;
    vi.unstubAllGlobals();
  });

  it("no-ops when SLACK_WEBHOOK_URL is unset", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    await governedLoopSlack("test");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts JSON text payload to the webhook", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    await governedLoopSlack("hello");

    expect(fetchMock).toHaveBeenCalledWith("https://hooks.slack.com/services/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });
  });

  it("swallows fetch errors without throwing", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
    fetchMock.mockRejectedValue(new Error("network down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(governedLoopSlack("hello")).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("governed loop message formatters", () => {
  it("detects governed approvals", () => {
    expect(
      isGovernedChiefApproval({
        proposalId: "apr-research-psh-abc",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
      }),
    ).toBe(true);
    expect(
      isGovernedChiefApproval({
        proposalId: "apr-monitor-platform-deadbeef",
      }),
    ).toBe(true);
    expect(
      isGovernedChiefApproval({
        proposalId: "apr-pr-demo",
      }),
    ).toBe(false);
  });

  it("formats approval created and updated messages", () => {
    expect(
      formatGovernedApprovalCreatedMessage({
        approvalId: "apr-1",
        missionKind: RESEARCH_MONITOR_INCIDENT_POSTMORTEM_KIND,
        missionProjectId: "inc-42",
      }),
    ).toBe(
      "Chief approval created: apr-1 (research:monitor-incident-postmortem) for incident inc-42.",
    );

    expect(
      formatGovernedApprovalUpdatedMessage({
        approvalId: "apr-1",
        status: "approved",
        missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
      }),
    ).toBe(
      "Chief approval updated: apr-1 is approved (kind=research:project-summary-handoff, incident=n/a).",
    );
  });

  it("formats mission and monitor messages", () => {
    expect(
      formatGovernedMissionStatusMessage({
        missionId: "psh-1",
        status: "running",
        approvalId: "apr-1",
      }),
    ).toBe("Governed mission psh-1 status: running (approval=apr-1, result=none).");

    expect(
      formatMonitorStateMessage({
        state: "degraded",
        probeId: "vercel",
        incidentId: "inc-9",
      }),
    ).toBe("Monitor state: degraded (probe=vercel, incident=inc-9).");
  });
});

describe("schedule helpers", () => {
  const originalWebhook = process.env.SLACK_WEBHOOK_URL;

  beforeEach(() => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }),
    );
  });

  afterEach(() => {
    process.env.SLACK_WEBHOOK_URL = originalWebhook;
    vi.unstubAllGlobals();
  });

  it("schedules governed approval updates only for governed cards", async () => {
    scheduleGovernedApprovalUpdatedSlack({
      approvalId: "apr-pr-demo",
      status: "approved",
    });
    scheduleGovernedApprovalUpdatedSlack({
      approvalId: "apr-research-psh-abc",
      status: "rejected",
      missionKind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body).toContain(
      "Chief approval updated",
    );
  });

  it("schedules mission status posts for governed mission kinds", async () => {
    scheduleGovernedMissionSlack({
      id: "psh-1",
      kind: RESEARCH_PROJECT_SUMMARY_HANDOFF_KIND,
      status: "running",
      proposalId: "apr-1",
      projectId: "wf-1",
      projectTitle: "Test",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body).toContain(
      "Governed mission psh-1 status: running",
    );
  });
});
