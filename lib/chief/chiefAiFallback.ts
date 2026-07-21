/**
 * Chief AI fallback — only for unmatched deterministic command results.
 * Uses the existing LLM router chief lane. No regex simulation.
 */

import { runTask } from "../llm/index.js";
import type { ChiefCommandLiveContext, ChiefCommandResult } from "./commandTypes.js";

export function isChiefAiFallbackConfigured(): boolean {
  const key = process.env.AZURE_OPENAI_API_KEY?.trim();
  const endpoint =
    process.env.AZURE_AI_RESOURCE_ENDPOINT?.trim() ||
    process.env.AZURE_OPENAI_ENDPOINT?.trim();
  return Boolean(key && endpoint);
}

function buildFallbackPrompt(prompt: string, ctx: ChiefCommandLiveContext): string {
  const incidentLine =
    ctx.activeIncidents.length === 0
      ? "No Sev 1–2 incidents."
      : `${ctx.activeIncidents.length} Sev 1–2: ${ctx.activeIncidents
          .slice(0, 3)
          .map((i) => `${i.id} ${i.title}`)
          .join("; ")}`;

  return [
    "You are Chief, the operations foreman for True Crew (maintenance / field ops command center).",
    "Answer briefly and practically. Do not invent tasks, incidents, or approvals that are not in the context.",
    "Do not claim you executed anything — you only advise; approvals happen in the dashboard.",
    "",
    "Ops snapshot:",
    `- Open tasks: ${ctx.openTaskCount}`,
    `- Blocked tasks: ${ctx.blockingTasks.length}`,
    `- Overdue tasks: ${ctx.overdueTasks.length}`,
    `- Focus items: ${ctx.focusItems.length}`,
    `- Incidents: ${incidentLine}`,
    `- Alerts: ${ctx.alerts.length}`,
    "",
    `Operator command: ${prompt}`,
    "",
    "Respond with:",
    "1) A 1–3 sentence summary",
    "2) One recommended next action (start the line with Recommended:)",
  ].join("\n");
}

function parseFallbackText(text: string, prompt: string): Pick<ChiefCommandResult, "summary" | "recommendedAction"> {
  const trimmed = text.trim();
  const recommendedMatch = trimmed.match(/Recommended:\s*(.+)/i);
  const recommendedAction = recommendedMatch?.[1]?.trim()
    ? recommendedMatch[1].trim()
    : "Review Approvals or the focus queue, then rephrase with a concrete ops ask if needed.";

  const summary = recommendedMatch
    ? trimmed.slice(0, recommendedMatch.index).trim() || trimmed
    : trimmed || `AI fallback had no content for: "${prompt}".`;

  return { summary, recommendedAction };
}

export type ChiefAiFallbackOutcome =
  | { ok: true; result: ChiefCommandResult }
  | { ok: false; result: ChiefCommandResult };

/**
 * Calls the chief LLM lane. On missing env or provider error, returns
 * ai_fallback_unavailable — never invents a fake model reply.
 */
export async function runChiefAiFallback(
  prompt: string,
  ctx: ChiefCommandLiveContext,
): Promise<ChiefAiFallbackOutcome> {
  if (!isChiefAiFallbackConfigured()) {
    return {
      ok: false,
      result: {
        summary: `No specialist match for "${prompt.trim()}". AI fallback is unavailable (Azure OpenAI / Foundry not configured).`,
        recommendedAction:
          "Use a focused ops phrase (risk today, blockers, approvals, postmortem, handoff) or configure AZURE_OPENAI_API_KEY and AZURE_AI_RESOURCE_ENDPOINT.",
        routedTo: "Chief",
        matched: false,
        resolution: "ai_fallback_unavailable",
      },
    };
  }

  try {
    const response = await runTask({
      lane: "chief",
      complexity: "medium",
      prompt: buildFallbackPrompt(prompt, ctx),
    });
    const parsed = parseFallbackText(response.text, prompt);
    return {
      ok: true,
      result: {
        ...parsed,
        routedTo: "Chief",
        matched: false,
        resolution: "ai_fallback",
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "AI fallback failed";
    return {
      ok: false,
      result: {
        summary: `No specialist match for "${prompt.trim()}". AI fallback failed: ${detail}`,
        recommendedAction:
          "Retry later, or use a deterministic ops phrase (status, blockers, approvals, incidents).",
        routedTo: "Chief",
        matched: false,
        resolution: "ai_fallback_unavailable",
      },
    };
  }
}
