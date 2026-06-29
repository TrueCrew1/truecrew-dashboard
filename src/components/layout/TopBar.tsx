import { useData } from "@/context/DataContext";

interface TopBarProps {
  onToggleRail: () => void;
  railOpen: boolean;
  onToggleMobileNav?: () => void;
}

export function TopBar({ onToggleRail, railOpen, onToggleMobileNav }: TopBarProps) {
  const { data, source } = useData();
  const alertCount = data.alerts.length;
  const sevCount = data.incidents.filter((i) => i.severity <= 2).length;

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onToggleMobileNav}
        aria-label="Open navigation"
      >
        ☰
      </button>

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
          <span className="badge badge-orange topbar-source-badge">{source}</span>
        ) : null}

        <button type="button" className="topbar-btn primary">
          <span className="topbar-btn-short">+</span>
          <span className="topbar-btn-full">+ Quick create</span>
        </button>

        <button
          type="button"
          className="topbar-btn alert-badge"
          onClick={onToggleRail}
          aria-label="Toggle alerts panel"
          aria-pressed={railOpen}
        >
          <span className="topbar-btn-full">Alerts</span>
          <span className="topbar-btn-short">⌁</span>
          {alertCount > 0 ? (
            <span className="alert-badge-count">{alertCount}</span>
          ) : null}
        </button>

        {sevCount > 0 ? (
          <span className="badge badge-red topbar-sev-badge">Sev 1–2: {sevCount}</span>
        ) : (
          <span className="badge badge-green topbar-sev-badge">All clear</span>
        )}

        <div className="topbar-avatar" title="Founder">
          F
        </div>
      </div>
    </header>
  );
}
