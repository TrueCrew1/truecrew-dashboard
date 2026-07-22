import { formatChiefTimestamp } from "@/components/chief/chiefMock";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import type { ResearchRequest, ResearchRequestSource } from "@/lib/research/types";

const SOURCE_LABEL: Record<ResearchRequestSource, string> = {
  session: "session",
  adapter: "adapter",
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
 * from the command bar. Read-only; nothing auto-runs or auto-files.
 */
export function ResearchQueuePanel({ highlightId, className }: ResearchQueuePanelProps) {
  const { allRequests } = useResearchRequests();

  if (allRequests.length === 0) {
    return (
      <section
        className={["agent-research-queue", className].filter(Boolean).join(" ")}
        aria-label="Research queue"
      >
        <span className="agent-research-queue-label">Research queue</span>
        <p className="agent-research-queue-note">
          No research requests yet. Run{" "}
          <code>start research on M&amp;S Painting …</code> from the command bar to add a
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
      <p className="agent-research-queue-note">
        <span className="badge badge-green">session</span> rows are created from your commands and
        saved in this browser only. <span className="badge badge-steel">adapter</span> rows are
        hand-maintained M&amp;S program backlog — nothing here auto-runs or auto-files.
      </p>
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
        Next: investigate the topic, then file a findings note in{" "}
        <code>knowledge/sources/</code> when ready.
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
        <ResearchSourceBadge source={request.source} />
      </div>
      <p className="agent-research-queue-why">{request.whyItMatters}</p>
      <p className="agent-research-queue-outcome">{request.suggestedOutcome}</p>
      <time className="agent-research-queue-time" dateTime={request.createdAt}>
        {formatChiefTimestamp(request.createdAt)}
      </time>
    </li>
  );
}
