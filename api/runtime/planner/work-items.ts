import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import type { PlannerRequestedBy, PlannerTriggerType } from "../../../lib/planner/types.js";
import { PLANNER_REQUESTED_BY, PLANNER_TRIGGER_TYPES } from "../../../lib/planner/types.js";
import { validatePlannerTaskPayload } from "../../../lib/planner/validate-payload.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  getPlannerWorkItemByIdempotencyKey,
  insertPlannerWorkItem,
  mapRuntimePlannerWorkItemToClient,
} from "../../../lib/supabase/runtime-planner-queries.js";

function parseTriggerType(value: unknown): PlannerTriggerType {
  if (typeof value === "string" && (PLANNER_TRIGGER_TYPES as readonly string[]).includes(value)) {
    return value as PlannerTriggerType;
  }
  return "manual";
}

function parseRequestedBy(value: unknown): PlannerRequestedBy {
  if (typeof value === "string" && (PLANNER_REQUESTED_BY as readonly string[]).includes(value)) {
    return value as PlannerRequestedBy;
  }
  return "operator";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  const body = req.body as {
    inputPayload?: unknown;
    triggerType?: unknown;
    idempotencyKey?: unknown;
    requestedBy?: unknown;
    chiefProposalId?: unknown;
  };

  let inputPayload;
  try {
    inputPayload = validatePlannerTaskPayload(body?.inputPayload);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid inputPayload",
    });
  }

  const idempotencyKey =
    typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : null;

  if (idempotencyKey) {
    const existing = await getPlannerWorkItemByIdempotencyKey(idempotencyKey);
    if (existing) {
      return res.status(200).json({
        workItem: mapRuntimePlannerWorkItemToClient(existing),
        created: false,
      });
    }
  }

  const chiefProposalId =
    typeof body?.chiefProposalId === "string" && body.chiefProposalId.trim()
      ? body.chiefProposalId.trim()
      : (inputPayload.proposalId ?? null);

  try {
    const row = await insertPlannerWorkItem({
      triggerType: parseTriggerType(body?.triggerType),
      inputPayload,
      idempotencyKey,
      requestedBy: parseRequestedBy(body?.requestedBy),
      chiefProposalId,
    });

    return res.status(201).json({
      workItem: mapRuntimePlannerWorkItemToClient(row),
      created: true,
    });
  } catch (error) {
    console.error("Failed to enqueue planner work item", error);
    return res.status(500).json({
      error: "Failed to enqueue planner work item",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
