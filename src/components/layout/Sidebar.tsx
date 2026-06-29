import { NavLink } from "react-router-dom";
import { useData } from "@/context/DataContext";

interface NavItem {
  to: string;
  icon: string;
  label: string;
  badge?: number;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { data } = useData();

  const navSections: { label: string; items: NavItem[] }[] = [
    {
      label: "Focus",
      items: [
        { to: "/", icon: "◉", label: "Today", badge: data.focusItems.length },
        { to: "/dashboard", icon: "▣", label: "Dashboard" },
      ],
    },
    {
      label: "Operations",
      items: [
        { to: "/operations", icon: "⚙", label: "Operations" },
        { to: "/builds", icon: "⬡", label: "Builds" },
        {
          to: "/monitor",
          icon: "◎",
          label: "Monitor",
          badge: data.incidents.filter((i) => i.severity <= 2).length || undefined,
        },
        { to: "/repair", icon: "⛊", label: "Repair" },
      ],
    },
    {
      label: "Business",
      items: [
        { to: "/customers", icon: "◈", label: "Customers" },
        { to: "/knowledge", icon: "◫", label: "AI & Knowledge" },
        { to: "/review", icon: "◑", label: "Review" },
      ],
    },
    {
      label: "System",
      items: [{ to: "/settings", icon: "⬢", label: "Settings" }],
    },
  ];

  const showLabels = mobileOpen || !collapsed;

  return (
    <aside className={`sidebar${mobileOpen ? " sidebar-mobile-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-mark">TC</div>
        {showLabels ? (
          <div className="sidebar-title">
            True <span>Crew</span>
          </div>
        ) : null}
        {mobileOpen ? (
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            ×
          </button>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            {showLabels ? (
              <div className="nav-section-label">{section.label}</div>
            ) : null}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `nav-link${isActive ? " active" : ""}`
                }
                title={showLabels ? undefined : item.label}
                onClick={onMobileClose}
              >
                <span className="nav-icon">{item.icon}</span>
                {showLabels ? (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge ? (
                      <span className="nav-badge">{item.badge}</span>
                    ) : null}
                  </>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "← Collapse"}
        </button>
      </div>
    </aside>
  );
}
