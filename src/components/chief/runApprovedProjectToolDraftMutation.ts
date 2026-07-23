import { runObsidianProjectNoteDraftWrite } from "./obsidianProjectNoteDraftWrite";
import { runGithubPrCommentDraftWrite } from "./githubPrCommentDraftWrite";
import type { ApprovalProposal } from "./types";
import type { ChiefProjectToolMutationOutcome } from "./chiefProjectToolMutation";

/**
 * Single entry for Chief home + main panel after Approve:
 * try Obsidian draft write, then GitHub PR comment post.
 * Non-draft proposals return { handled: false }.
 */
export async function runApprovedProjectToolDraftMutation(input: {
  proposal: ApprovalProposal;
  liveApi: boolean;
}): Promise<ChiefProjectToolMutationOutcome> {
  const obsidian = await runObsidianProjectNoteDraftWrite(input);
  if (obsidian.handled) return obsidian;

  const github = await runGithubPrCommentDraftWrite(input);
  if (github.handled) return github;

  return { handled: false };
}
