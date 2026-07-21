import { useData } from "@/context/DataContext";

interface TopBarProps {
  onToggleRail: () => void;
  railOpen: boolean;
  railAvailable?: boolean;
}

/**
 * Top bar actions only. Global “search” was removed — it was an uncontrolled
 * dead input. Command intake lives on Chief (Today Ask Chief + sidebar Command).
 */
export function TopBar({ onToggleRail, railOpen, railAvailable = true }: TopBarProps) {
  const { data, source } = useData();
  const alertCount = data.alerts.length;
  const sevCount = data.incidents.filter((i) => i.severity <= 2).length;

  return (
    <header className="topbar">
      <div className="topbar-brand-slot" aria-hidden="true" />

      <div className="topbar-actions">
        {source !== "mock" ? (
          <span className="badge badge-orange">{source}</span>
        ) : null}

        <button type="button" className="topbar-btn primary">
          + Quick create
        </button>

        <button
          type="button"
          className="topbar-btn alert-badge"
          onClick={onToggleRail}
          aria-label="Toggle alerts panel"
          aria-pressed={railOpen}
          disabled={!railAvailable}
          title={railAvailable ? undefined : "Alerts panel needs a wider screen"}
        >
          Alerts
          {alertCount > 0 ? (
            <span className="alert-badge-count">{alertCount}</span>
          ) : null}
        </button>

        {sevCount > 0 ? (
          <span className="badge badge-red">Sev 1–2: {sevCount}</span>
        ) : (
          <span className="badge badge-green">All clear</span>
        )}

        <div className="topbar-avatar" title="Founder">
          F
        </div>
      </div>
    </header>
  );
}
