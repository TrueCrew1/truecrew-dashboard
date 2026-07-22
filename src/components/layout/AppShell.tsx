import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ChiefPanel } from "@/components/chief/ChiefPanel";
import { ChiefApprovalsProvider } from "@/components/chief/ChiefApprovalsContext";
import { ChiefContextProvider } from "@/context/ChiefContextProvider";
import { ContextRail } from "./ContextRail";
import { SelectionContext } from "@/context/SelectionContext";

const RAIL_MAX_WIDTH = 1100;

function useShellLayoutConstraints() {
  const [railOpen, setRailOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [railAvailable, setRailAvailable] = useState(
    () => typeof window !== "undefined" && window.innerWidth > RAIL_MAX_WIDTH,
  );

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${RAIL_MAX_WIDTH}px)`);
    const sync = () => {
      const narrow = media.matches;
      setRailAvailable(!narrow);
      if (narrow) {
        setRailOpen(false);
      }
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const toggleRail = () => {
    if (!railAvailable) return;
    setRailOpen((open) => !open);
  };

  return {
    railOpen,
    railAvailable,
    toggleRail,
    closeRail: () => setRailOpen(false),
    sidebarCollapsed,
    setSidebarCollapsed,
  };
}

export function AppShell() {
  const {
    railOpen,
    railAvailable,
    toggleRail,
    closeRail,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useShellLayoutConstraints();
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
      <ChiefContextProvider>
        <ChiefApprovalsProvider>
          <div className={shellClass}>
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((v) => !v)}
            />

            <div className="main-column">
              <TopBar
                railOpen={railOpen}
                railAvailable={railAvailable}
                onToggleRail={toggleRail}
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
              onClose={closeRail}
              selectedEntityId={selectedEntityId}
            />
          </div>
        </ChiefApprovalsProvider>
      </ChiefContextProvider>
    </SelectionContext.Provider>
  );
}
