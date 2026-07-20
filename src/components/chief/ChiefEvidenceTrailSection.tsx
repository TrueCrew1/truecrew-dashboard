import { useMemo, useState } from "react";
import type { ApprovalActivityRecord } from "../../../lib/approvals/types";
import { ChiefEvidenceTrailPanel } from "./ChiefEvidenceTrailPanel";
import {
  buildGovernedEvidenceTrail,
  isGovernedEvidenceTrailCandidate,
} from "@/lib/chief/governedEvidenceTrail";
import { launchErrorFromApprovalActionMessage } from "./approvalExecutionFeedback";
import type { ResearchMissionPayload } from "./researchMonitorIncidentPostmortem";
import type { ApprovalActionState } from "./chiefApproval";
import type { ApprovalProposal } from "./types";

interface ChiefEvidenceTrailSectionProps {
  proposal: ApprovalProposal;
  liveApiEnabled: boolean;
  mission?: ResearchMissionPayload | null;
  actionState?: ApprovalActionState;
  activityRecords: readonly ApprovalActivityRecord[];
}

export function ChiefEvidenceTrailSection({
  proposal,
  liveApiEnabled,
  mission,
  actionState,
  activityRecords,
}: ChiefEvidenceTrailSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const activityRecord = useMemo(
    () => activityRecords.find((record) => record.proposalId === proposal.id) ?? null,
    [activityRecords, proposal.id],
  );

  const trail = useMemo(
    () =>
      buildGovernedEvidenceTrail({
        proposal,
        liveApiEnabled,
        mission,
        launchError: launchErrorFromApprovalActionMessage(
          actionState?.message,
          actionState?.action,
        ),
        isLaunching: actionState?.phase === "loading" && actionState.action === "approved",
        activityRecord,
      }),
    [actionState, activityRecord, liveApiEnabled, mission, proposal],
  );

  if (!isGovernedEvidenceTrailCandidate(proposal)) {
    return null;
  }

  return (
    <div className="chief-evidence-trail-shell">
      <button
        type="button"
        className="chief-evidence-trail-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide evidence trail" : "View evidence trail"}
      </button>
      {expanded ? <ChiefEvidenceTrailPanel trail={trail} /> : null}
    </div>
  );
}
