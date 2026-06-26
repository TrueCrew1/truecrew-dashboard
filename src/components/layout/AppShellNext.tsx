"use client";

import { useState } from "react";
import { FoundationSidebar } from "./FoundationSidebar";
import { FoundationTopBar } from "./FoundationTopBar";
import type { ProfileRow } from "@/types/database";

export function AppShell({
  profile,
  children,
}: {
  profile: ProfileRow | null;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const shellClass = ["app-shell", sidebarCollapsed ? "sidebar-collapsed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <FoundationSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="main-column">
        <FoundationTopBar profile={profile} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
