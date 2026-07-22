import type { ChiefDoingNow, ChiefOpsDeskSnapshot } from "./chiefVoice";

interface ChiefOpsDeskStripProps {
  doingNow: ChiefDoingNow;
  snapshot: ChiefOpsDeskSnapshot;
  onOpenApprovals: () => void;
  onFocusActiveTask?: (proposalId: string) => void;
}

/**
 * Live ops-desk strip: what Chief is doing, plus queue / active / blocker / next.
 */
export function ChiefOpsDeskStrip({
  doingNow,
  snapshot,
  onOpenApprovals,
  onFocusActiveTask,
}: ChiefOpsDeskStripProps) {
  return (
    <section className="chief-ops-desk" aria-label="Chief operations desk">
      <div
        className={`chief-ops-desk-now chief-ops-desk-now--${doingNow.tone}`}
        role="status"
        aria-live="polite"
      >
        <span className="chief-ops-desk-now-label">Chief is</span>
        <span className="chief-ops-desk-now-status">{doingNow.label}</span>
        <p className="chief-ops-desk-now-detail">{doingNow.detail}</p>
      </div>

      <div className="chief-ops-desk-grid">
        <button
          type="button"
          className={`chief-ops-desk-cell${snapshot.queueCount > 0 ? " chief-ops-desk-cell--critical" : ""}`}
          onClick={onOpenApprovals}
          disabled={snapshot.queueCount === 0}
        >
          <span className="chief-ops-desk-cell-label">Queue</span>
          <span className="chief-ops-desk-cell-value">{snapshot.queueCount}</span>
          <span className="chief-ops-desk-cell-meta">
            {snapshot.queueCount === 0 ? "Clear" : "Pending approvals"}
          </span>
        </button>

        {snapshot.activeTask && snapshot.activeTaskId ? (
          <button
            type="button"
            className="chief-ops-desk-cell chief-ops-desk-cell--critical"
            onClick={() =>
              onFocusActiveTask
                ? onFocusActiveTask(snapshot.activeTaskId!)
                : onOpenApprovals()
            }
          >
            <span className="chief-ops-desk-cell-label">Active task</span>
            <span className="chief-ops-desk-cell-value chief-ops-desk-cell-value--text">
              {snapshot.activeTask}
            </span>
            <span className="chief-ops-desk-cell-meta">Oldest pending</span>
          </button>
        ) : (
          <div className="chief-ops-desk-cell" aria-disabled="true">
            <span className="chief-ops-desk-cell-label">Active task</span>
            <span className="chief-ops-desk-cell-value chief-ops-desk-cell-value--text">
              None
            </span>
            <span className="chief-ops-desk-cell-meta">Nothing waiting on you</span>
          </div>
        )}

        <div
          className={`chief-ops-desk-cell${snapshot.blocker ? " chief-ops-desk-cell--warn" : ""}`}
          aria-disabled="true"
        >
          <span className="chief-ops-desk-cell-label">Blocker</span>
          <span className="chief-ops-desk-cell-value chief-ops-desk-cell-value--text">
            {snapshot.blocker ?? "None"}
          </span>
          <span className="chief-ops-desk-cell-meta">
            {snapshot.blocker ? "Gate or held work" : "No open gates"}
          </span>
        </div>

        <div
          className={`chief-ops-desk-cell chief-ops-desk-cell--${snapshot.nextActionTone}`}
          aria-disabled="true"
        >
          <span className="chief-ops-desk-cell-label">Next action</span>
          <span className="chief-ops-desk-cell-value chief-ops-desk-cell-value--text">
            {snapshot.nextAction}
          </span>
          <span className="chief-ops-desk-cell-meta">Chief recommendation</span>
        </div>
      </div>
    </section>
  );
}
