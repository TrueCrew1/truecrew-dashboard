import { describe, expect, it } from "vitest";
import {
  buildObsidianDraftGlobalRefusal,
  buildObsidianNoteDraftResponse,
  isObsidianDraftIntent,
} from "@/components/chief/chiefObsidianNoteDraft";
import { matchChiefProjectToolIntent } from "@/components/chief/chiefProjectToolReads";
import { buildApprovalFromResponse } from "@/components/chief/chiefMock";
import { OBSIDIAN_PROJECT_NOTE_DRAFT_KIND } from "@/components/chief/types";
import {
  buildObsidianProjectNoteDraft,
  extractObsidianDraftTopic,
  isObsidianDraftPathInScope,
} from "@/lib/chief/obsidianProjectNoteDraft";
import { getProjectToolScope, KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID } from "@/data/projects";
import { writeScopedProjectNote, ObsidianScopeWriteError } from "../lib/obsidian/writeScopedProjectNote.js";

describe("Obsidian project note draft", () => {
  const scope = getProjectToolScope(KNOWN_APP_PROJECTS, MS_PAINTING_PROJECT_ID)!;
  const now = new Date("2026-07-23T12:00:00.000Z");

  it("detects draft intents without stealing list intents", () => {
    expect(isObsidianDraftIntent("Draft Obsidian note about crew roster")).toBe(true);
    expect(matchChiefProjectToolIntent("Draft Obsidian note about crew roster")).toBe(
      "obsidian_draft",
    );
    expect(matchChiefProjectToolIntent("List Obsidian notes for this project")).toBe("obsidian");
  });

  it("builds a scoped draft under the project Obsidian prefix", () => {
    const draft = buildObsidianProjectNoteDraft({
      scope,
      command: "Draft Obsidian note about crew roster",
      now,
    });
    expect(draft).not.toBeNull();
    expect(draft?.title.toLowerCase()).toContain("crew roster");
    expect(draft?.scopePrefix).toBe("Projects/M&S Painting");
    expect(draft?.targetPath.startsWith("Projects/M&S Painting/Chief Drafts/")).toBe(true);
    expect(isObsidianDraftPathInScope(draft!.targetPath, draft!.scopePrefix ? [draft!.scopePrefix] : [])).toBe(
      true,
    );
    expect(extractObsidianDraftTopic("Draft Obsidian note about crew roster")).toMatch(/crew roster/i);
  });

  it("attaches approval-required draft response and approval card fields", () => {
    const response = buildObsidianNoteDraftResponse({
      scope,
      command: "Draft Obsidian note about crew roster",
      now,
    });
    expect(response.approvalNeeded).toBe(true);
    expect(response.obsidianNoteDraft?.targetPath).toContain("Projects/M&S Painting");
    expect(response.toolRead?.resultType).toBe("Note draft");
    expect(response.approvalPacket?.improvementsMade.join(" ")).toMatch(/Draft only/i);

    const card = buildApprovalFromResponse("Draft Obsidian note about crew roster", response);
    expect(card?.missionKind).toBe(OBSIDIAN_PROJECT_NOTE_DRAFT_KIND);
    expect(card?.obsidianNoteDraft?.title).toBe(response.obsidianNoteDraft?.title);
    expect(card?.checklist?.some((item) => /Vault write only after approve/i.test(item.label))).toBe(
      true,
    );
  });

  it("refuses Global drafting cleanly", () => {
    const refusal = buildObsidianDraftGlobalRefusal();
    expect(refusal.approvalNeeded).toBeFalsy();
    expect(refusal.toolRead?.state).toBe("no_scope");
    expect(refusal.summary).toMatch(/Select a project/i);
  });
});

describe("writeScopedProjectNote gate", () => {
  it("rejects paths outside allowed prefixes without writing", async () => {
    await expect(
      writeScopedProjectNote({
        relativePath: "Other/Outside.md",
        content: "# nope",
        allowedPrefixes: ["Projects/M&S Painting"],
      }),
    ).rejects.toBeInstanceOf(ObsidianScopeWriteError);
  });
});
