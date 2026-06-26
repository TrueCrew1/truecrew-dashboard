export const TODAY_STORAGE_KEY = "truecrew.today.items";
export const WIP_LIMIT = 3;

export type TodayItemStatus = "open" | "in_progress" | "blocked" | "waiting" | "done";
export type TodayPriority = "critical" | "high" | "normal" | "low";

export interface TodayItem {
  id: string;
  title: string;
  module: string;
  status: TodayItemStatus;
  priority: TodayPriority;
  dueDate: string | null;
  owner: string | null;
  blocker: string | null;
  waitingOn: string | null;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface NextActionStep {
  urgency: TodayPriority | "low";
  action: string;
  detail: string;
  targetId: string | null;
}

export function loadTodayItems(): TodayItem[] {
  try {
    const raw = sessionStorage.getItem(TODAY_STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as TodayItem[];
    const cleaned = items.filter((item) => !item.id.startsWith("tc-demo-"));
    if (cleaned.length !== items.length) {
      saveTodayItems(cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveTodayItems(items: TodayItem[]) {
  sessionStorage.setItem(TODAY_STORAGE_KEY, JSON.stringify(items));
}

export function aiNextStep(items: TodayItem[]): NextActionStep {
  const active = items.filter((i) => i.status !== "done");

  if (active.length === 0) {
    return {
      urgency: "low",
      action: "Queue is empty",
      detail: "No items yet. Use quick capture below to add work when operational modules connect.",
      targetId: null,
    };
  }

  const blocked = active.filter((i) => i.status === "blocked");
  if (blocked.length) {
    const b = blocked[0];
    return {
      urgency: "high",
      action: "Clear a blocker",
      detail: `"${b.title}" cannot progress without intervention.`,
      targetId: b.id,
    };
  }

  const wip = active.filter((i) => i.status === "in_progress");
  if (wip.length >= WIP_LIMIT) {
    return {
      urgency: "normal",
      action: "Close in-progress work before starting more",
      detail: `WIP limit is ${WIP_LIMIT}. Finish current items before adding focus.`,
      targetId: null,
    };
  }

  const open = active.filter((i) => i.status === "open");
  const top = open[0];
  if (top) {
    return {
      urgency: "low",
      action: "Start highest-priority open item",
      detail: `"${top.title}" is ready to move to In Progress.`,
      targetId: top.id,
    };
  }

  return {
    urgency: "low",
    action: "Review your queue",
    detail: "Verify nothing is missing, mislabeled, or waiting to be captured.",
    targetId: null,
  };
}

export function createTodayItem(input: {
  title: string;
  priority: TodayPriority;
  dueDate?: string | null;
}): TodayItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim().slice(0, 120),
    module: "Capture",
    status: "open",
    priority: input.priority,
    dueDate: input.dueDate ?? null,
    owner: null,
    blocker: null,
    waitingOn: null,
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
}
