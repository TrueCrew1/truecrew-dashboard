import { mockWorkflows } from "@/data/mockData";
import { createApprovalCardFromResearchRequest } from "./agentApprovalGates";
import { buildResearchProjectSummaryHandoffRequest } from "./researchProjectSummaryHandoff";
import type { ApprovalCard } from "./types";

/**
 * M&S Painting's own approval source — real, not another demo card. This
 * reuses the same governed Research mission pattern already wired for any
 * workflow (see researchProjectSummaryHandoff.ts): approving it calls
 * executeProjectSummaryHandoffMission against the M&S Painting workflow
 * (wf-ms-001), which loads that workflow + its linked tasks from Supabase
 * and runs the live Research LLM lane — not a mock action.
 *
 * This is the seed of M&S Painting's project-scoped approval queue. Other
 * approvals for this project come from deriveApprovalCandidates once it's
 * run against data scoped to "ms-painting" (chiefContextScope.ts) — gate
 * overrides, onboarding-stall, and missing-context proposals derived from
 * task-ms-001/task-ms-002 same as any other project's tasks.
 */
const MS_PAINTING_WORKFLOW = mockWorkflows.find((workflow) => workflow.id === "wf-ms-001");

export const MS_PAINTING_APPROVAL_CARDS: ApprovalCard[] = MS_PAINTING_WORKFLOW
  ? [
      {
        ...createApprovalCardFromResearchRequest(
          buildResearchProjectSummaryHandoffRequest(MS_PAINTING_WORKFLOW),
        ),
        contextId: "ms-painting",
      },
    ]
  : [];
