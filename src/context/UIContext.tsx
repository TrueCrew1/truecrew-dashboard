import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface UIContextValue {
  selectedEntityId: string | null;
  setSelectedEntityId: (id: string | null) => void;
  railOpen: boolean;
  setRailOpen: (open: boolean) => void;
  openRailForEntity: (id: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openRailForEntity = useCallback((id: string) => {
    setSelectedEntityId(id);
    setRailOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      selectedEntityId,
      setSelectedEntityId,
      railOpen,
      setRailOpen,
      openRailForEntity,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [selectedEntityId, railOpen, openRailForEntity, sidebarCollapsed],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
