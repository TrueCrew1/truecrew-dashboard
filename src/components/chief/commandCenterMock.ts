import type { ChiefSpecialist } from "./types";

export type AgentWorkStatus = "active" | "waiting" | "idle";

export interface AgentWorkItem {
  id: string;
  agent: Exclude<ChiefSpecialist, "Chief">;
  task: string;
  status: AgentWorkStatus;
  detail: string;
  updatedAt: string;
}

/**
 * Illustrative placeholder for the Command Center's agent work board.
 * No live agent job queue exists yet — specialists today only attach
 * attribution to a Chief command response (see SpecialistCards.tsx).
 * Replace this with a real feed once agents report status somewhere.
 */
export const AGENT_WORK_ITEMS: AgentWorkItem[] = [
  {
    id: "wb-1",
    agent: "Workflow Gate Agent",
    task: "Scanning open gates across active builds",
    status: "active",
    detail: "Checking required gates before flagging override candidates.",
    updatedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: "wb-2",
    agent: "Research Agent",
    task: "Drafting repair workflow for Sev 1–2 incidents",
    status: "active",
    detail: "Preparing a repair proposal for incidents missing a linked repair task.",
    updatedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: "wb-3",
    agent: "Roadmap Agent",
    task: "Reviewing overdue backlog",
    status: "waiting",
    detail: "Waiting on priority confirmation before proposing reassignment.",
    updatedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: "wb-4",
    agent: "Librarian Agent",
    task: "No active task",
    status: "idle",
    detail: "Idle — no runbook or knowledge sync requests queued.",
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "wb-5",
    agent: "Marketer Agent",
    task: "No active task",
    status: "idle",
    detail: "Idle — no customer-facing content requests queued.",
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];
