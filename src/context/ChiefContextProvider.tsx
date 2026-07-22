import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CHIEF_CONTEXTS,
  DEFAULT_CHIEF_CONTEXT,
  isChiefContextId,
  type ChiefContextDefinition,
  type ChiefContextId,
} from "@/components/chief/chiefContext";

const STORAGE_KEY = "truecrew.chief.activeContext";

function readStoredContext(): ChiefContextId {
  if (typeof window === "undefined") return DEFAULT_CHIEF_CONTEXT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && isChiefContextId(stored) ? stored : DEFAULT_CHIEF_CONTEXT;
  } catch {
    return DEFAULT_CHIEF_CONTEXT;
  }
}

interface ChiefContextValue {
  activeContext: ChiefContextId;
  activeContextDefinition: ChiefContextDefinition;
  setActiveContext: (context: ChiefContextId) => void;
}

const ChiefContextContext = createContext<ChiefContextValue | null>(null);

/**
 * Holds Chief's active job context (global vs. a project like M&S Painting)
 * as real, persisted state — not a prompt. Every Chief data source
 * (ChiefApprovalsContext, ChiefPanel, ChiefHomePanel, AgentWorkBoard,
 * AgentStatusStrip) reads `activeContext` from here and scopes its data
 * accordingly. Persisted to localStorage so a context switch survives a
 * reload instead of resetting to global.
 */
export function ChiefContextProvider({ children }: { children: ReactNode }) {
  const [activeContext, setActiveContextState] = useState<ChiefContextId>(readStoredContext);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, activeContext);
    } catch {
      // Best-effort persistence only — in-memory state still switches Chief's context this session.
    }
  }, [activeContext]);

  const setActiveContext = useCallback((context: ChiefContextId) => {
    setActiveContextState(context);
  }, []);

  const value = useMemo<ChiefContextValue>(
    () => ({
      activeContext,
      activeContextDefinition: CHIEF_CONTEXTS[activeContext],
      setActiveContext,
    }),
    [activeContext, setActiveContext],
  );

  return <ChiefContextContext.Provider value={value}>{children}</ChiefContextContext.Provider>;
}

export function useChiefContext() {
  const ctx = useContext(ChiefContextContext);
  if (!ctx) throw new Error("useChiefContext must be used within ChiefContextProvider");
  return ctx;
}
