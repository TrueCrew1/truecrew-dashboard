import { postGithubPrComment } from "@/lib/api/client";
import type { ApprovalProposal } from "./types";
import { GITHUB_PR_COMMENT_DRAFT_KIND } from "./types";
import {
  runIdempotentProjectToolMutation,
  type ChiefProjectToolMutationOutcome,
} from "./chiefProjectToolMutation";

export function isGithubPrCommentDraftProposal(proposal: ApprovalProposal): boolean {
  return (
    proposal.missionKind === GITHUB_PR_COMMENT_DRAFT_KIND &&
    proposal.githubPrCommentDraft !== undefined
  );
}

export type GithubCommentDraftWriteOutcome = ChiefProjectToolMutationOutcome;

/**
 * After an explicit Approve decision, post the GitHub PR comment draft
 * (or skip when live API is off). Shared by ChiefPanel and ChiefHomePanel.
 *
 * Caller must already have recorded the approval decision.
 * Duplicate calls for the same proposalId do not post twice.
 */
export async function runGithubPrCommentDraftWrite(input: {
  proposal: ApprovalProposal;
  liveApi: boolean;
}): Promise<GithubCommentDraftWriteOutcome> {
  if (!isGithubPrCommentDraftProposal(input.proposal)) {
    return { handled: false };
  }

  const draft = input.proposal.githubPrCommentDraft!;
  const target = `${draft.repo}#${draft.prNumber}`;

  return runIdempotentProjectToolMutation({
    proposalId: input.proposal.id,
    action: "github_pr_comment_post",
    missionKind: GITHUB_PR_COMMENT_DRAFT_KIND,
    projectId: draft.projectId,
    projectName: draft.projectName,
    target,
    liveApi: input.liveApi,
    execute: async () => {
      const postResult = await postGithubPrComment({
        repo: draft.repo,
        prNumber: draft.prNumber,
        body: draft.body,
        allowedRepos: [draft.repo],
      });
      if (!postResult.ok) {
        return { ok: false, error: postResult.error };
      }
      return {
        ok: true,
        detail: postResult.commentUrl || undefined,
      };
    },
  });
}
