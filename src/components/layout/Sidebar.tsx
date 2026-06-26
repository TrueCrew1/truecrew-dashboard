"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "@/context/DataContext";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data } = useData();

  const navSections: { label: string; items: NavItem[] }[] = [
    {
      label: "Command",
      items: [{ href: "/", icon: "▣", label: "Command Center" }],
    },
    {
      label: "Work",
      items: [
        { href: "/today", icon: "◉", label: "Today", badge: data.focusItems.length },
        { href: "/workspace", icon: "⚙", label: "Assigned Work" },
      ],
    },
    {
      label: "Data",
      items: [{ href: "/records", icon: "◈", label: "Records" }],
    },
    {
      label: "System",
      items: [
        { href: "/admin", icon: "⬢", label: "Administration" },
        { href: "/audit", icon: "◫", label: "Audit Log" },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed ? (
              <div className="nav-section-label">{section.label}</div>
            ) : null}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive(item.href) ? " active" : ""}`}
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
              </Link>
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
