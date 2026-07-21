import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChiefTab } from "./types";

interface ChiefTabRequest {
  tab: ChiefTab;
  filter?: string;
  /** Distinguishes repeat requests for the same tab so the effect re-fires. */
  nonce: number;
}

interface ChiefUIContextValue {
  /** Latest "switch Chief to this tab" request — consumed by ChiefPanel. */
  tabRequest: ChiefTabRequest | null;
  /** Text the Agents board should filter by, set alongside an agents-tab request. */
  agentFilter: string | null;
  /** Ask Chief's panel to switch tabs, optionally carrying a filter (currently only agents reads it). */
  requestChiefTab: (tab: ChiefTab, filter?: string) => void;
  clearAgentFilter: () => void;
}

const ChiefUIContext = createContext<ChiefUIContextValue | null>(null);

/**
 * Cross-surface UI signaling between the global command bar (TopBar) and
 * Chief's own side panel — separate from ChiefApprovalsContext (which owns
 * data: approvals/history/liveContext) because this is purely "which tab is
 * Chief showing," not app or approval state.
 */
export function ChiefUIProvider({ children }: { children: ReactNode }) {
  const [tabRequest, setTabRequest] = useState<ChiefTabRequest | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const value = useMemo<ChiefUIContextValue>(
    () => ({
      tabRequest,
      agentFilter,
      requestChiefTab: (tab, filter) => {
        setTabRequest({ tab, filter, nonce: Date.now() });
        setAgentFilter(filter ?? null);
      },
      clearAgentFilter: () => setAgentFilter(null),
    }),
    [tabRequest, agentFilter],
  );

  return <ChiefUIContext.Provider value={value}>{children}</ChiefUIContext.Provider>;
}

export function useChiefUI() {
  const ctx = useContext(ChiefUIContext);
  if (!ctx) throw new Error("useChiefUI must be used within ChiefUIProvider");
  return ctx;
}
