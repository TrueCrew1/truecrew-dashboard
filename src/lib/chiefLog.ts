// Client-side, session-scoped Chief log. This buffer lives only in memory for
// the current browser session — it does NOT persist and is NOT a replacement
// for the persisted decision record written via /api/chief/approvals (see
// docs/AGENT_APPROVAL_LOOPS.md, "Persistence today"). Use it for lightweight
// in-session observability only.
import type { ApprovalAction, ApprovalSource } from "@/components/chief/types";

export type ChiefLogEvent =
  | { kind: "command_received"; command: string; surface: "home" | "panel" }
  | { kind: "approval_enqueued"; approvalId: string; source?: ApprovalSource; title?: string }
  | { kind: "approval_decided"; approvalId: string; decision: ApprovalAction }
  | { kind: "monitor_alert"; alertId: string; severity?: string }
  | { kind: "monitor_platform_issue"; issueId: string; severity?: string };

export interface ChiefLogRecord {
  at: string;
  event: ChiefLogEvent;
}

/** Cap the in-memory buffer so a long session can't grow it unbounded. */
const MAX_ENTRIES = 500;

const buffer: ChiefLogRecord[] = [];

export function chiefLog(event: ChiefLogEvent): void {
  const record: ChiefLogRecord = { at: new Date().toISOString(), event };
  buffer.push(record);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  console.debug("[chief]", record);
}

export function getChiefLog(): readonly ChiefLogRecord[] {
  return buffer;
}

export function clearChiefLog(): void {
  buffer.length = 0;
}
