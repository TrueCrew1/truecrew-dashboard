import type { ToolGovernanceEntry } from "./types.js";

/**
 * V1 product tool governance for the truecrew-dashboard repo.
 * Broader personal-stack tooling lives in docs/TOOL_CATALOG.md.
 */
export const TOOL_GOVERNANCE_CATALOG: readonly ToolGovernanceEntry[] = [
  {
    id: "chief",
    name: "Chief",
    category: "agent",
    owner: "operator / founder",
    bestUse:
      "Operator approvals, governed loop visibility, mission/approval activity, and Chief home signals.",
    avoidUse:
      "Treating Chief as an autonomous executor — approvals and missions still require explicit operator action or governed server runners.",
    configSummary:
      "In-app routes under /chief; live mode via VITE_USE_LIVE_API; vault + Supabase for durable activity when configured.",
    failureSigns:
      "Pending approvals stall with no activity rows; deep-links fail to focus cards; mock mode shows only session data.",
    sopReference: "docs/internal/chief-v1-governed-loops.md",
    status: "active",
  },
  {
    id: "research-agent",
    name: "Research Agent (governed missions)",
    category: "agent",
    owner: "founder",
    bestUse:
      "Project summary handoff and monitor-incident postmortem missions after Chief approval.",
    avoidUse:
      "Expecting open-ended research automation — only the two governed mission kinds are wired.",
    configSummary:
      "lib/research/* mission runners; Azure LLM router; Supabase project context; Obsidian vault outputs.",
    failureSigns:
      "Mission status blocked/failed with vault or LLM errors; handoff artifacts missing paths.",
    sopReference: "docs/RESEARCH_AGENT_PACKET_SPEC.md",
    status: "partial",
  },
  {
    id: "builder-agent",
    name: "Builder Agent",
    category: "agent",
    owner: "founder",
    bestUse:
      "Build approval cards, build-gate visibility, and runtime QA proposals from the Builds page.",
    avoidUse:
      "Assuming an autonomous Builder runner — proposals are manual/agent-triggered in V1.",
    configSummary:
      "src/components/chief/buildAgentTestProposal.ts; BuildsPage enqueue path; vault Build Log when configured.",
    failureSigns:
      "Build gates remain open with no approval card; runtime QA proposal never enqueued.",
    sopReference: "docs/BUILDER_AGENT_PACKET_SPEC.md",
    status: "partial",
  },
  {
    id: "librarian-agent",
    name: "Librarian",
    category: "agent",
    owner: "operator",
    bestUse:
      "Optional deterministic or local-Ollama refinement of filing candidates when enabled.",
    avoidUse:
      "Relying on Librarian for production writes without checking LIBRARIAN_AI_ENABLED and vault path.",
    configSummary: "LIBRARIAN_AI_ENABLED, OLLAMA_HOST, OLLAMA_MODEL; Obsidian vault for outputs.",
    failureSigns:
      "Refinement skipped silently when disabled; Ollama unreachable returns degraded filing signals only.",
    sopReference: "docs/AGENT_RUNBOOK.md",
    status: "partial",
  },
  {
    id: "monitor-surface",
    name: "Monitor (platform health)",
    category: "platform",
    owner: "operator",
    bestUse: "Check Vercel deploy recency and Supabase DB reachability from Monitor and Chief brief.",
    avoidUse:
      "Treating Monitor as full repo/CI health — GitHub Actions status is not aggregated in-app.",
    configSummary:
      "api/monitor/index.ts; VERCEL_API_TOKEN + VERCEL_PROJECT_ID; Supabase RPC monitor_supabase_health.",
    failureSigns:
      "Probe cards show degraded; Chief platform approval card appears on sustained probe failure.",
    sopReference: "docs/internal/chief-v1-governed-loops.md#production-sanity-pass",
    status: "partial",
  },
];
