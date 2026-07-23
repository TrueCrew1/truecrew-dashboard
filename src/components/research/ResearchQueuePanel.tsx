import { formatChiefTimestamp } from "@/components/chief/chiefMock";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import {
  canTransitionResearchStatus,
  defaultFiledPathForTopic,
} from "@/lib/research/sessionStore";
import {
  RESEARCH_STATUS_LABEL,
  type ResearchRequest,
  type ResearchRequestSource,
  type ResearchRequestStatus,
} from "@/lib/research/types";

const SOURCE_LABEL: Record<ResearchRequestSource, string> = {
  session: "session",
  adapter: "adapter",
};

const STATUS_BADGE_CLASS: Record<ResearchRequestStatus, string> = {
  queued: "badge badge-steel",
  in_progress: "badge badge-yellow",
  done: "badge badge-green",
  blocked: "badge badge-red",
};

function ResearchSourceBadge({ source }: { source: ResearchRequestSource }) {
  const className =
    source === "session" ? "badge badge-green" : "badge badge-steel research-source-badge--adapter";
  return (
    <span
      className={className}
      title={
        source === "session"
          ? "Created this browser session from a command — not live API data."
          : "Hand-maintained program backlog — adapter-backed, not live API data."
      }
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}

interface ResearchQueuePanelProps {
  highlightId?: string | null;
  className?: string;
}

/**
 * Shared research queue — adapter-backed M&S backlog plus session requests
 * from the command bar. Session rows support operator-driven status; nothing auto-runs.
 */
export function ResearchQueuePanel({ highlightId, className }: ResearchQueuePanelProps) {
  const { allRequests, rail, syncError } = useResearchRequests();

  if (allRequests.length === 0) {
    return (
      <section
        className={["agent-research-queue", className].filter(Boolean).join(" ")}
        aria-label="Research queue"
      >
        <span className="agent-research-queue-label">Research queue</span>
        <p className="agent-research-queue-note">
          No research requests yet. Run{" "}
          <code>start research on M&amp;S estimating roadmap</code> from the command bar to add a
          session-backed request.
        </p>
      </section>
    );
  }

  return (
    <section
      className={["agent-research-queue", className].filter(Boolean).join(" ")}
      aria-label="Research queue"
    >
      <span className="agent-research-queue-label">Research queue</span>
      {rail === "live" ? (
        <p className="agent-research-queue-note">
          <span className="badge badge-green">live</span> queue backed by the database — status
          changes persist for every device. Advance status yourself; nothing auto-runs.
        </p>
      ) : (
        <p className="agent-research-queue-note">
          <span className="badge badge-green">session</span> rows are created from your commands and
          saved in this browser only. Advance status yourself — nothing auto-runs.{" "}
          <span className="badge badge-steel">adapter</span> rows are hand-maintained M&amp;S program
          backlog (status display only).
        </p>
      )}
      {syncError ? (
        <p className="agent-research-queue-note agent-research-queue-sync-error" role="alert">
          {syncError}
        </p>
      ) : null}
      <ul className="agent-research-queue-list">
        {allRequests.map((request) => (
          <ResearchQueueItem
            key={request.id}
            request={request}
            highlighted={highlightId === request.id}
          />
        ))}
      </ul>
      <p className="agent-research-queue-next">
        Next: investigate, then mark done with a filed path under{" "}
        <code>knowledge/findings/m-and-s/</code>.
      </p>
    </section>
  );
}

function ResearchQueueItem({
  request,
  highlighted,
}: {
  request: ResearchRequest;
  highlighted: boolean;
}) {
  const { updateRequestStatus, rail } = useResearchRequests();
  // Live rail: every row is database-backed and editable. Session rail:
  // adapter rows are static code, only browser-session rows can move.
  const canEdit = rail === "live" || request.source === "session";

  const startWork = () => {
    updateRequestStatus(request.id, "in_progress");
  };

  const markDone = () => {
    updateRequestStatus(request.id, "done", {
      filedPath: request.filedPath ?? defaultFiledPathForTopic(request.topic),
    });
  };

  const markBlocked = () => {
    const note = window.prompt("Why is this research blocked?", request.blockerNote ?? "");
    if (!note?.trim()) return;
    updateRequestStatus(request.id, "blocked", { blockerNote: note.trim() });
  };

  const requeue = () => {
    updateRequestStatus(request.id, "queued");
  };

  return (
    <li
      className={[
        "agent-research-queue-item",
        highlighted ? "agent-research-queue-item--highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      id={`research-request-${request.id}`}
    >
      <div className="agent-research-queue-item-header">
        <p className="agent-research-queue-topic">{request.topic}</p>
        <div className="agent-research-queue-badges">
          <span className={STATUS_BADGE_CLASS[request.status]}>
            {RESEARCH_STATUS_LABEL[request.status]}
          </span>
          <ResearchSourceBadge source={request.source} />
        </div>
      </div>
      <p className="agent-research-queue-why">{request.whyItMatters}</p>
      <p className="agent-research-queue-outcome">{request.suggestedOutcome}</p>
      {request.filedPath ? (
        <p className="agent-research-queue-filed">
          Filed: <code>{request.filedPath}</code>
        </p>
      ) : null}
      {request.blockerNote ? (
        <p className="agent-research-queue-blocker">Blocked: {request.blockerNote}</p>
      ) : null}
      <time className="agent-research-queue-time" dateTime={request.updatedAt}>
        Updated {formatChiefTimestamp(request.updatedAt)}
      </time>
      {canEdit ? (
        <div className="agent-research-queue-actions" role="group" aria-label="Advance research status">
          {canTransitionResearchStatus(request.status, "in_progress") ? (
            <button type="button" className="chief-btn chief-btn-primary" onClick={startWork}>
              Start work
            </button>
          ) : null}
          {canTransitionResearchStatus(request.status, "done") ? (
            <button type="button" className="chief-btn chief-btn-primary" onClick={markDone}>
              Mark done &amp; file
            </button>
          ) : null}
          {canTransitionResearchStatus(request.status, "blocked") ? (
            <button type="button" className="chief-btn" onClick={markBlocked}>
              Block
            </button>
          ) : null}
          {canTransitionResearchStatus(request.status, "queued") ? (
            <button type="button" className="chief-btn" onClick={requeue}>
              Re-queue
            </button>
          ) : null}
        </div>
      ) : (
        <p className="agent-research-queue-adapter-note">
          Adapter backlog — edit status in code/docs, not from this panel.
        </p>
      )}
    </li>
  );
}
