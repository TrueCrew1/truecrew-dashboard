import { Link } from "react-router-dom";
import { Panel } from "@/components/ui";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import { CHIEF_ROUTES } from "@/components/chief/chiefRoutes";
import { isMsEstimatingRoadmapTopic } from "@/lib/research/sessionStore";
import {
  MS_ESTIMATING_ROADMAP_FINDING_PATH,
  RESEARCH_STATUS_LABEL,
  type ResearchRequest,
  type ResearchRequestStatus,
} from "@/lib/research/types";
import { useMemo } from "react";

function isMsResearch(request: ResearchRequest): boolean {
  return (
    isMsEstimatingRoadmapTopic(request.topic) ||
    /m\s*&\s*s|ms[\s-]?painting/i.test(request.topic) ||
    Boolean(request.filedPath?.includes("knowledge/findings/m-and-s/"))
  );
}

const STATUS_ORDER: ResearchRequestStatus[] = ["in_progress", "queued", "blocked", "done"];

/**
 * V1 live-readiness card: session + adapter M&S research status with filing path.
 * Reads ResearchRequestsContext — not mock ops data.
 */
export function MsResearchStatusCard() {
  const { allRequests, sessionRequests } = useResearchRequests();

  const msRequests = useMemo(() => allRequests.filter(isMsResearch), [allRequests]);
  const estimating = useMemo(
    () => sessionRequests.filter((row) => isMsEstimatingRoadmapTopic(row.topic)),
    [sessionRequests],
  );

  const counts = useMemo(() => {
    const tallies: Record<ResearchRequestStatus, number> = {
      queued: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
    };
    for (const row of msRequests) {
      tallies[row.status] += 1;
    }
    return tallies;
  }, [msRequests]);

  const headline = estimating[0] ?? msRequests.find((r) => r.source === "session") ?? msRequests[0];

  return (
    <Panel title="M&S research status">
      <div className="ms-research-status-card" aria-label="M and S research status">
        <p className="ms-research-status-lede">
          Session-backed Research lane for M&amp;S work. Create with{" "}
          <code>start research on M&amp;S estimating roadmap</code>, advance status in the queue,
          file under <code>{MS_ESTIMATING_ROADMAP_FINDING_PATH}</code>.
        </p>

        <ul className="ms-research-status-counts" aria-label="Status counts">
          {STATUS_ORDER.map((status) => (
            <li key={status}>
              <span className="ms-research-status-count-label">{RESEARCH_STATUS_LABEL[status]}</span>
              <span className="ms-research-status-count-value">{counts[status]}</span>
            </li>
          ))}
        </ul>

        {headline ? (
          <div className="ms-research-status-focus">
            <p className="ms-research-status-focus-topic">{headline.topic}</p>
            <p className="ms-research-status-focus-meta">
              {RESEARCH_STATUS_LABEL[headline.status]} · {headline.source}
              {headline.filedPath ? (
                <>
                  {" "}
                  · filed <code>{headline.filedPath}</code>
                </>
              ) : null}
            </p>
            <Link
              className="chief-btn chief-btn-secondary ms-research-status-link"
              to={`${CHIEF_ROUTES.knowledge}?highlight=${encodeURIComponent(headline.id)}`}
            >
              Open in research queue
            </Link>
          </div>
        ) : (
          <p className="ms-research-status-empty">
            No M&amp;S research requests yet. Use the command bar to create one — nothing is queued
            automatically.
          </p>
        )}

        <p className="ms-research-status-path">
          Target finding: <code>{MS_ESTIMATING_ROADMAP_FINDING_PATH}</code>
        </p>
      </div>
    </Panel>
  );
}
