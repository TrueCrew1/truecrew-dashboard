"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "▣", label: "Command Center" },
  { href: "/today", icon: "◉", label: "Today" },
  { href: "/workspace", icon: "▤", label: "Workspace" },
  { href: "/records", icon: "▥", label: "Records" },
  { href: "/admin", icon: "⬢", label: "Admin" },
  { href: "/audit", icon: "◧", label: "Audit" },
];

export function FoundationSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-mark">TC</div>
        {!collapsed ? (
          <div className="sidebar-title">
            True <span>Crew</span>
          </div>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        <div>
          {!collapsed ? <div className="nav-section-label">Foundation</div> : null}
          {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive ? " active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed ? <span className="nav-label">{item.label}</span> : null}
            </Link>
          );
        })}
        </div>
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
