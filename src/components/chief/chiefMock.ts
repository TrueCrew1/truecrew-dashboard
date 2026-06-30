import type { ChiefResponse } from "./types";

const DEFAULT_RESPONSE: ChiefResponse = {
  summary:
    "Reviewed your request against current operational context. No immediate conflicts detected.",
  recommendedAction:
    "Continue with the active workflow. Re-run this command after selecting a task for entity-specific guidance.",
  routedTo: "Chief",
};

const MOCK_RESPONSES: { match: RegExp; response: ChiefResponse }[] = [
  {
    match: /\b(gate|gates|workflow|stage|advance|block|blocking|deploy)\b/i,
    response: {
      summary:
        "Build deploy is blocked by an open QA gate on task t-build-001. Two other build tasks are clear.",
      blockers: [
        "QA sign-off gate open on t-build-001",
        "Staging deploy held until gate passes",
      ],
      recommendedAction:
        "Resolve the QA gate on t-build-001 before advancing to deploy, or confirm override with documented reason.",
      approvalNeeded: true,
      approvalPrompt: "Override gate and advance to deploy anyway?",
      routedTo: "Workflow Gate Agent",
    },
  },
  {
    match: /\b(knowledge|doc|search|library|note|obsidian)\b/i,
    response: {
      summary:
        "Found 3 knowledge entries related to your query: workflow gate policy, deploy checklist, and incident runbook.",
      recommendedAction:
        "Open the deploy checklist in AI & Knowledge and attach it to the active build task before closeout.",
      routedTo: "Librarian Agent",
    },
  },
  {
    match: /\b(incident|alert|monitor|sev|uptime|degrad)\b/i,
    response: {
      summary:
        "One Sev 2 incident is open on api-gateway. Monitor shows elevated latency; no new alerts in the last hour.",
      blockers: ["Sev 2 incident open — api-gateway latency"],
      recommendedAction:
        "Triage the open incident first. Escalate to repair workflow if customer impact is confirmed.",
      approvalNeeded: true,
      approvalPrompt: "Open repair workflow for api-gateway incident?",
      routedTo: "Monitor Agent",
    },
  },
  {
    match: /\b(status|today|focus|overview)\b/i,
    response: {
      summary:
        "4 active tasks, 1 open incident, 2 focus items in queue. Build pipeline has one blocking gate.",
      recommendedAction:
        "Start with today's focus queue, then address the blocking build gate before end of shift.",
      routedTo: "Chief",
    },
  },
];

export function resolveChiefCommand(input: string): ChiefResponse {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_RESPONSE;

  for (const { match, response } of MOCK_RESPONSES) {
    if (match.test(trimmed)) return response;
  }

  return {
    ...DEFAULT_RESPONSE,
    summary: `Received: "${trimmed}". No specialist match — Chief handled this directly.`,
  };
}
