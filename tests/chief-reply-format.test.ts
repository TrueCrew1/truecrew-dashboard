import { describe, expect, it } from "vitest";
import {
  formatChiefApprovalRequest,
  formatChiefNextAction,
  formatChiefReplyLines,
  formatChiefReplyPlainText,
} from "../src/components/chief/chiefReplyFormat";
import type { ChiefResponse } from "../src/components/chief/types";

function base(overrides: Partial<ChiefResponse> = {}): ChiefResponse {
  return {
    summary: "Three open tasks need attention.",
    recommendedAction: "Clear the top blocker first.",
    routedTo: "Chief",
    ...overrides,
  };
}

describe("chiefReplyFormat", () => {
  it("maps the four canonical lines without approval", () => {
    const lines = formatChiefReplyLines(base());
    expect(lines.status).toBe("Three open tasks need attention.");
    expect(lines.recommendation).toBe("Clear the top blocker first.");
    expect(lines.nextAction).toBe("Clear the top blocker first.");
    expect(lines.approvalRequest).toBe("none");
  });

  it("uses blockers for next action and status suffix", () => {
    const lines = formatChiefReplyLines(
      base({
        blockers: ["Gate CI failing on task-1", "Missing customer link"],
        recommendedAction: "Unblock CI",
      }),
    );
    expect(lines.status).toContain("2 blockers");
    expect(lines.nextAction).toBe("Gate CI failing on task-1 (+1 more)");
  });

  it("routes next action through a specialist when no blockers", () => {
    expect(
      formatChiefNextAction(
        base({
          routedTo: "Research Agent",
          recommendedAction: "Draft postmortem",
        }),
      ),
    ).toBe("Hand to Research — Draft postmortem");
  });

  it("fills approval request from prompt when needed", () => {
    expect(
      formatChiefApprovalRequest(
        base({
          approvalNeeded: true,
          approvalPrompt: "Approve repair workflow link",
        }),
      ),
    ).toBe("Approve repair workflow link");
  });

  it("formats plain text for history", () => {
    const text = formatChiefReplyPlainText(base({ approvalNeeded: false }));
    expect(text).toContain("Status:");
    expect(text).toContain("Recommendation:");
    expect(text).toContain("Next action:");
    expect(text).toContain("Approval request: none");
  });
});
