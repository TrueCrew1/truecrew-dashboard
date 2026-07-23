import type { ProjectToolScope } from "@/data/projects";
import { buildObsidianProjectNoteDraft } from "@/lib/chief/obsidianProjectNoteDraft";
import type { ChiefObsidianNoteDraft, ChiefResponse, ChiefToolReadResult } from "./types";
import { OBSIDIAN_PROJECT_NOTE_DRAFT_KIND } from "./types";

function withDraft(
  response: Omit<ChiefResponse, "obsidianNoteDraft" | "toolRead">,
  draft: ChiefObsidianNoteDraft,
  toolRead: ChiefToolReadResult,
): ChiefResponse {
  return { ...response, obsidianNoteDraft: draft, toolRead };
}

/** Global: refuse project note drafting until a project is selected. */
export function buildObsidianDraftGlobalRefusal(): ChiefResponse {
  return {
    summary:
      "Global has no project Obsidian scope. Select a project before drafting a project note.",
    recommendedAction: "Switch Project from Global to a project, then ask to draft an Obsidian note.",
    routedTo: "Chief",
    approvalNeeded: false,
    toolRead: {
      source: "obsidian",
      projectLabel: "Global",
      projectId: null,
      resultType: "Note draft",
      state: "no_scope",
      count: 0,
      scopePaths: [],
      items: [],
      emptyMessage: "Choose a project to draft an Obsidian note.",
    },
  };
}

export function buildObsidianNoteDraftResponse(input: {
  scope: ProjectToolScope;
  command: string;
  now?: Date;
}): ChiefResponse {
  if (input.scope.obsidianPathPrefixes.length === 0) {
    return {
      summary: `Project ${input.scope.projectName} has no Obsidian path prefixes configured — cannot draft a scoped note.`,
      recommendedAction: "Add obsidianPathPrefixes for this project in src/data/projects.ts.",
      routedTo: "Librarian Agent",
      approvalNeeded: false,
      toolRead: {
        source: "obsidian",
        projectLabel: input.scope.projectName,
        projectId: input.scope.projectId,
        resultType: "Note draft",
        state: "unavailable",
        count: 0,
        scopePaths: [],
        items: [],
        emptyMessage: "No Obsidian path prefixes configured for this project.",
      },
    };
  }

  const draft = buildObsidianProjectNoteDraft({
    scope: input.scope,
    command: input.command,
    now: input.now,
  });

  if (!draft) {
    return buildObsidianDraftGlobalRefusal();
  }

  return withDraft(
    {
      summary: `Draft Obsidian note “${draft.title}” for ${draft.projectName} at ${draft.targetPath}. Not written yet — approval required.`,
      recommendedAction: `Review the draft, then approve to write it under ${draft.scopePrefix}.`,
      routedTo: "Librarian Agent",
      approvalNeeded: true,
      approvalTitle: `Write Obsidian draft: ${draft.title}`,
      approvalPrompt: `Approve writing “${draft.title}” to ${draft.targetPath}`,
      riskNote:
        "Vault write is gated. Approving writes this draft into the project Obsidian scope; rejecting discards it.",
      specialists: [
        {
          specialist: "Librarian Agent",
          contribution: `Prepared scoped draft for ${draft.projectName} (write pending approval)`,
        },
      ],
      approvalPacket: {
        recommendation: `Approve to write “${draft.title}” under ${draft.scopePrefix}.`,
        riskLevel: "medium",
        rationale: "Vault writes change the Obsidian project tree and need an explicit operator decision.",
        evidence: [
          `Target path: ${draft.targetPath}`,
          `Scope prefix: ${draft.scopePrefix}`,
          `Mission: ${OBSIDIAN_PROJECT_NOTE_DRAFT_KIND}`,
        ],
        nextAction: "Open Approvals and approve to write, or reject to discard the draft.",
        improvementsMade: [
          "Draft only — no vault write until approval",
          "Path constrained to selected project Obsidian prefixes",
        ],
      },
    },
    draft,
    {
      source: "obsidian",
      projectLabel: draft.projectName,
      projectId: draft.projectId,
      resultType: "Note draft",
      state: "ok",
      count: 1,
      scopePaths: [draft.scopePrefix],
      items: [
        {
          id: draft.targetPath,
          title: draft.title,
          detail: draft.targetPath,
        },
      ],
    },
  );
}

export function isObsidianDraftIntent(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (!/\b(obsidian|vault|note)\b/i.test(trimmed)) return false;
  return (
    /\b(draft|propose|prepare)\b/i.test(trimmed) ||
    (/\b(create|new)\b/i.test(trimmed) && /\bnote\b/i.test(trimmed))
  );
}
