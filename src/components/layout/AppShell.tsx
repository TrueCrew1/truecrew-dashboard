import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ContextRail } from "./ContextRail";
import { useUI } from "@/context/UIContext";

export function AppShell() {
  const {
    selectedEntityId,
    railOpen,
    setRailOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useUI();

  const shellClass = [
    "app-shell",
    sidebarCollapsed ? "sidebar-collapsed" : "",
    railOpen ? "rail-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="main-column">
        <TopBar
          railOpen={railOpen}
          onToggleRail={() => setRailOpen(!railOpen)}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <ContextRail
        open={railOpen}
        onClose={() => setRailOpen(false)}
        selectedEntityId={selectedEntityId}
      />
    </div>
  );
}
