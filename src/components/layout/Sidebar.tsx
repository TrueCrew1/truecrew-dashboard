import { NavLink } from "react-router-dom";
import { useData } from "@/context/DataContext";

interface NavItem {
  to: string;
  icon: string;
  label: string;
  badge?: number;
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
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

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img className="sidebar-mark" src="/logo.png" alt="True Crew" />
        {!collapsed ? (
          <div className="sidebar-title">
            True <span>Crew</span>
          </div>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
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
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed ? (
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
