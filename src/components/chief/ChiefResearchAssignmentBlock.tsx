import { useState, useSyncExternalStore } from "react";
import type { ResearchAssignment } from "@/lib/chief/researchAssignment";
import {
  RESEARCH_ASSIGNMENT_LANE_LABEL,
  RESEARCH_ASSIGNMENT_STATUS_LABEL,
} from "@/lib/chief/researchAssignment";
import {
  completeResearchAssignmentWithControlledResult,
  getResearchAssignment,
  listResearchAssignments,
  subscribeResearchAssignments,
} from "./researchAssignmentStore";
import {
  RESEARCH_DISPATCH_MODE_LABEL,
  RESEARCH_RESULT_SOURCE_LABEL,
  researchAssignmentWorkflowClosed,
} from "./researchAssignmentView";
import { formatChiefTimestamp } from "./chiefMock";

interface ChiefResearchAssignmentBlockProps {
  assignment: ResearchAssignment;
  variant?: "panel" | "home";
  /** When true, show controlled complete action for sent assignments. */
  allowRecordResult?: boolean;
}

function useLiveAssignment(assignment: ResearchAssignment): ResearchAssignment {
  return useSyncExternalStore(
    subscribeResearchAssignments,
    () => getResearchAssignment(assignment.id) ?? assignment,
    () => assignment,
  );
}

function formatTimestamp(iso: string | undefined): string | null {
  if (!iso) return null;
  return formatChiefTimestamp(iso);
}

/**
 * Scanable research assignment — project, lane, status timeline, result,
 * and honest local_controlled labeling. Operator-driven workflow.
 */
export function ChiefResearchAssignmentBlock({
  assignment: seed,
  variant = "panel",
  allowRecordResult = true,
}: ChiefResearchAssignmentBlockProps) {
  const assignment = useLiveAssignment(seed);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const closed = researchAssignmentWorkflowClosed(assignment);
  const rootClass = [
    "chief-tool-read",
    variant === "home" ? "chief-tool-read--home" : "chief-tool-read--panel",
    "chief-tool-read--research",
    closed ? "chief-tool-read--research-closed" : "chief-tool-read--research-open",
  ].join(" ");
  const laneLabel = RESEARCH_ASSIGNMENT_LANE_LABEL[assignment.researcherLane];
  const statusLabel = RESEARCH_ASSIGNMENT_STATUS_LABEL[assignment.status];

  const statusPillClass =
    assignment.status === "completed"
      ? "chief-tool-read-pill--executed"
      : assignment.status === "sent"
        ? "chief-tool-read-pill--approved"
        : assignment.status === "failed"
          ? "chief-tool-read-pill--failed"
          : assignment.status === "ready"
            ? "chief-tool-read-pill--approval"
            : "chief-tool-read-pill--skipped";

  const createdLabel = formatTimestamp(assignment.createdAt);
  const sentLabel = formatTimestamp(assignment.sentAt);
  const completedLabel = formatTimestamp(assignment.completedAt ?? assignment.failedAt);

  return (
    <section className={rootClass} aria-label="Research assignment">
      <header className="chief-tool-read-meta">
        <span className="chief-tool-read-pill chief-tool-read-pill--source">Research</span>
        <span className="chief-tool-read-pill chief-tool-read-pill--project">
          {assignment.projectName}
        </span>
        <span className="chief-tool-read-pill">{laneLabel}</span>
        <span className={`chief-tool-read-pill ${statusPillClass}`}>{statusLabel}</span>
        {assignment.result ? (
          <span className="chief-tool-read-pill chief-tool-read-pill--readonly">
            {assignment.result.source === "operator_recorded"
              ? "Operator result"
              : "Controlled result"}
          </span>
        ) : null}
      </header>

      <p className="chief-tool-read-scope">
        <span className="chief-tool-read-scope-label">Mode</span>
        {RESEARCH_DISPATCH_MODE_LABEL[assignment.dispatchMode]}
      </p>

      <dl className="chief-obsidian-draft-fields">
        <div className="chief-obsidian-draft-field">
          <dt>Asked</dt>
          <dd>{assignment.prompt}</dd>
        </div>
        <div className="chief-obsidian-draft-field">
          <dt>Topic</dt>
          <dd>{assignment.topic}</dd>
        </div>
        <div className="chief-obsidian-draft-field">
          <dt>Lane</dt>
          <dd>{laneLabel}</dd>
        </div>
        <div className="chief-obsidian-draft-field">
          <dt>Requested output</dt>
          <dd>{assignment.requestedOutput}</dd>
        </div>
        <div className="chief-obsidian-draft-field">
          <dt>Timeline</dt>
          <dd className="chief-research-timeline">
            {createdLabel ? <span>Created {createdLabel}</span> : null}
            {sentLabel ? <span> · Sent {sentLabel}</span> : null}
            {completedLabel ? (
              <span>
                {" "}
                · {assignment.status === "failed" ? "Failed" : "Completed"} {completedLabel}
              </span>
            ) : null}
            {!sentLabel && assignment.status === "ready" ? (
              <span> · Not sent — approval required</span>
            ) : null}
          </dd>
        </div>
      </dl>

      {assignment.result ? (
        <div className="chief-research-result">
          <span className="chief-tool-read-scope-label">Findings</span>
          <dl className="chief-obsidian-draft-fields chief-research-result-meta">
            <div className="chief-obsidian-draft-field">
              <dt>Result source</dt>
              <dd>{RESEARCH_RESULT_SOURCE_LABEL[assignment.result.source]}</dd>
            </div>
            <div className="chief-obsidian-draft-field">
              <dt>Dispatch</dt>
              <dd>{RESEARCH_DISPATCH_MODE_LABEL[assignment.dispatchMode]}</dd>
            </div>
            <div className="chief-obsidian-draft-field">
              <dt>Recorded</dt>
              <dd>{formatTimestamp(assignment.result.recordedAt) ?? assignment.result.recordedAt}</dd>
            </div>
          </dl>
          <p className="chief-research-result-summary">{assignment.result.summary}</p>
          <ul className="chief-research-result-findings">
            {assignment.result.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
          <p className="chief-research-result-next">
            Next: {assignment.result.recommendedNextStep}
          </p>
          <p className="chief-tool-read-empty" role="status">
            Workflow complete — operator-driven,{" "}
            {RESEARCH_DISPATCH_MODE_LABEL[assignment.dispatchMode]}.
            {completedLabel ? ` Completed ${completedLabel}.` : ""}
          </p>
        </div>
      ) : (
        <p className="chief-tool-read-empty" role="status">
          {assignment.status === "ready"
            ? "Ready to send. Approve to dispatch (local_controlled — no live researcher backend)."
            : assignment.status === "sent"
              ? "Sent locally. No background researcher ran — record a controlled result to close the workflow."
              : assignment.status === "failed"
                ? (assignment.error ?? "Assignment failed.")
                : assignment.status === "draft"
                  ? "Draft only — finish preparing, then approve to send."
                  : "Research assignment prepared."}
        </p>
      )}

      {actionNote ? (
        <p className="chief-research-action-note" role="status">
          {actionNote}
        </p>
      ) : null}

      {allowRecordResult && assignment.status === "sent" ? (
        <div className="chief-research-assignment-actions">
          <button
            type="button"
            className="chief-btn chief-btn-secondary chief-btn--compact"
            onClick={() => {
              const outcome = completeResearchAssignmentWithControlledResult({
                assignmentId: assignment.id,
              });
              setActionNote(outcome.message);
            }}
          >
            Record controlled result (close workflow)
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Live list for Agents / home surfaces. */
export function useResearchAssignments(): ResearchAssignment[] {
  return useSyncExternalStore(
    subscribeResearchAssignments,
    listResearchAssignments,
    () => [],
  );
}
