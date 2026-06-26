import { useData } from "@/context/DataContext";

interface TopBarProps {
  onToggleRail: () => void;
  railOpen: boolean;
}

function IconBell() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5a4 4 0 0 0-4 4v2.1l-.9 1.8a.75.75 0 0 0 .67 1.1h8.46a.75.75 0 0 0 .67-1.1L12 7.6V5.5a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 13.5a1.5 1.5 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAlerts() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 12.5h11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M8 2.5v6.5M8 11v1"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopBar({ onToggleRail, railOpen }: TopBarProps) {
  const { data, source } = useData();
  const alertCount = data.alerts.length;
  const sevCount = data.incidents.filter((i) => i.severity <= 2).length;
  const notifyCount = alertCount + sevCount;

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="topbar-search-icon" aria-hidden="true">
          /
        </span>
        <input
          type="search"
          placeholder="Search tasks, services, customers…"
          aria-label="Global search"
        />
        <span className="topbar-search-kbd" aria-hidden="true">
          /
        </span>
      </div>

      <div className="topbar-actions">
        {source !== "mock" ? (
          <span className="badge badge-orange">{source}</span>
        ) : null}

        <button type="button" className="topbar-btn primary">
          Quick create
        </button>

        <span className="topbar-role">Admin</span>

        <button
          type="button"
          className="topbar-icon-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <IconBell />
        </button>

        <button
          type="button"
          className="topbar-icon-btn alert-badge"
          onClick={onToggleRail}
          aria-label="Toggle alerts panel"
          aria-pressed={railOpen}
          title="Alerts"
        >
          <IconAlerts />
          {notifyCount > 0 ? (
            <span className="alert-badge-count">{notifyCount}</span>
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
