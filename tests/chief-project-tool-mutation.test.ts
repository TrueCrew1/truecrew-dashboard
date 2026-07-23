import { describe, expect, it, beforeEach } from "vitest";
import {
  runIdempotentProjectToolMutation,
  resetProjectToolMutationRegistryForTests,
  getProjectToolMutationAudit,
  formatProjectToolMutationMessage,
} from "@/components/chief/chiefProjectToolMutation";
import { OBSIDIAN_PROJECT_NOTE_DRAFT_KIND } from "@/components/chief/types";

describe("chiefProjectToolMutation idempotency + audit", () => {
  beforeEach(() => {
    resetProjectToolMutationRegistryForTests();
  });

  it("records structured audit metadata on execute", async () => {
    const outcome = await runIdempotentProjectToolMutation({
      proposalId: "apr-1",
      action: "obsidian_note_write",
      missionKind: OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
      projectId: "ms-painting",
      projectName: "M&S Painting",
      target: "Projects/M&S Painting/Chief Drafts/note.md",
      liveApi: true,
      now: () => "2026-07-23T12:00:00.000Z",
      execute: async () => ({ ok: true, detail: "Projects/M&S Painting/Chief Drafts/note.md" }),
    });

    expect(outcome).toMatchObject({
      handled: true,
      ok: true,
      status: "executed",
      audit: {
        proposalId: "apr-1",
        action: "obsidian_note_write",
        projectId: "ms-painting",
        projectName: "M&S Painting",
        target: "Projects/M&S Painting/Chief Drafts/note.md",
        approvalDecision: "approved",
        outcome: "executed",
        liveApi: true,
        attemptedAt: "2026-07-23T12:00:00.000Z",
      },
    });
    expect(getProjectToolMutationAudit("apr-1")?.outcome).toBe("executed");
    expect(formatProjectToolMutationMessage(outcome.audit)).toMatch(/Wrote Obsidian note/i);
  });

  it("does not re-execute after skipped_offline", async () => {
    let calls = 0;
    const execute = async () => {
      calls += 1;
      return { ok: true as const };
    };

    const first = await runIdempotentProjectToolMutation({
      proposalId: "apr-2",
      action: "github_pr_comment_post",
      missionKind: "github:pr-comment-draft",
      projectId: "ms-painting",
      projectName: "M&S Painting",
      target: "TrueCrew1/ms-painting#12",
      liveApi: false,
      execute,
    });
    const second = await runIdempotentProjectToolMutation({
      proposalId: "apr-2",
      action: "github_pr_comment_post",
      missionKind: "github:pr-comment-draft",
      projectId: "ms-painting",
      projectName: "M&S Painting",
      target: "TrueCrew1/ms-painting#12",
      liveApi: true,
      execute,
    });

    expect(first.status).toBe("skipped_offline");
    expect(second.status).toBe("duplicate_skipped");
    expect(calls).toBe(0);
  });

  it("allows retry after failure", async () => {
    let calls = 0;
    const execute = async () => {
      calls += 1;
      if (calls === 1) return { ok: false as const, error: "transient" };
      return { ok: true as const, detail: "done" };
    };

    const first = await runIdempotentProjectToolMutation({
      proposalId: "apr-3",
      action: "obsidian_note_write",
      missionKind: OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
      projectId: "ms-painting",
      projectName: "M&S Painting",
      target: "Projects/M&S Painting/a.md",
      liveApi: true,
      execute,
    });
    const second = await runIdempotentProjectToolMutation({
      proposalId: "apr-3",
      action: "obsidian_note_write",
      missionKind: OBSIDIAN_PROJECT_NOTE_DRAFT_KIND,
      projectId: "ms-painting",
      projectName: "M&S Painting",
      target: "Projects/M&S Painting/a.md",
      liveApi: true,
      execute,
    });

    expect(first.status).toBe("failed");
    expect(second.status).toBe("executed");
    expect(calls).toBe(2);
  });
});
