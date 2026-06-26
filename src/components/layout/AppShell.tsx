"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ContextRail } from "./ContextRail";
import { SelectionContext } from "@/context/SelectionContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const shellClass = [
    "app-shell",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    railOpen ? "rail-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SelectionContext.Provider value={{ selectedEntityId, setSelectedEntityId }}>
      <div className={shellClass}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="main-column">
          <TopBar
            railOpen={railOpen}
            onToggleRail={() => setRailOpen((v) => !v)}
          />
          <main className="page-content">{children}</main>
        </div>

        <ContextRail
          open={railOpen}
          onClose={() => setRailOpen(false)}
          selectedEntityId={selectedEntityId}
        />
      </div>
    </SelectionContext.Provider>
  );
}
