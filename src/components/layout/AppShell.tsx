import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ContextRail } from "./ContextRail";
import { AdvanceFeedbackProvider, useAdvanceFeedback } from "@/context/AdvanceFeedbackContext";
import { SelectionContext } from "@/context/SelectionContext";

function AppShellContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [selectedEntityId, setSelectedEntityIdState] = useState<string | null>(null);
  const { clearLastAdvance } = useAdvanceFeedback();

  const setSelectedEntityId = useCallback(
    (id: string | null) => {
      setSelectedEntityIdState((current) => {
        if (current !== id) {
          clearLastAdvance();
        }
        return id;
      });
    },
    [clearLastAdvance],
  );

  const handleCloseRail = useCallback(() => {
    clearLastAdvance();
    setRailOpen(false);
  }, [clearLastAdvance]);

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
          <main className="page-content">
            <Outlet />
          </main>
        </div>

        <ContextRail
          open={railOpen}
          onClose={handleCloseRail}
          selectedEntityId={selectedEntityId}
        />
      </div>
    </SelectionContext.Provider>
  );
}

export function AppShell() {
  return (
    <AdvanceFeedbackProvider>
      <AppShellContent />
    </AdvanceFeedbackProvider>
  );
}
