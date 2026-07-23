import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isObsidianProjectNoteDraftProposal,
  runObsidianProjectNoteDraftWrite,
} from "@/components/chief/obsidianProjectNoteDraftWrite";
import { buildObsidianNoteDraftResponse } from "@/components/chief/chiefObsidianNoteDraft";
import { buildApprovalFromResponse } from "@/components/chief/chiefMock";
import { OBSIDIAN_PROJECT_NOTE_DRAFT_KIND } from "@/components/chief/types";
import { resetProjectToolMutationRegistryForTests } from "@/components/chief/chiefProjectToolMutation";
import { runApprovedProjectToolDraftMutation } from "@/components/chief/runApprovedProjectToolDraftMutation";
import { deriveApprovalExecutionFeedback } from "@/components/chief/approvalExecutionFeedback";
import { getProjectToolScope, KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID } from "@/data/projects";
import * as apiClient from "@/lib/api/client";

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof apiClient>("@/lib/api/client");
  return {
    ...actual,
    writeObsidianProjectNote: vi.fn(),
  };
});

describe("runObsidianProjectNoteDraftWrite (shared home/panel path)", () => {
  const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;
  const response = buildObsidianNoteDraftResponse({
    scope,
    command: "Draft Obsidian note about crew roster",
    now: new Date("2026-07-23T12:00:00.000Z"),
  });
  const proposal = buildApprovalFromResponse("Draft Obsidian note about crew roster", response)!;

  beforeEach(() => {
    resetProjectToolMutationRegistryForTests();
    vi.mocked(apiClient.writeObsidianProjectNote).mockReset();
  });

  it("recognizes Obsidian draft proposals", () => {
    expect(proposal.missionKind).toBe(OBSIDIAN_PROJECT_NOTE_DRAFT_KIND);
    expect(isObsidianProjectNoteDraftProposal(proposal)).toBe(true);
    expect(
      isObsidianProjectNoteDraftProposal({
        ...proposal,
        missionKind: undefined,
        obsidianNoteDraft: undefined,
      }),
    ).toBe(false);
  });

  it("skips vault write when live API is off and records audit", async () => {
    const outcome = await runObsidianProjectNoteDraftWrite({
      proposal,
      liveApi: false,
    });
    expect(outcome).toMatchObject({
      handled: true,
      ok: true,
      status: "skipped_offline",
    });
    expect(outcome.handled && outcome.audit.projectId).toBe(MS_PAINTING_PROJECT_ID);
    expect(outcome.handled && outcome.audit.target).toContain("Projects/M&S Painting");
    expect(outcome.handled && outcome.message).toMatch(/live API off/i);
    expect(apiClient.writeObsidianProjectNote).not.toHaveBeenCalled();
  });

  it("writes under the draft scope prefix when live API is on", async () => {
    vi.mocked(apiClient.writeObsidianProjectNote).mockResolvedValue({
      ok: true,
      relativePath: proposal.obsidianNoteDraft!.targetPath,
    });

    const outcome = await runObsidianProjectNoteDraftWrite({
      proposal,
      liveApi: true,
    });

    expect(outcome).toMatchObject({
      handled: true,
      ok: true,
      status: "executed",
      message: `Wrote Obsidian note to ${proposal.obsidianNoteDraft!.targetPath}`,
    });
    expect(apiClient.writeObsidianProjectNote).toHaveBeenCalledWith({
      relativePath: proposal.obsidianNoteDraft!.targetPath,
      content: proposal.obsidianNoteDraft!.body,
      allowedPrefixes: [proposal.obsidianNoteDraft!.scopePrefix],
    });
  });

  it("surfaces write failures without claiming success", async () => {
    vi.mocked(apiClient.writeObsidianProjectNote).mockResolvedValue({
      ok: false,
      error: "path outside scope",
    });

    const outcome = await runObsidianProjectNoteDraftWrite({
      proposal,
      liveApi: true,
    });

    expect(outcome).toMatchObject({ handled: true, ok: false, status: "failed" });
    expect(outcome.handled && outcome.message).toMatch(/vault write failed/i);
  });

  it("skips duplicate execution after a successful write", async () => {
    vi.mocked(apiClient.writeObsidianProjectNote).mockResolvedValue({
      ok: true,
      relativePath: proposal.obsidianNoteDraft!.targetPath,
    });

    const first = await runObsidianProjectNoteDraftWrite({ proposal, liveApi: true });
    const second = await runObsidianProjectNoteDraftWrite({ proposal, liveApi: true });

    expect(first).toMatchObject({ status: "executed" });
    expect(second).toMatchObject({ handled: true, ok: true, status: "duplicate_skipped" });
    expect(second.handled && second.message).toMatch(/duplicate/i);
    expect(apiClient.writeObsidianProjectNote).toHaveBeenCalledTimes(1);
  });

  it("shared panel helper routes Obsidian drafts and feeds execution feedback", async () => {
    vi.mocked(apiClient.writeObsidianProjectNote).mockResolvedValue({
      ok: true,
      relativePath: proposal.obsidianNoteDraft!.targetPath,
    });

    const outcome = await runApprovedProjectToolDraftMutation({
      proposal,
      liveApi: true,
    });
    expect(outcome.handled).toBe(true);
    if (!outcome.handled) return;

    const feedback = deriveApprovalExecutionFeedback({
      proposal: { ...proposal, status: "approved" },
      liveApiEnabled: true,
      projectToolMutation: outcome.audit,
    });
    expect(feedback?.kind).toBe("tool_mutation_executed");
    expect(feedback?.message).toMatch(/Wrote Obsidian note/i);
  });
});
