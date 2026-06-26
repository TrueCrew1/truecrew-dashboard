import type { NextActionStep, TodayTask } from "./types";
import { CREW_CAPACITY } from "./constants";
import {
  daysOverdue,
  isActive,
  isBlocker,
  isOverdue,
  isSlaBreaching,
  isStale,
  isWaiting,
  scoreTask,
} from "./scoring";

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function deriveNextAction(tasks: TodayTask[], inProgressCount: number): NextActionStep {
  const active = tasks.filter(isActive);
  const inProgress = active.filter((t) => t.stage === "In Progress");
  const stale = inProgress.filter(isStale);
  const blocked = active.filter((t) => isBlocker(t) && !isWaiting(t));
  const slaBreaches = active.filter(isSlaBreaching);
  const overdue = active.filter((t) => isOverdue(t) && !isWaiting(t));
  const queue = active.filter(
    (t) => t.stage === "Inbox" || t.stage === "Triage" || t.stage === "Planned",
  );

  if (stale.length) {
    const s = stale[0];
    return {
      urgency: "high",
      action: "Update stale in-progress work",
      detail: `"${s.title}" has had no update for ${daysSince(s.updated_at)} days. Record progress or escalate.`,
      targetId: s.id,
    };
  }

  if (slaBreaches.length) {
    const b = slaBreaches.sort((a, b) => scoreTask(b) - scoreTask(a))[0];
    return {
      urgency: "critical",
      action: "Resolve SLA breach",
      detail: `"${b.title}" is past its SLA deadline. Complete, re-prioritize, or document an exception.`,
      targetId: b.id,
    };
  }

  if (blocked.length) {
    const b = blocked[0];
    return {
      urgency: "high",
      action: "Clear a blocker",
      detail: `"${b.title}" cannot proceed. ${b.blocker ? `Blocker: ${b.blocker}` : "Required gates are open."}`,
      targetId: b.id,
    };
  }

  if (overdue.length) {
    const o = overdue.reduce((a, b) => (daysOverdue(b) > daysOverdue(a) ? b : a));
    return {
      urgency: "critical",
      action: "Address oldest overdue item",
      detail: `"${o.title}" is ${daysOverdue(o)} day(s) past due. Complete or reschedule with justification.`,
      targetId: o.id,
    };
  }

  if (inProgressCount >= CREW_CAPACITY) {
    return {
      urgency: "normal",
      action: "Crew at capacity — close work before starting more",
      detail: `Crew has ${inProgressCount} items in progress (limit ${CREW_CAPACITY}). Finish active work before pulling new items.`,
      targetId: null,
    };
  }

  const top = [...queue].sort((a, b) => scoreTask(b) - scoreTask(a))[0];
  if (top) {
    return {
      urgency: top.priority === "critical" ? "high" : "low",
      action: "Start highest-priority queued item",
      detail: `"${top.title}" is the top-scored open item. Move it to In Progress when crew capacity allows.`,
      targetId: top.id,
    };
  }

  return {
    urgency: "low",
    action: "Queue is clear",
    detail: "No open items with clear urgency. Capture work below or verify filters are not hiding tasks.",
    targetId: null,
  };
}
