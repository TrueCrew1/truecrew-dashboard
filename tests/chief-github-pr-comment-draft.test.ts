import { describe, expect, it } from "vitest";
import {
  buildGithubCommentDraftGlobalRefusal,
  buildGithubPrCommentDraftResponse,
} from "@/components/chief/chiefGithubPrCommentDraft";
import { matchChiefProjectToolIntent } from "@/components/chief/chiefProjectToolReads";
import { buildApprovalFromResponse } from "@/components/chief/chiefMock";
import { GITHUB_PR_COMMENT_DRAFT_KIND } from "@/components/chief/types";
import {
  buildGithubPrCommentDraft,
  parsePrNumberFromCommand,
  selectGithubPrForCommentDraft,
} from "@/lib/chief/githubPrCommentDraft";
import { postScopedPullRequestComment } from "../lib/github/postPullRequestComment.js";
import { getProjectToolScope, KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID } from "@/data/projects";

const samplePr = {
  repo: "TrueCrew1/ms-painting",
  number: 12,
  title: "Jobsite checklist",
  url: "https://github.com/TrueCrew1/ms-painting/pull/12",
  updatedAt: "2026-07-23T00:00:00Z",
};

describe("GitHub PR comment draft", () => {
  const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;

  it("detects draft intents without stealing list intents", () => {
    expect(matchChiefProjectToolIntent("Draft GitHub comment on PR #12")).toBe(
      "github_comment_draft",
    );
    expect(matchChiefProjectToolIntent("Prepare a PR comment about crew intake")).toBe(
      "github_comment_draft",
    );
    expect(matchChiefProjectToolIntent("List open PRs on GitHub")).toBe("github");
  });

  it("selects explicit PR number or first open PR", () => {
    expect(parsePrNumberFromCommand("Draft GitHub comment on PR #12")).toBe(12);
    expect(
      selectGithubPrForCommentDraft(
        [samplePr, { ...samplePr, number: 9, title: "Older" }],
        "Draft GitHub comment on PR #12",
      )?.number,
    ).toBe(12);
    expect(
      selectGithubPrForCommentDraft([samplePr], "Draft a GitHub PR comment")?.number,
    ).toBe(12);
  });

  it("builds a scoped draft for an in-scope PR only", () => {
    const draft = buildGithubPrCommentDraft({
      scope,
      command: "Draft GitHub comment on PR #12 about crew intake",
      pullRequest: samplePr,
    });
    expect(draft).not.toBeNull();
    expect(draft?.repo).toBe("TrueCrew1/ms-painting");
    expect(draft?.prNumber).toBe(12);
    expect(draft?.body).toMatch(/crew intake/i);
    expect(draft?.preview.length).toBeGreaterThan(0);

    expect(
      buildGithubPrCommentDraft({
        scope,
        command: "Draft comment",
        pullRequest: { ...samplePr, repo: "other/out-of-scope" },
      }),
    ).toBeNull();
  });

  it("attaches approval-required draft response and approval card fields", () => {
    const response = buildGithubPrCommentDraftResponse({
      scope,
      command: "Draft GitHub comment on PR #12",
      pullRequests: [samplePr],
      live: true,
    });
    expect(response.approvalNeeded).toBe(true);
    expect(response.githubPrCommentDraft?.prNumber).toBe(12);
    expect(response.toolRead?.resultType).toBe("PR comment draft");
    expect(response.summary).toMatch(/Not posted yet/i);
    expect(response.approvalPacket?.improvementsMade.join(" ")).toMatch(/Draft only/i);

    const card = buildApprovalFromResponse("Draft GitHub comment on PR #12", response);
    expect(card?.missionKind).toBe(GITHUB_PR_COMMENT_DRAFT_KIND);
    expect(card?.githubPrCommentDraft?.repo).toBe(samplePr.repo);
    expect(
      card?.checklist?.some((item) => /GitHub post only after approve/i.test(item.label)),
    ).toBe(true);
  });

  it("refuses Global drafting cleanly", () => {
    const refusal = buildGithubCommentDraftGlobalRefusal();
    expect(refusal.approvalNeeded).toBeFalsy();
    expect(refusal.toolRead?.state).toBe("no_scope");
    expect(refusal.summary).toMatch(/Select a project/i);
  });
});

describe("postScopedPullRequestComment gate", () => {
  it("rejects repos outside allowed list without calling GitHub", async () => {
    const fetchImpl = async () => {
      throw new Error("fetch should not run");
    };
    const result = await postScopedPullRequestComment({
      repo: "other/out-of-scope",
      prNumber: 1,
      body: "hello",
      allowedRepos: ["TrueCrew1/ms-painting"],
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/outside project GitHub scope/i);
    }
  });

  it("rejects empty comment bodies", async () => {
    const result = await postScopedPullRequestComment({
      repo: "TrueCrew1/ms-painting",
      prNumber: 12,
      body: "   ",
      allowedRepos: ["TrueCrew1/ms-painting"],
      fetchImpl: async () => new Response("{}", { status: 201 }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/empty/i);
    }
  });
});
