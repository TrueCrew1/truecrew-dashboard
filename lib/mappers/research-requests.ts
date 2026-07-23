import type { DbResearchRequestRow } from "../supabase/queries.js";
import type { ResearchRequestStatus } from "../research/status.js";

/** Client shape — matches ResearchRequest in src/lib/research/types.ts. */
export interface ClientResearchRequest {
  id: string;
  topic: string;
  whyItMatters: string;
  suggestedOutcome: string;
  createdAt: string;
  updatedAt: string;
  source: "adapter" | "session";
  status: ResearchRequestStatus;
  filedPath?: string;
  blockerNote?: string;
}

export function mapDbResearchRequestToClient(row: DbResearchRequestRow): ClientResearchRequest {
  return {
    id: row.id,
    topic: row.topic,
    whyItMatters: row.why_it_matters,
    suggestedOutcome: row.suggested_outcome,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
    status: row.status,
    filedPath: row.filed_path ?? undefined,
    blockerNote: row.blocker_note ?? undefined,
  };
}
