import { formatChiefTimestamp } from "./chiefMock";
import type { CommandHistoryEntry, CommandHistoryStatus } from "./types";

interface CommandHistoryProps {
  entries: CommandHistoryEntry[];
}

const STATUS_LABEL: Record<CommandHistoryStatus, string> = {
  completed: "Completed",
  pending: "Routing",
  failed: "Failed",
};

const STATUS_BADGE: Record<CommandHistoryStatus, string> = {
  completed: "badge-green",
  pending: "badge-yellow",
  failed: "badge-red",
};

export function CommandHistory({ entries }: CommandHistoryProps) {
  if (entries.length === 0) {
    return (
      <div className="chief-section-empty">
        <p className="chief-section-empty-lead">No commands yet</p>
        <p className="chief-section-empty-desc">
          Commands you send to Chief will appear here with result summaries.
        </p>
      </div>
    );
  }

  return (
    <div className="chief-history">
      <div className="chief-section-header">
        <h2 className="chief-section-title">Command history</h2>
        <span className="chief-section-count">{entries.length} recent</span>
      </div>

      <div className="chief-history-list">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className={`chief-history-card chief-history-card--${entry.status}`}
          >
            <div className="chief-history-card-header">
              <p className="chief-history-command">{entry.command}</p>
              <span className={`badge ${STATUS_BADGE[entry.status]}`}>
                {STATUS_LABEL[entry.status]}
              </span>
            </div>
            <time className="chief-history-time" dateTime={entry.timestamp}>
              {formatChiefTimestamp(entry.timestamp)}
            </time>
            <p className="chief-history-result">{entry.resultSummary}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
