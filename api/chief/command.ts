/**
 * POST /api/chief/command
 *
 * Deterministic Chief command router first; AI fallback (chief LLM lane)
 * only when unmatched. Does not approve, merge, deploy, or mutate state.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../lib/auth.js";
import type {
  ChiefCommandApprovalCandidate,
  ChiefCommandKnowledgeLibrary,
  ChiefCommandLiveContext,
  ChiefCommandRequestBody,
  ChiefCommandSource,
  ChiefCommandWorkflowRef,
} from "../../lib/chief/commandTypes.js";
import { runChiefCommand } from "../../lib/chief/runChiefCommand.js";

const SOURCES: ChiefCommandSource[] = ["home", "sidebar", "topbar"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function parseSource(value: unknown): ChiefCommandSource | undefined {
  if (typeof value !== "string") return undefined;
  return SOURCES.includes(value as ChiefCommandSource)
    ? (value as ChiefCommandSource)
    : undefined;
}

function parseLiveContext(value: unknown): ChiefCommandLiveContext | null {
  if (!isRecord(value)) return null;
  if (!isRecord(value.stats)) return null;
  if (!Array.isArray(value.focusItems)) return null;
  if (!Array.isArray(value.alerts)) return null;
  if (typeof value.openTaskCount !== "number") return null;
  if (!Array.isArray(value.blockingTasks)) return null;
  if (!Array.isArray(value.overdueTasks)) return null;
  if (!Array.isArray(value.tasksMissingCustomer)) return null;
  if (!Array.isArray(value.tasksMissingWorkflow)) return null;
  if (!Array.isArray(value.activeIncidents)) return null;
  if (!Array.isArray(value.blockedDeploys)) return null;
  if (!Array.isArray(value.waitingCustomers)) return null;

  return value as unknown as ChiefCommandLiveContext;
}

function parseKnowledge(value: unknown): ChiefCommandKnowledgeLibrary | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.runbooks)) return null;
  if (!Array.isArray(value.prompts)) return null;
  if (!Array.isArray(value.notes)) return null;
  return value as unknown as ChiefCommandKnowledgeLibrary;
}

function parseApprovals(value: unknown): ChiefCommandApprovalCandidate[] | null {
  if (!Array.isArray(value)) return null;
  return value as ChiefCommandApprovalCandidate[];
}

function parseWorkflows(value: unknown): ChiefCommandWorkflowRef[] {
  if (!Array.isArray(value)) return [];
  return value as ChiefCommandWorkflowRef[];
}

function parseBody(body: unknown): ChiefCommandRequestBody | null {
  if (!isRecord(body)) return null;
  if (typeof body.prompt !== "string" || !body.prompt.trim()) return null;

  const liveContext = parseLiveContext(body.liveContext);
  const knowledge = parseKnowledge(body.knowledge);
  const approvals = parseApprovals(body.approvals);
  if (!liveContext || !knowledge || !approvals) return null;

  const context = isRecord(body.context)
    ? {
        page: typeof body.context.page === "string" ? body.context.page : undefined,
        section:
          typeof body.context.section === "string" ? body.context.section : undefined,
      }
    : undefined;

  return {
    prompt: body.prompt.trim(),
    source: parseSource(body.source),
    context,
    liveContext,
    knowledge,
    workflows: parseWorkflows(body.workflows),
    approvals,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = parseBody(req.body);
  if (!parsed) {
    return res.status(400).json({
      error:
        "prompt, liveContext, knowledge, and approvals are required (prompt must be non-empty)",
    });
  }

  try {
    const result = await runChiefCommand(parsed);
    return res.status(200).json({
      ...result,
      source: parsed.source ?? null,
      context: parsed.context ?? null,
    });
  } catch (error) {
    console.error("chief/command failed", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to run Chief command",
    });
  }
}
