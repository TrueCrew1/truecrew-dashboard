import { FormEvent, useMemo, useRef, useState } from "react";
import { Panel } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { getChiefStartupSummary } from "@/lib/chiefStartupBehavior";
import { buildApprovalFromResponse, buildHistoryEntry, nextChiefId } from "./chiefMock";
import { deriveChiefBoardItems, resolveChiefCommand } from "./chiefLiveContext";
import { enqueueMemoryReviewPass } from "./memoryReviewProposal";
import { useChiefApprovals } from "./ChiefApprovalsContext";
import { ChiefSituationBrief } from "./ChiefSituationBrief";
import type { ChiefResponse } from "./types";

type MemoryReviewFeedback = "queued" | "already_pending" | null;

const SNAPSHOT_LIMIT = 4;

export function ChiefHomePanel() {
  const { data } = useData();
  const approvalSnapshotRef = useRef<HTMLDivElement>(null);

  // Shared with the sidebar Chief panel (ChiefApprovalsContext) — same
  // merged, decision-applied queue, so counts here stay in sync with the
  // sidebar within the same session instead of only matching at load.
  const { liveContext, approvals, addCommandApproval, addHistoryEntry } = useChiefApprovals();

  const pendingApprovals = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending"),
    [approvals],
  );

  const boardItems = useMemo(
    () => deriveChiefBoardItems(liveContext, approvals),
    [liveContext, approvals],
  );

  // Task blockers only, matching the Situation Brief's "Blocked" count
  // (context.blockingTasks.length) — the Board tab's "blocked" lane also
  // folds in held deploys, which would make this snapshot disagree with
  // the brief directly above it.
  const blockedItems = useMemo(
    () =>
      boardItems.filter(
        (item) => item.lane === "blocked" && item.id.startsWith("board-blocked-task-"),
      ),
    [boardItems],
  );

  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<ChiefResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Chief's Startup Behavior (AGENT_RUNBOOK § Chief Intake Rule +
  // AGENT_LANES_INTERNAL.md § Chief): surface whether a Memory Review Pass
  // is outstanding this session. Rendering this component at all means
  // DataContext and the shared approvals queue already resolved, so "ready"
  // is a true statement, not a placeholder.
  const startupSummary = useMemo(() => getChiefStartupSummary(approvals), [approvals]);
  const [memoryReviewFeedback, setMemoryReviewFeedback] = useState<MemoryReviewFeedback>(null);

  function handleRunMemoryReviewPass() {
    const result = enqueueMemoryReviewPass(approvals);
    if (result.outcome === "blocked") {
      setMemoryReviewFeedback("already_pending");
      return;
    }
    addCommandApproval(result.card);
    addHistoryEntry({
      id: nextChiefId("hist-memory-review"),
      command: "Run Memory Review Pass",
      timestamp: result.card.createdAt,
      resultSummary: result.card.summary,
      status: "pending",
    });
    setMemoryReviewFeedback("queued");
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = command.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    window.setTimeout(() => {
      const result = resolveChiefCommand(trimmed, data, liveContext, approvals);
      setResponse(result);
      addHistoryEntry(buildHistoryEntry(trimmed, result));

      const newApproval = buildApprovalFromResponse(trimmed, result);
      if (newApproval) {
        addCommandApproval(newApproval);
      }

      setIsProcessing(false);
    }, 320);
  };

  return (
    <Panel title="Chief">
      <div className="chief-home-panel">
        <ChiefSituationBrief
          context={liveContext}
          pendingApprovalCount={pendingApprovals.length}
          onOpenApprovals={() =>
            approvalSnapshotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />

        <div className="chief-home-startup">
          <div className="chief-home-startup-status">
            <span className="chief-home-startup-ready">● Chief session ready</span>
            <span
              className={`chief-home-startup-pill chief-home-startup-pill--${startupSummary.status}`}
            >
              Memory Review Pass:{" "}
              {startupSummary.status === "ok"
                ? "OK"
                : startupSummary.status === "due"
                  ? "Due"
                  : "Not run"}
            </span>
          </div>
          <p className="chief-home-startup-detail">{startupSummary.detail}</p>
          <div className="chief-home-startup-actions">
            <button
              type="button"
              className="chief-home-startup-button"
              onClick={handleRunMemoryReviewPass}
            >
              Run Memory Review Pass
            </button>
            {memoryReviewFeedback === "queued" ? (
              <span className="chief-home-startup-feedback" aria-live="polite">
                Queued — recorded in Approvals for your decision.
              </span>
            ) : null}
            {memoryReviewFeedback === "already_pending" ? (
              <span className="chief-home-startup-feedback" aria-live="polite">
                Already pending — see this card in Approvals below.
              </span>
            ) : null}
          </div>
        </div>

        <form className="chief-home-intake" onSubmit={handleSubmit}>
          <label className="chief-home-intake-label" htmlFor="chief-home-command">
            Ask Chief
          </label>
          <div className="chief-home-intake-row">
            <input
              id="chief-home-command"
              type="text"
              className="chief-home-intake-input"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="e.g. What is at risk today?"
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="chief-home-intake-submit"
              disabled={!command.trim() || isProcessing}
            >
              {isProcessing ? "Running…" : "Run"}
            </button>
          </div>

          {response ? (
            <div className="chief-home-response" aria-live="polite">
              <p className="chief-home-response-summary">{response.summary}</p>
              <p className="chief-home-response-action">
                <span className="chief-home-response-label">Recommended:</span>{" "}
                {response.recommendedAction}
              </p>
              {response.approvalNeeded ? (
                <p className="chief-home-response-approval">
                  Needs approval — filed to the Chief panel's Approvals tab for review.
                </p>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="chief-home-snapshots">
          <div className="chief-home-snapshot" ref={approvalSnapshotRef}>
            <header className="chief-home-snapshot-header">
              <h3 className="chief-home-snapshot-title">Needs approval</h3>
              <span className="chief-board-lane-count">{pendingApprovals.length}</span>
            </header>
            {pendingApprovals.length === 0 ? (
              <p className="agent-work-lane-empty">No pending proposals — queue is clear.</p>
            ) : (
              <ul className="chief-board-list">
                {pendingApprovals.slice(0, SNAPSHOT_LIMIT).map((proposal) => (
                  <li key={proposal.id}>
                    <div className="chief-board-card chief-board-card--critical">
                      <div className="chief-board-card-header">
                        <span className="chief-board-card-title">{proposal.title}</span>
                      </div>
                      <p className="chief-board-card-detail">{proposal.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pendingApprovals.length > SNAPSHOT_LIMIT ? (
              <p className="chief-board-lane-note">
                Showing {SNAPSHOT_LIMIT} of {pendingApprovals.length} — review the rest in the
                Chief panel's Approvals tab.
              </p>
            ) : null}
          </div>

          <div className="chief-home-snapshot">
            <header className="chief-home-snapshot-header">
              <h3 className="chief-home-snapshot-title">Blocked</h3>
              <span className="chief-board-lane-count">{blockedItems.length}</span>
            </header>
            {blockedItems.length === 0 ? (
              <p className="agent-work-lane-empty">No open gates or held deploys.</p>
            ) : (
              <ul className="chief-board-list">
                {blockedItems.slice(0, SNAPSHOT_LIMIT).map((item) => (
                  <li key={item.id}>
                    <div className={`chief-board-card chief-board-card--${item.tone}`}>
                      <div className="chief-board-card-header">
                        <span className="chief-board-card-title">{item.title}</span>
                        {item.meta ? <span className="chief-board-card-meta">{item.meta}</span> : null}
                      </div>
                      <p className="chief-board-card-detail">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {blockedItems.length > SNAPSHOT_LIMIT ? (
              <p className="chief-board-lane-note">
                Showing {SNAPSHOT_LIMIT} of {blockedItems.length} — see Builds or Review for the
                rest.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Panel>
  );
}
