import { writeObsidianProjectNote } from "@/lib/api/client";
import type { ApprovalProposal } from "./types";
import { OBSIDIAN_PROJECT_NOTE_DRAFT_KIND } from "./types";
import {
  runIdempotentProjectToolMutation,
  type ChiefProjectToolMutationOutcome,
} from "./chiefProjectToolMutation";

export function isObsidianProjectNoteDraftProposal(proposal: ApprovalProposal): boolean {
  return (
    proposal.missionKind === OBSIDIAN_PROJECT_NOTE_DRAFT_KIND &&
    proposal.obsidianNoteDraft !== undefined
  );
}

export type ObsidianDraftWriteOutcome = ChiefProjectToolMutationOutcome;

/**
 * After an explicit Approve decision, complete the Obsidian project-note
 * draft write (or skip when live API is off). Shared by ChiefPanel and
 * ChiefHomePanel so both surfaces stay consistent.
 *
 * Caller must already have recorded the approval decision.
 * Duplicate calls for the same proposalId do not write twice.
 */
export async function runObsidianProjectNoteDraftWrite(input: {
  proposal: ApprovalProposal;
  liveApi: boolean;
}): Promise<ObsidianDraftWriteOutcome> {
  if (!isObsidianProjectNoteDraftProposal(input.proposal)) {
    return { handled: false };
  }

  const draft = input.proposal.obsidianNoteDraft!;

  return runIdempotentProjectToolMutation({
    proposalId: input.proposal.id,
    action: "obsidian_note_write",
    missionKind: OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
    projectId: draft.projectId,
    projectName: draft.projectName,
    target: draft.targetPath,
    liveApi: input.liveApi,
    execute: async () => {
      const writeResult = await writeObsidianProjectNote({
        relativePath: draft.targetPath,
        content: draft.body,
        allowedPrefixes: [draft.scopePrefix],
      });
      if (!writeResult.ok) {
        return { ok: false, error: writeResult.error };
      }
      return { ok: true, detail: writeResult.relativePath };
    },
  });
}
