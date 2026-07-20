import { useDailyTurnover } from "@/hooks/useDailyTurnover";
import {
  DAILY_TURNOVER_DOC_REFERENCE,
  DAILY_TURNOVER_HISTORY_NOTE,
  deriveTurnoverUnavailableState,
  formatSlackDeliveryStatus,
  historyIsEmpty,
  messagePreview,
  summarizeTurnoverCounts,
  turnoverAvailabilityLabel,
  turnoverAvailabilityTone,
} from "@/lib/chief/dailyTurnoverView";

export function ChiefDailyTurnoverPanel() {
  const { liveApi, triggering, error, lastResult, history, trigger } = useDailyTurnover();
  const unavailable = deriveTurnoverUnavailableState({
    liveApi,
    loading: false,
    error: null,
  });

  const availabilityTone = turnoverAvailabilityTone(liveApi);
  const slackStatus = lastResult?.slack;

  return (
    <section
      className="chief-turnover-panel"
      aria-label="Daily turnover reporting"
      data-testid="chief-daily-turnover-panel"
    >
      <header className="chief-turnover-header">
        <h3 className="chief-turnover-title">Daily turnover</h3>
        <span className={`chief-turnover-pill chief-turnover-pill--${availabilityTone}`}>
          {turnoverAvailabilityLabel(liveApi)}
        </span>
      </header>

      <p className="chief-turnover-detail">
        Manual operator trigger for the Chief daily turnover summary. Slack delivery only
        occurs when <code>SLACK_WEBHOOK_URL</code> is configured server-side.
      </p>

      {unavailable ? (
        <div className="chief-turnover-state chief-turnover-state--unavailable">
          <p className="chief-turnover-headline">{unavailable.headline}</p>
          <p className="chief-turnover-meta">{unavailable.detail}</p>
        </div>
      ) : (
        <>
          <div className="chief-turnover-actions">
            <button
              type="button"
              className="chief-turnover-trigger"
              disabled={triggering}
              onClick={() => void trigger()}
            >
              {triggering ? "Generating turnover…" : "Generate daily turnover"}
            </button>
            {slackStatus ? (
              <p className="chief-turnover-meta">{formatSlackDeliveryStatus(slackStatus)}</p>
            ) : (
              <p className="chief-turnover-meta">No turnover result in this session yet.</p>
            )}
          </div>

          {error ? (
            <p className="chief-turnover-error" role="alert">
              {error}
            </p>
          ) : null}

          {lastResult ? (
            <div className="chief-turnover-result">
              <p className="chief-turnover-headline">Last result</p>
              <p className="chief-turnover-meta">
                Generated {new Date(lastResult.generatedAt).toLocaleString()}
              </p>
              <p className="chief-turnover-counts">
                {summarizeTurnoverCounts(lastResult.summary.counts)}
              </p>
              <pre className="chief-turnover-message">{lastResult.message}</pre>
              {lastResult.summary.dataNotes.length > 0 ? (
                <ul className="chief-turnover-notes">
                  {lastResult.summary.dataNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <div className="chief-turnover-history">
        <h4 className="chief-turnover-history-title">Recent session history</h4>
        <p className="chief-turnover-meta">{DAILY_TURNOVER_HISTORY_NOTE}</p>
        {historyIsEmpty(history) ? (
          <p className="chief-turnover-empty">No turnover history recorded yet.</p>
        ) : (
          <ul className="chief-turnover-history-list">
            {history.map((entry) => (
              <li key={`${entry.triggeredAt}-${entry.generatedAt}`} className="chief-turnover-history-item">
                <span className="chief-turnover-history-time">
                  {new Date(entry.triggeredAt).toLocaleString()}
                </span>
                <span className="chief-turnover-history-summary">
                  {summarizeTurnoverCounts(entry.counts)} · {formatSlackDeliveryStatus(entry.slack)}
                </span>
                <span className="chief-turnover-history-preview">{messagePreview(entry.message)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="chief-turnover-footnote">Reference: {DAILY_TURNOVER_DOC_REFERENCE}</p>
    </section>
  );
}
