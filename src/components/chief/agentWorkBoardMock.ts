import type { AgentWorkItem, AgentWorkStatusConfig } from "./types";

export const AGENT_WORK_STATUS_CONFIG: AgentWorkStatusConfig[] = [
  { status: "queued", label: "Queued", emptyMessage: "No queued work." },
  { status: "active", label: "Active", emptyMessage: "No agent currently working." },
  { status: "blocked", label: "Blocked", emptyMessage: "No blocked work." },
  {
    status: "awaiting_approval",
    label: "Awaiting approval",
    emptyMessage: "Nothing waiting on an operator decision.",
  },
  { status: "completed", label: "Completed", emptyMessage: "No completed work yet this shift." },
];

// Status column config for the Agents board. Mock Roadmap/Marketer rows were
// removed — this board now shows only live/derived agent work items.
export const AGENT_WORK_ITEMS: AgentWorkItem[] = [];
