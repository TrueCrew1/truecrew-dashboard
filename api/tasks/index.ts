import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mapCommandCenterData } from "../../lib/mappers/index";
import { mapDbTaskToClient } from "../../lib/mappers/tasks";
import { fetchRawCommandCenterRows } from "../../lib/supabase/queries";
import { getSupabaseAdmin, isSupabaseConfigured } from "../../lib/supabase/admin";

function computeSlaDueAt(tier: string): string {
  const hours: Record<string, number> = { p0: 4, p1: 24, p2: 72, p3: 168 };
  return new Date(Date.now() + (hours[tier] ?? 72) * 3600000).toISOString();
}

function priorityToSla(priority: string): string {
  const map: Record<string, string> = {
    critical: "p0",
    high: "p1",
    medium: "p2",
    low: "p3",
  };
  return map[priority] ?? "p2";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const title = String(body.title ?? "").trim();
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      const priority = String(body.priority ?? "medium");
      const slaTier = String(body.slaTier ?? priorityToSla(priority));

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          description: String(body.description ?? "").trim(),
          stage: "Inbox",
          workflow_type: String(body.workflowType ?? "ticket"),
          priority,
          site: String(body.site ?? "production"),
          crew: String(body.crew ?? "platform"),
          sla_tier: slaTier,
          sla_due_at: computeSlaDueAt(slaTier),
          created_by: "operator",
        })
        .select("*, gate_checks(*)")
        .single();

      if (error) throw error;

      const task = mapDbTaskToClient(data);
      return res.status(201).json({ task, source: "supabase" });
    } catch (error) {
      console.error("Failed to create task", error);
      return res.status(500).json({
        error: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const raw = await fetchRawCommandCenterRows();
    const data = mapCommandCenterData(raw);
    return res.status(200).json({ tasks: data.tasks, source: "supabase" });
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    return res.status(500).json({
      error: "Failed to fetch tasks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
