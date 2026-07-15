import type { MockData } from "@/data/mockData";
import { askChiefAi, isChiefAiUiEnabled } from "@/lib/api/client";
import { resolveChiefCommand, type ChiefLiveContext } from "./chiefLiveContext";
import type { ApprovalProposal, ChiefResponse } from "./types";

/**
 * Deterministic-first, always: resolveChiefCommand runs first and its result
 * is returned as-is whenever it produced a specific match (unmatched is
 * unset). AI fallback is only attempted for the catch-all "no specialist
 * match" case, and only when the browser-visible VITE_CHIEF_AI_UI_ENABLED
 * flag is on — the server's CHIEF_AI_FALLBACK_ENABLED is still the
 * authoritative gate (see lib/chief-ai/router.ts); this flag only controls
 * whether the browser bothers asking.
 *
 * Never throws: a failed AI call falls back to the deterministic response
 * with aiDegraded set, so the UI always has something to show.
 */
export async function resolveChiefCommandWithAiFallback(
  command: string,
  data: MockData,
  ctx: ChiefLiveContext,
  approvals: ApprovalProposal[],
): Promise<ChiefResponse> {
  const deterministic = resolveChiefCommand(command, data, ctx, approvals);

  if (!deterministic.unmatched || !isChiefAiUiEnabled()) {
    return { ...deterministic, aiRoute: "deterministic" };
  }

  try {
    const ai = await askChiefAi(command, deterministic.summary);
    return {
      ...deterministic,
      summary: ai.summary,
      recommendedAction: ai.recommendedAction,
      aiRoute: ai.route,
      aiDegraded: ai.degraded,
    };
  } catch (error) {
    console.error("[chief-ai] AI fallback request failed — showing deterministic response", error);
    return { ...deterministic, aiRoute: "deterministic", aiDegraded: true };
  }
}
