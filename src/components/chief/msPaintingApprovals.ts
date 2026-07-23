import { mockWorkflows } from "@/data/mockData";
import { MS_PAINTING_PROJECT_ID } from "@/data/projects";
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
 * Project id comes from `src/data/projects.ts` (app inventory), not a
 * Chief-only hardcode.
 */
const MS_PAINTING_WORKFLOW = mockWorkflows.find((workflow) => workflow.id === "wf-ms-001");

export const MS_PAINTING_APPROVAL_CARDS: ApprovalCard[] = MS_PAINTING_WORKFLOW
  ? [
      {
        ...createApprovalCardFromResearchRequest(
          buildResearchProjectSummaryHandoffRequest(MS_PAINTING_WORKFLOW),
        ),
        contextId: MS_PAINTING_PROJECT_ID,
      },
    ]
  : [];
