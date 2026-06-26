import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { WorkflowStage } from "@/types";

export interface LastAdvance {
  taskId: string;
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
}

interface AdvanceFeedbackContextValue {
  lastAdvance: LastAdvance | null;
  recordAdvance: (advance: LastAdvance) => void;
  clearLastAdvance: () => void;
}

const AdvanceFeedbackContext = createContext<AdvanceFeedbackContextValue | null>(null);

export function AdvanceFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [lastAdvance, setLastAdvance] = useState<LastAdvance | null>(null);

  const recordAdvance = useCallback((advance: LastAdvance) => {
    setLastAdvance(advance);
  }, []);

  const clearLastAdvance = useCallback(() => {
    setLastAdvance(null);
  }, []);

  const value = useMemo(
    () => ({ lastAdvance, recordAdvance, clearLastAdvance }),
    [lastAdvance, recordAdvance, clearLastAdvance],
  );

  return (
    <AdvanceFeedbackContext.Provider value={value}>{children}</AdvanceFeedbackContext.Provider>
  );
}

export function useAdvanceFeedback() {
  const ctx = useContext(AdvanceFeedbackContext);
  if (!ctx) {
    throw new Error("useAdvanceFeedback must be used within AdvanceFeedbackProvider");
  }
  return ctx;
}
