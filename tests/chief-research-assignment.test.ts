import { describe, expect, it, beforeEach } from "vitest";
import {
  buildResearchAssignment,
  detectResearchAssignmentLane,
  extractResearchAssignmentTopic,
  matchResearchAssignmentIntent,
} from "@/lib/chief/researchAssignment";
import {
  buildResearchAssignmentGlobalRefusal,
  buildResearchAssignmentResponse,
} from "@/components/chief/chiefResearchAssignment";
import { buildApprovalFromResponse } from "@/components/chief/chiefMock";
import { runResearchAssignmentDispatch } from "@/components/chief/researchAssignmentDispatch";
import {
  completeResearchAssignmentWithControlledResult,
  failResearchAssignment,
  getResearchAssignment,
  getResearchAssignmentAudits,
  resetResearchAssignmentStoreForTests,
  sendResearchAssignment,
  upsertResearchAssignment,
} from "@/components/chief/researchAssignmentStore";
import { deriveApprovalExecutionFeedback } from "@/components/chief/approvalExecutionFeedback";
import { deriveResearchAssignmentWorkItems } from "@/components/chief/researchAssignmentWorkItems";
import {
  formatResearchAssignmentAuditNote,
  formatResearchAssignmentBoardLine,
  resolveLiveResearchAssignment,
} from "@/components/chief/researchAssignmentView";
import { RESEARCH_ASSIGNMENT_DISPATCH_KIND } from "@/components/chief/types";
import { getProjectToolScope, KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID } from "@/data/projects";

describe("research assignment dispatch lane", () => {
  const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;

  beforeEach(() => {
    resetResearchAssignmentStoreForTests();
  });

  it("detects research intents without stealing unrelated commands", () => {
    expect(matchResearchAssignmentIntent("Research competitors for this project")).toBe(true);
    expect(matchResearchAssignmentIntent("Create a research assignment for crew intake")).toBe(
      true,
    );
    expect(matchResearchAssignmentIntent("Send research on ops friction")).toBe(true);
    expect(matchResearchAssignmentIntent("List open PRs on GitHub")).toBe(false);
    expect(matchResearchAssignmentIntent("What is at risk today?")).toBe(false);
  });

  it("builds a project-scoped ready assignment with lane + topic", () => {
    expect(detectResearchAssignmentLane("Research competitors for this project")).toBe(
      "competitive",
    );
    expect(extractResearchAssignmentTopic("Research competitors for this project")).toMatch(
      /competitor/i,
    );

    const response = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
      now: new Date("2026-07-23T12:00:00.000Z"),
    });
    expect(response.approvalNeeded).toBe(true);
    expect(response.researchAssignment?.status).toBe("ready");
    expect(response.researchAssignment?.projectId).toBe(MS_PAINTING_PROJECT_ID);
    expect(response.researchAssignment?.dispatchMode).toBe("local_controlled");
    expect(response.summary).toMatch(/Not sent yet/i);
    expect(response.summary).toMatch(/local_controlled/i);
    expect(response.summary).not.toMatch(/\bstub\b/i);

    const card = buildApprovalFromResponse("Research competitors for this project", response);
    expect(card?.missionKind).toBe(RESEARCH_ASSIGNMENT_DISPATCH_KIND);
    expect(card?.researchAssignment?.id).toBe(response.researchAssignment?.id);
    expect(
      card?.checklist?.some((item) => /local_controlled/i.test(item.label)),
    ).toBe(true);
  });

  it("refuses Global cleanly", () => {
    const refusal = buildResearchAssignmentGlobalRefusal();
    expect(refusal.approvalNeeded).toBeFalsy();
    expect(refusal.summary).toMatch(/Select a project/i);
  });

  it("records full audit metadata across create → send → complete", () => {
    const response = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
      now: new Date("2026-07-23T12:00:00.000Z"),
    });
    const assignmentId = response.researchAssignment!.id;
    const createdAudits = getResearchAssignmentAudits(assignmentId);
    expect(createdAudits[0]).toMatchObject({
      action: "created",
      projectId: MS_PAINTING_PROJECT_ID,
      projectName: "M&S Painting",
      researcherLane: "competitive",
      dispatchMode: "local_controlled",
      requestedOutput: expect.stringMatching(/competitive/i),
      topic: expect.stringMatching(/competitor/i),
    });

    upsertResearchAssignment(response.researchAssignment!);
    expect(getResearchAssignmentAudits(assignmentId).filter((a) => a.action === "created")).toHaveLength(
      1,
    );

    const proposal = buildApprovalFromResponse("Research competitors for this project", response)!;
    const dispatch = runResearchAssignmentDispatch({ proposal });
    expect(dispatch.handled && dispatch.ok).toBe(true);

    const sentAudit = getResearchAssignmentAudits(assignmentId).find((a) => a.action === "sent");
    expect(sentAudit).toMatchObject({
      status: "sent",
      dispatchMode: "local_controlled",
      researcherLane: "competitive",
      detail: expect.stringMatching(/no live researcher backend/i),
    });

    const completed = completeResearchAssignmentWithControlledResult({
      assignmentId,
      now: new Date("2026-07-23T13:00:00.000Z"),
    });
    expect(completed.ok && completed.kind).toBe("completed");
    expect(completed.ok && completed.message).toMatch(/Controlled \/ local/i);
    expect(completed.ok && completed.message).not.toMatch(/\bstub\b/i);

    const completeAudit = getResearchAssignmentAudits(assignmentId).find(
      (a) => a.action === "completed",
    );
    expect(completeAudit).toMatchObject({
      status: "completed",
      resultSource: "controlled_local",
      resultSummary: expect.stringMatching(/Controlled\/local/i),
      completedAt: "2026-07-23T13:00:00.000Z",
    });
  });

  it("blocks duplicate send/complete and invalid transitions", () => {
    const response = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
    });
    const proposal = buildApprovalFromResponse("Research competitors for this project", response)!;
    const assignmentId = proposal.researchAssignment!.id;

    expect(runResearchAssignmentDispatch({ proposal }).handled).toBe(true);
    const duplicateSend = sendResearchAssignment({ assignmentId });
    expect(duplicateSend.ok && duplicateSend.kind).toBe("duplicate_skipped");

    const completeBeforeSend = completeResearchAssignmentWithControlledResult({
      assignmentId: "missing",
    });
    expect(completeBeforeSend.ok).toBe(false);

    const readyOnly = buildResearchAssignmentResponse({
      scope,
      command: "Create a research assignment for customer intake",
    });
    const readyId = readyOnly.researchAssignment!.id;
    const invalidComplete = completeResearchAssignmentWithControlledResult({
      assignmentId: readyId,
    });
    expect(invalidComplete.ok).toBe(false);
    expect(invalidComplete.message).toMatch(/send first/i);

    const completed = completeResearchAssignmentWithControlledResult({ assignmentId });
    expect(completed.ok && completed.kind).toBe("completed");
    const priorResult = completed.ok ? completed.assignment.result : null;

    const duplicateComplete = completeResearchAssignmentWithControlledResult({ assignmentId });
    expect(duplicateComplete.ok && duplicateComplete.kind).toBe("duplicate_skipped");
    expect(duplicateComplete.ok && duplicateComplete.assignment.result).toEqual(priorResult);

    const failCompleted = failResearchAssignment({
      assignmentId,
      error: "should not overwrite",
    });
    expect(failCompleted.ok).toBe(false);
    expect(failCompleted.message).toMatch(/completed/i);
  });

  it("reuses live store truth when the same research command is asked again", () => {
    const first = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
    });
    const proposal = buildApprovalFromResponse("Research competitors for this project", first)!;
    runResearchAssignmentDispatch({ proposal });
    completeResearchAssignmentWithControlledResult({
      assignmentId: proposal.researchAssignment!.id,
      now: new Date("2026-07-23T15:00:00.000Z"),
    });

    const again = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
    });
    expect(again.approvalNeeded).toBeFalsy();
    expect(again.researchAssignment?.status).toBe("completed");
    expect(again.summary).toMatch(/already complete/i);
    expect(again.summary).not.toMatch(/Not sent yet/i);
    expect(again.summary).not.toMatch(/\bstub\b/i);
  });

  it("keeps live status consistent across board/audit/feedback surfaces", () => {
    const response = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
    });
    const proposal = buildApprovalFromResponse("Research competitors for this project", response)!;
    const seed = proposal.researchAssignment!;

    expect(formatResearchAssignmentBoardLine(seed)).toMatch(/Ready to send|approve to send/i);

    runResearchAssignmentDispatch({ proposal });
    const liveSent = resolveLiveResearchAssignment(seed)!;
    expect(liveSent.status).toBe("sent");
    expect(formatResearchAssignmentBoardLine(seed)).toMatch(/Sent \(local\)/i);

    const sentFeedback = deriveApprovalExecutionFeedback({
      proposal: { ...proposal, status: "approved" },
      liveApiEnabled: false,
    });
    expect(sentFeedback?.kind).toBe("research_assignment_sent");

    completeResearchAssignmentWithControlledResult({
      assignmentId: seed.id,
      now: new Date("2026-07-23T14:00:00.000Z"),
    });
    const liveDone = resolveLiveResearchAssignment(seed)!;
    expect(liveDone.status).toBe("completed");
    expect(formatResearchAssignmentAuditNote(liveDone)).toMatch(/Controlled \/ local/i);

    // Stale proposal snapshot must still resolve to completed via live store.
    const staleSeed = { ...seed, status: "ready" as const, result: undefined };
    expect(resolveLiveResearchAssignment(staleSeed)?.status).toBe("completed");
    expect(formatResearchAssignmentBoardLine(staleSeed)).toMatch(/Completed/i);

    const workItems = deriveResearchAssignmentWorkItems([staleSeed]);
    expect(workItems[0]?.status).toBe("completed");
    expect(workItems[0]?.note).toMatch(/Controlled \/ local/i);

    const doneFeedback = deriveApprovalExecutionFeedback({
      proposal: {
        ...proposal,
        status: "approved",
        researchAssignment: staleSeed,
      },
      liveApiEnabled: false,
    });
    expect(doneFeedback?.kind).toBe("research_assignment_completed");
    expect(doneFeedback?.message).toMatch(/Workflow complete/i);
  });

  it("does not pretend a live backend exists when building from helpers", () => {
    const assignment = buildResearchAssignment({
      scope,
      command: "Create a research assignment for customer intake",
      assignmentId: "ra-test",
    });
    expect(assignment.researcherLane).toBe("customer");
    expect(assignment.dispatchMode).toBe("local_controlled");
    expect(assignment.status).toBe("ready");
  });

  it("seeds the live store from a proposal snapshot and validates dispatch inputs", () => {
    const response = buildResearchAssignmentResponse({
      scope,
      command: "Research competitors for this project",
    });
    const proposal = buildApprovalFromResponse("Research competitors for this project", response)!;
    const seed = { ...proposal.researchAssignment! };

    resetResearchAssignmentStoreForTests();
    expect(getResearchAssignment(seed.id)).toBeNull();

    const dispatch = runResearchAssignmentDispatch({ proposal: { ...proposal, researchAssignment: seed } });
    expect(dispatch.handled && dispatch.ok).toBe(true);
    expect(dispatch.handled && dispatch.kind).toBe("sent");
    expect(getResearchAssignment(seed.id)?.status).toBe("sent");
    expect(resolveLiveResearchAssignment(seed)?.status).toBe("sent");

    const duplicate = runResearchAssignmentDispatch({
      proposal: { ...proposal, researchAssignment: seed },
    });
    expect(duplicate.handled && duplicate.kind).toBe("duplicate_skipped");
    expect(duplicate.handled && duplicate.message).toMatch(/duplicate/i);

    const badScope = runResearchAssignmentDispatch({
      proposal: {
        ...proposal,
        missionProjectId: "other-project",
        researchAssignment: seed,
      },
    });
    expect(badScope.handled && badScope.ok).toBe(false);
    expect(badScope.handled && badScope.message).toMatch(/scope mismatch/i);

    const missingId = runResearchAssignmentDispatch({
      proposal: {
        ...proposal,
        researchAssignment: { ...seed, id: "   " },
      },
    });
    expect(missingId.handled && missingId.ok).toBe(false);
    expect(missingId.handled && missingId.message).toMatch(/missing id/i);

    const emptySend = sendResearchAssignment({ assignmentId: "" });
    expect(emptySend.ok).toBe(false);
    expect(emptySend.message).toMatch(/id is required/i);
  });
});
