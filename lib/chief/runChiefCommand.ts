/**
 * Orchestrates deterministic resolve → optional AI fallback for Chief commands.
 */

import type { ChiefCommandRequestBody, ChiefCommandResult } from "./commandTypes.js";
import { runChiefAiFallback } from "./chiefAiFallback.js";
import {
  isUnmatchedChiefCommandResult,
  resolveChiefCommand,
} from "./resolveCommand.js";

export async function runChiefCommand(
  body: ChiefCommandRequestBody,
): Promise<ChiefCommandResult> {
  const prompt = body.prompt?.trim() ?? "";
  const deterministic = resolveChiefCommand({
    prompt,
    liveContext: body.liveContext,
    knowledge: body.knowledge,
    approvals: body.approvals,
    workflows: body.workflows,
  });

  if (!isUnmatchedChiefCommandResult(deterministic)) {
    return deterministic;
  }

  const fallback = await runChiefAiFallback(prompt, body.liveContext);
  return fallback.result;
}
