import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import { validatePlannerTaskPayload } from "../../../lib/planner/validate-payload.js";
import type {
  DbRuntimePlannerWorkItemRow,
  RuntimeRequestedBy,
  RuntimeTriggerType,
} from "../../../lib/runtime/types.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  fetchPlannerWorkItems,
  getRuntimeWorkItemByIdempotencyKey,
  insertRuntimePlannerWorkItem,
  mapRuntimePlannerWorkItemToClient,
} from "../../../lib/supabase/runtime-queries.js";

const REQUESTED_BY = ["founder", "operator", "observer", "system"] as const;
const TRIGGER_TYPES = ["manual", "reactive", "scheduled"] as const;

function parseRequestedBy(value: unknown): RuntimeRequestedBy {
  if (typeof value === "string" && (REQUESTED_BY as readonly string[]).includes(value)) {
    return value as RuntimeRequestedBy;
  }
  return "operator";
}

function parseTriggerType(value: unknown): RuntimeTriggerType {
  if (typeof value === "string" && (TRIGGER_TYPES as readonly string[]).includes(value)) {
    return value as RuntimeTriggerType;
  }
  return "manual";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireInternalAuth(req, res)) return;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "GET") {
    try {
      const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;
      const workItems = await fetchPlannerWorkItems(limit);
      return res.status(200).json({ workItems });
    } catch (error) {
      console.error("Failed to fetch planner work items", error);
      return res.status(500).json({
        error: "Failed to fetch planner work items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as {
    triggerType?: unknown;
    inputPayload?: unknown;
    idempotencyKey?: unknown;
    chiefProposalId?: unknown;
    requestedBy?: unknown;
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
    const existing = await getRuntimeWorkItemByIdempotencyKey(idempotencyKey);
    if (existing) {
      return res.status(200).json({
        workItem: mapRuntimePlannerWorkItemToClient(
          existing as unknown as DbRuntimePlannerWorkItemRow,
        ),
        created: false,
      });
    }
  }

  const chiefProposalId =
    typeof body?.chiefProposalId === "string" && body.chiefProposalId.trim()
      ? body.chiefProposalId.trim()
      : inputPayload.proposalId ?? null;

  try {
    const row = await insertRuntimePlannerWorkItem({
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
