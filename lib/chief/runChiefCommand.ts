/**
 * Orchestrates deterministic resolve → optional AI fallback for Chief commands.
 * Applies work-truth guard so non-executable results never claim approvalNeeded.
 */

import type { ChiefCommandRequestBody, ChiefCommandResult } from "./commandTypes.js";
import { runChiefAiFallback } from "./chiefAiFallback.js";
import {
  isUnmatchedChiefCommandResult,
  resolveChiefCommand,
} from "./resolveCommand.js";
import { guardCommandResultWorkTruth } from "./workTruth.js";

export async function runChiefCommand(
  body: ChiefCommandRequestBody,
): Promise<ChiefCommandResult> {
  const prompt = body.prompt?.trim() ?? "";
  const deterministic = guardCommandResultWorkTruth(
    resolveChiefCommand({
      prompt,
      liveContext: body.liveContext,
      knowledge: body.knowledge,
      approvals: body.approvals,
      workflows: body.workflows,
    }),
  );

  if (!isUnmatchedChiefCommandResult(deterministic)) {
    return deterministic;
  }

  const fallback = await runChiefAiFallback(prompt, body.liveContext);
  return guardCommandResultWorkTruth({
    ...fallback.result,
    workTruth: fallback.ok ? "informational" : "informational",
  });
}
