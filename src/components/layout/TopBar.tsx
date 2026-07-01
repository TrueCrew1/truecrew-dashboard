import { useData } from "@/context/DataContext";

interface TopBarProps {
  onToggleRail: () => void;
  railOpen: boolean;
  railAvailable?: boolean;
}

export function TopBar({ onToggleRail, railOpen, railAvailable = true }: TopBarProps) {
  const { data, source } = useData();
  const alertCount = data.alerts.length;
  const sevCount = data.incidents.filter((i) => i.severity <= 2).length;

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-icon">⌕</span>
        <input
          type="search"
          placeholder="Search tasks, services, customers, notes…"
          aria-label="Global search"
        />
      </div>

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
