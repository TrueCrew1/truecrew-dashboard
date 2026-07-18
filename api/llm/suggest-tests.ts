/**
 * Advisory-only Builder test suggestions via the LLM router.
 *
 * POST body: { title, summary, recommendedAction?, riskNote?, checklistLabels? }
 * Returns: { text, suggestions, lane, complexity, advisoryOnly: true }
 *
 * Does not approve, merge, deploy, or mutate any approval state.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import {
  buildSuggestTestsPrompt,
  toSuggestionResult,
  type BuildTestSuggestionInput,
} from "../../src/llm/buildTestSuggestion";
import { runTask } from "../../src/llm/router";

function parseInput(body: unknown): BuildTestSuggestionInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;

  if (typeof record.title !== "string" || !record.title.trim()) return null;
  if (typeof record.summary !== "string" || !record.summary.trim()) return null;

  const checklistLabels = Array.isArray(record.checklistLabels)
    ? record.checklistLabels.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    title: record.title.trim(),
    summary: record.summary.trim(),
    recommendedAction:
      typeof record.recommendedAction === "string" ? record.recommendedAction : undefined,
    riskNote: typeof record.riskNote === "string" ? record.riskNote : undefined,
    checklistLabels,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = parseInput(req.body);
  if (!input) {
    return res.status(400).json({
      error: "title and summary are required",
      advisoryOnly: true,
    });
  }

  try {
    const prompt = buildSuggestTestsPrompt(input);
    const response = await runTask({
      lane: "builder",
      complexity: "medium",
      prompt,
    });
    const result = toSuggestionResult(response.text);

    return res.status(200).json({
      ...result,
      guardrails: {
        advisoryOnly: true,
        humanApprovalRequired: true,
        noAutomaticChanges: true,
      },
    });
  } catch (error) {
    console.error("suggest-tests failed", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to suggest tests",
      advisoryOnly: true,
    });
  }
}
