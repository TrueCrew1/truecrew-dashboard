import { mockData } from "@/data/mockData";

interface TopBarProps {
  onToggleRail: () => void;
  railOpen: boolean;
}

export function TopBar({ onToggleRail, railOpen }: TopBarProps) {
  const alertCount = mockData.alerts.length;
  const sevCount = mockData.incidents.filter((i) => i.severity <= 2).length;

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
        <button type="button" className="topbar-btn primary">
          + Quick create
        </button>

        <button
          type="button"
          className="topbar-btn alert-badge"
          onClick={onToggleRail}
          aria-label="Toggle alerts panel"
          aria-pressed={railOpen}
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
