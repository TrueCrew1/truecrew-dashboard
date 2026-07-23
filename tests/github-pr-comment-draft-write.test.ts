import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isGithubPrCommentDraftProposal,
  runGithubPrCommentDraftWrite,
} from "@/components/chief/githubPrCommentDraftWrite";
import { buildGithubPrCommentDraftResponse } from "@/components/chief/chiefGithubPrCommentDraft";
import { buildApprovalFromResponse } from "@/components/chief/chiefMock";
import { GITHUB_PR_COMMENT_DRAFT_KIND } from "@/components/chief/types";
import { resetProjectToolMutationRegistryForTests } from "@/components/chief/chiefProjectToolMutation";
import { runApprovedProjectToolDraftMutation } from "@/components/chief/runApprovedProjectToolDraftMutation";
import { deriveApprovalExecutionFeedback } from "@/components/chief/approvalExecutionFeedback";
import { getProjectToolScope, KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID } from "@/data/projects";
import * as apiClient from "@/lib/api/client";

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof apiClient>("@/lib/api/client");
  return {
    ...actual,
    postGithubPrComment: vi.fn(),
  };
});

const samplePr = {
  repo: "TrueCrew1/ms-painting",
  number: 12,
  title: "Jobsite checklist",
  url: "https://github.com/TrueCrew1/ms-painting/pull/12",
  updatedAt: "2026-07-23T00:00:00Z",
};

describe("runGithubPrCommentDraftWrite (shared home/panel path)", () => {
  const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;
  const response = buildGithubPrCommentDraftResponse({
    scope,
    command: "Draft GitHub comment on PR #12",
    pullRequests: [samplePr],
    live: true,
  });
  const proposal = buildApprovalFromResponse("Draft GitHub comment on PR #12", response)!;

  beforeEach(() => {
    resetProjectToolMutationRegistryForTests();
    vi.mocked(apiClient.postGithubPrComment).mockReset();
  });

  it("recognizes GitHub draft proposals", () => {
    expect(proposal.missionKind).toBe(GITHUB_PR_COMMENT_DRAFT_KIND);
    expect(isGithubPrCommentDraftProposal(proposal)).toBe(true);
    expect(
      isGithubPrCommentDraftProposal({
        ...proposal,
        missionKind: undefined,
        githubPrCommentDraft: undefined,
      }),
    ).toBe(false);
  });

  it("skips GitHub post when live API is off and records audit", async () => {
    const outcome = await runGithubPrCommentDraftWrite({
      proposal,
      liveApi: false,
    });
    expect(outcome).toMatchObject({
      handled: true,
      ok: true,
      status: "skipped_offline",
    });
    expect(outcome.handled && outcome.audit.target).toBe("TrueCrew1/ms-painting#12");
    expect(outcome.handled && outcome.message).toMatch(/live API off/i);
    expect(apiClient.postGithubPrComment).not.toHaveBeenCalled();
  });

  it("posts under the draft repo scope when live API is on", async () => {
    vi.mocked(apiClient.postGithubPrComment).mockResolvedValue({
      ok: true,
      commentUrl: "https://github.com/TrueCrew1/ms-painting/pull/12#issuecomment-1",
      commentId: 1,
    });

    const outcome = await runGithubPrCommentDraftWrite({
      proposal,
      liveApi: true,
    });

    expect(outcome.handled).toBe(true);
    if (outcome.handled) {
      expect(outcome.ok).toBe(true);
      expect(outcome.status).toBe("executed");
      expect(outcome.message).toMatch(/Posted GitHub comment/i);
      expect(outcome.audit.action).toBe("github_pr_comment_post");
    }
    expect(apiClient.postGithubPrComment).toHaveBeenCalledWith({
      repo: proposal.githubPrCommentDraft!.repo,
      prNumber: proposal.githubPrCommentDraft!.prNumber,
      body: proposal.githubPrCommentDraft!.body,
      allowedRepos: [proposal.githubPrCommentDraft!.repo],
    });
  });

  it("surfaces post failures without claiming success", async () => {
    vi.mocked(apiClient.postGithubPrComment).mockResolvedValue({
      ok: false,
      error: "outside project GitHub scope",
    });

    const outcome = await runGithubPrCommentDraftWrite({
      proposal,
      liveApi: true,
    });

    expect(outcome).toMatchObject({ handled: true, ok: false, status: "failed" });
    expect(outcome.handled && outcome.message).toMatch(/GitHub PR comment post failed/i);
  });

  it("skips duplicate post after a successful execution", async () => {
    vi.mocked(apiClient.postGithubPrComment).mockResolvedValue({
      ok: true,
      commentUrl: "https://github.com/TrueCrew1/ms-painting/pull/12#issuecomment-1",
      commentId: 1,
    });

    const first = await runGithubPrCommentDraftWrite({ proposal, liveApi: true });
    const second = await runGithubPrCommentDraftWrite({ proposal, liveApi: true });

    expect(first).toMatchObject({ status: "executed" });
    expect(second).toMatchObject({ handled: true, ok: true, status: "duplicate_skipped" });
    expect(second.handled && second.message).toMatch(/Already executed/i);
    expect(apiClient.postGithubPrComment).toHaveBeenCalledTimes(1);
  });

  it("shared panel helper + feedback cover GitHub drafts (not advisory-only)", async () => {
    const pendingFeedback = deriveApprovalExecutionFeedback({
      proposal,
      liveApiEnabled: true,
    });
    expect(pendingFeedback?.kind).toBe("tool_mutation_pending");
    expect(pendingFeedback?.message).toMatch(/approve to post/i);

    vi.mocked(apiClient.postGithubPrComment).mockResolvedValue({
      ok: true,
      commentUrl: "https://github.com/TrueCrew1/ms-painting/pull/12#issuecomment-1",
      commentId: 1,
    });

    const outcome = await runApprovedProjectToolDraftMutation({
      proposal,
      liveApi: true,
    });
    expect(outcome.handled).toBe(true);
  });
});
