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

function ResearchSourceBadge({
  source,
  liveRail,
}: {
  source: ResearchRequestSource;
  liveRail: boolean;
}) {
  const className =
    source === "session" ? "badge badge-green" : "badge badge-steel research-source-badge--adapter";
  const title =
    source === "session"
      ? liveRail
        ? "Created from a command — stored in the live research_requests table when sync succeeds."
        : "Created this browser session from a command — not yet on the live API."
      : liveRail
        ? "Program backlog row from the live research_requests table."
        : "Hand-maintained program backlog (static) until the live API rail is available.";
  return (
    <span className={className} title={title}>
      {SOURCE_LABEL[source]}
    </span>
  );
}

interface ResearchQueuePanelProps {
  highlightId?: string | null;
  className?: string;
}

/**
 * Shared research queue — live Supabase rows when the API rail is up, otherwise
 * adapter backlog plus session requests. Operator approve (Chief) or Start work
 * moves queued → in_progress; the research runner picks in_progress only.
 */
export function ResearchQueuePanel({ highlightId, className }: ResearchQueuePanelProps) {
  const { allRequests, rail, syncError, refreshLiveQueue } = useResearchRequests();
  const liveRail = rail === "live";

  if (rail === "loading") {
    return (
      <section
        className={["agent-research-queue", className].filter(Boolean).join(" ")}
        aria-label="Research queue"
        aria-busy="true"
      >
        <span className="agent-research-queue-label">Research queue</span>
        <p className="agent-research-queue-note">Loading live research queue…</p>
      </section>
    );
  }

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
          request, or confirm the live API + <code>research_requests</code> migration.
        </p>
        {syncError ? (
          <p className="agent-research-queue-note agent-research-queue-sync-error" role="alert">
            {syncError}{" "}
            <button type="button" className="chief-btn" onClick={refreshLiveQueue}>
              Retry
            </button>
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={["agent-research-queue", className].filter(Boolean).join(" ")}
      aria-label="Research queue"
    >
      <span className="agent-research-queue-label">Research queue</span>
      {liveRail ? (
        <p className="agent-research-queue-note">
          <span className="badge badge-green">live</span> queue backed by{" "}
          <code>research_requests</code> — approve a Start-research card in Chief to move a row to{" "}
          <strong>in progress</strong> (runner pickup signal). Soft-refreshes every 30s.
        </p>
      ) : (
        <p className="agent-research-queue-note">
          <span className="badge badge-steel">session</span> rail — live API off or unreachable.
          Approving Start-research still moves a row to in progress in this browser; it will not sync
          to other devices until the live rail is up.
        </p>
      )}
      {syncError ? (
        <p className="agent-research-queue-note agent-research-queue-sync-error" role="alert">
          {syncError}{" "}
          <button type="button" className="chief-btn" onClick={refreshLiveQueue}>
            Retry
          </button>
        </p>
      ) : null}
      <ul className="agent-research-queue-list">
        {allRequests.map((request) => (
          <ResearchQueueItem
            key={request.id}
            request={request}
            highlighted={highlightId === request.id}
            liveRail={liveRail}
          />
        ))}
      </ul>
      <p className="agent-research-queue-next">
        Next: investigate, then mark done with a filed path under{" "}
        <code>knowledge/findings/m-and-s/</code> (or{" "}
        <code>npm run research:runner -- done …</code>).
      </p>
    </section>
  );
}

function ResearchQueueItem({
  request,
  highlighted,
  liveRail,
}: {
  request: ResearchRequest;
  highlighted: boolean;
  liveRail: boolean;
}) {
  const { updateRequestStatus } = useResearchRequests();

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
          <ResearchSourceBadge source={request.source} liveRail={liveRail} />
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
    </li>
  );
}
