import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireInternalAuth } from "../../../lib/auth.js";
import { validateLibrarianInputPayload } from "../../../lib/librarian/validate-payload.js";
import type { RuntimeRequestedBy, RuntimeTriggerType } from "../../../lib/runtime/types.js";
import { isSupabaseConfigured } from "../../../lib/supabase/admin.js";
import {
  fetchLibrarianWorkItems,
  getRuntimeWorkItemByIdempotencyKey,
  insertRuntimeWorkItem,
  mapRuntimeWorkItemToClient,
} from "../../../lib/supabase/runtime-queries.js";

const REQUESTED_BY = ["founder", "operator", "observer", "system"] as const;
const TRIGGER_TYPES = ["manual", "reactive", "scheduled"] as const;
const INPUT_KINDS = ["chief_decision"] as const;

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

function parseInputKind(value: unknown): (typeof INPUT_KINDS)[number] | null {
  if (typeof value === "string" && (INPUT_KINDS as readonly string[]).includes(value)) {
    return value as (typeof INPUT_KINDS)[number];
  }
  return null;
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
      const workItems = await fetchLibrarianWorkItems(limit);
      return res.status(200).json({ workItems });
    } catch (error) {
      console.error("Failed to fetch librarian work items", error);
      return res.status(500).json({
        error: "Failed to fetch librarian work items",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "POST") {
    const body = req.body as {
      inputKind?: unknown;
      triggerType?: unknown;
      inputPayload?: unknown;
      idempotencyKey?: unknown;
      chiefProposalId?: unknown;
      requestedBy?: unknown;
    };

    const inputKind = parseInputKind(body?.inputKind);
    if (!inputKind) {
      return res.status(400).json({ error: "inputKind must be chief_decision" });
    }

    let inputPayload;
    try {
      inputPayload = validateLibrarianInputPayload(inputKind, body?.inputPayload);
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
          workItem: mapRuntimeWorkItemToClient(existing),
          created: false,
        });
      }
    }

    const chiefProposalId =
      typeof body?.chiefProposalId === "string" && body.chiefProposalId.trim()
        ? body.chiefProposalId.trim()
        : inputPayload.proposalId ?? null;

    try {
      const row = await insertRuntimeWorkItem({
        triggerType: parseTriggerType(body?.triggerType),
        inputKind,
        inputPayload,
        idempotencyKey,
        requestedBy: parseRequestedBy(body?.requestedBy),
        chiefProposalId,
      });

      return res.status(201).json({
        workItem: mapRuntimeWorkItemToClient(row),
        created: true,
      });
    } catch (error) {
      console.error("Failed to enqueue librarian work item", error);
      return res.status(500).json({
        error: "Failed to enqueue librarian work item",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
