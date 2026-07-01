import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ChiefPanel } from "@/components/chief/ChiefPanel";
import { ContextRail } from "./ContextRail";
import { SelectionContext } from "@/context/SelectionContext";

export function AppShell() {
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
          <div className="main-workspace">
            <main className="page-content">
              <Outlet />
            </main>
          </div>
        </div>

        <ChiefPanel />

        <ContextRail
          open={railOpen}
          onClose={() => setRailOpen(false)}
          selectedEntityId={selectedEntityId}
        />
      </div>
    </SelectionContext.Provider>
  );
}
