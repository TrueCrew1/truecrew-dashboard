import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useData } from "@/context/DataContext";
import {
  DEFAULT_CHIEF_CONTEXT,
  GLOBAL_CHIEF_CONTEXT_ID,
  buildChiefContextList,
  chiefProjectToolScope,
  getChiefContextDefinition,
  isChiefContextId,
  resolveChiefProjects,
  type ChiefContextDefinition,
  type ChiefContextId,
} from "@/components/chief/chiefContext";
import type { AppProject, ProjectToolScope } from "@/data/projects";

const STORAGE_KEY = "truecrew.chief.activeContext";

function readStoredContext(): ChiefContextId {
  if (typeof window === "undefined") return DEFAULT_CHIEF_CONTEXT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && stored.length > 0 ? stored : DEFAULT_CHIEF_CONTEXT;
  } catch {
    return DEFAULT_CHIEF_CONTEXT;
  }
}

interface ChiefContextValue {
  activeContext: ChiefContextId;
  activeContextDefinition: ChiefContextDefinition;
  /** Global + every app project — powers the Project dropdown. */
  contextList: ChiefContextDefinition[];
  /** App project inventory behind the dropdown (excludes Global). */
  projects: AppProject[];
  /** GitHub/Obsidian scope for the active project; null when Global. */
  activeToolScope: ProjectToolScope | null;
  setActiveContext: (context: ChiefContextId) => void;
}

const ChiefContextContext = createContext<ChiefContextValue | null>(null);

/**
 * Holds Chief's active job context as real, persisted state.
 * Project options come from `resolveChiefProjects(data)` — known catalog +
 * projectIds on app tasks/workflows — not a Chief-only M&S hardcode.
 */
export function ChiefContextProvider({ children }: { children: ReactNode }) {
  const { data } = useData();
  const [activeContext, setActiveContextState] = useState<ChiefContextId>(readStoredContext);

  const projects = useMemo(
    () =>
      resolveChiefProjects({
        tasks: data.tasks,
        workflows: data.workflows,
        customers: data.customers,
      }),
    [data.tasks, data.workflows, data.customers],
  );

  const contextList = useMemo(() => buildChiefContextList(projects), [projects]);

  useEffect(() => {
    if (!isChiefContextId(activeContext, contextList)) {
      setActiveContextState(DEFAULT_CHIEF_CONTEXT);
    }
  }, [activeContext, contextList]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, activeContext);
    } catch {
      // Best-effort persistence only — in-memory state still switches this session.
    }
  }, [activeContext]);

  const setActiveContext = useCallback(
    (context: ChiefContextId) => {
      if (context === GLOBAL_CHIEF_CONTEXT_ID || isChiefContextId(context, contextList)) {
        setActiveContextState(context);
      }
    },
    [contextList],
  );

  const activeContextDefinition = getChiefContextDefinition(activeContext, contextList);
  const activeToolScope = useMemo(
    () => chiefProjectToolScope(activeContext, projects),
    [activeContext, projects],
  );

  const value = useMemo<ChiefContextValue>(
    () => ({
      activeContext,
      activeContextDefinition,
      contextList,
      projects,
      activeToolScope,
      setActiveContext,
    }),
    [activeContext, activeContextDefinition, contextList, projects, activeToolScope, setActiveContext],
  );

  return <ChiefContextContext.Provider value={value}>{children}</ChiefContextContext.Provider>;
}

export function useChiefContext() {
  const ctx = useContext(ChiefContextContext);
  if (!ctx) throw new Error("useChiefContext must be used within ChiefContextProvider");
  return ctx;
}
