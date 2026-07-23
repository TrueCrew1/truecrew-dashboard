/**
 * Chief → Research bridge helpers. Pure functions only: detection reuses the
 * command bar's parser so Chief and ⌘K accept identical research commands, and
 * the response builders describe exactly what a session request is — saved in
 * this browser, advanced by the operator, nothing auto-runs. The actual store
 * write happens in ChiefPanel via ResearchRequestsContext.createSessionRequest.
 */
import { extractResearchTopic } from "@/lib/search/commandParser";
import type { ResearchRequest } from "@/lib/research/types";
import type { ChiefResponse } from "./types";

export { extractResearchTopic };

export function buildResearchRequestCreatedResponse(
  request: ResearchRequest,
  rail: "live" | "session" = "session",
): ChiefResponse {
  const persistence =
    rail === "live"
      ? "saved to the live queue — visible from any device."
      : "session-backed, saved in this browser only.";
  return {
    summary:
      `Research request queued for "${request.topic}" — ${persistence} ` +
      "Nothing auto-investigates; advance status yourself when work starts.",
    recommendedAction:
      "Open Knowledge → Research queue to start work, then mark done with a filed path once the finding is written.",
    routedTo: "Research Agent",
    specialists: [
      {
        specialist: "Research Agent",
        contribution:
          rail === "live"
            ? "Request queued to the live store — operator-driven, no auto-run"
            : "Session request queued — operator-driven, no auto-run",
      },
    ],
  };
}

export function buildResearchRequestFailedResponse(topic: string): ChiefResponse {
  return {
    summary: `Could not create a research request for "${topic}" — the session queue rejected it.`,
    recommendedAction: "Try again, or use the command bar (⌘K): start research on <topic>.",
    routedTo: "Chief",
  };
}
