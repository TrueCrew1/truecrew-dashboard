import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mockData, type MockData } from "@/data/mockData";
import {
  ArtifactExistsError,
  createMaintenanceNote as createMaintenanceNoteApi,
  createTaskArtifact as createTaskArtifactApi,
  fetchCommandCenterData,
  isLiveApiEnabled,
  mergeWithMockFallback,
  patchTaskStage,
} from "@/lib/api/client";
import {
  createMockArtifact,
  listMockArtifactsForTask,
} from "@/lib/librarian/mockCreate";
import { noteToMaintenanceNote } from "../../lib/maintenance/artifact";
import type { Artifact, Persona, WorkflowStage, WorkItem } from "@/types";

function applyTaskStage(data: MockData, taskId: string, stage: WorkflowStage): MockData {
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      task.id === taskId
        ? { ...task, stage, updatedAt: new Date().toISOString() }
        : task,
    ),
    focusItems: data.focusItems.map((item) =>
      item.taskId === taskId ? { ...item, stage } : item,
    ),
  };
}

/** Soft-poll interval for live command-center data (Agents board, Today, etc.). */
const LIVE_DATA_POLL_MS = 30_000;

interface DataContextValue {
  data: MockData;
  tasks: MockData["tasks"];
  loading: boolean;
  source: "mock" | "supabase" | "mock-fallback";
  error: string | null;
  /** `soft: true` refreshes without flipping the global loading skeleton (used by polling). */
  refresh: (options?: { soft?: boolean }) => Promise<void>;
  updateTaskStage: (taskId: string, stage: WorkflowStage) => Promise<void>;
  isTaskUpdating: (taskId: string) => boolean;
  getTaskArtifacts: (taskId: string) => Artifact[];
  createTaskArtifact: (
    taskId: string,
    options?: { useAi?: boolean; actor?: Persona },
  ) => Promise<{ workItem: WorkItem; artifact: Artifact; vaultWritten: boolean }>;
  isArtifactCreating: (taskId: string) => boolean;
  getTaskMaintenanceNotes: (taskId: string) => Artifact[];
  createMaintenanceNote: (
    taskId: string,
    options?: { actor?: Persona },
  ) => Promise<{ workItem: WorkItem; note: Artifact; vaultWritten: boolean }>;
  isMaintenanceNoteCreating: (taskId: string) => boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MockData>(mockData);
  const [loading, setLoading] = useState(isLiveApiEnabled());
  const [source, setSource] = useState<DataContextValue["source"]>("mock");
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());
  const [creatingArtifactTaskIds, setCreatingArtifactTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [creatingMaintenanceNoteTaskIds, setCreatingMaintenanceNoteTaskIds] = useState<
    Set<string>
  >(new Set());

  const refresh = useCallback(async (options?: { soft?: boolean }) => {
    if (!isLiveApiEnabled()) {
      setData(mockData);
      setSource("mock");
      setError(null);
      setLoading(false);
      return;
    }

    const soft = options?.soft === true;
    if (!soft) setLoading(true);
    try {
      const live = await fetchCommandCenterData();
      const hasLiveTasks = live.tasks.length > 0;
      setData(hasLiveTasks ? (live as MockData) : mergeWithMockFallback(live));
      setSource(hasLiveTasks ? "supabase" : "mock-fallback");
      setError(null);
    } catch (err) {
      // Soft polls keep the last good payload; hard refresh falls back to mock.
      if (!soft) {
        setData(mockData);
        setSource("mock-fallback");
      }
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      if (!soft) setLoading(false);
    }
  }, []);

  const updateTaskStage = useCallback(async (taskId: string, stage: WorkflowStage) => {
    let snapshot: MockData | null = null;

    setData((prev) => {
      snapshot = prev;
      return applyTaskStage(prev, taskId, stage);
    });

    setUpdatingTaskIds((prev) => new Set(prev).add(taskId));

    if (!isLiveApiEnabled()) {
      setUpdatingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      return;
    }

    try {
      const updated = await patchTaskStage(taskId, stage);
      setData((prev) => applyTaskStage(prev, taskId, updated.stage));
    } catch (err) {
      if (snapshot) setData(snapshot);
      throw err;
    } finally {
      setUpdatingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  const getTaskArtifacts = useCallback(
    (taskId: string) => listMockArtifactsForTask(data.notes, taskId),
    [data.notes],
  );

  const getTaskMaintenanceNotes = useCallback(
    (taskId: string) =>
      data.notes
        .map((note) => noteToMaintenanceNote(note))
        .filter(
          (note): note is Artifact => note !== null && note.workItemId === taskId,
        ),
    [data.notes],
  );

  const createTaskArtifact = useCallback(
    async (taskId: string, options: { useAi?: boolean; actor?: Persona } = {}) => {
      setCreatingArtifactTaskIds((prev) => new Set(prev).add(taskId));

      try {
        if (!isLiveApiEnabled()) {
          const task = data.tasks.find((t) => t.id === taskId);
          if (!task) throw new Error("Task not found");

          const result = createMockArtifact(task, data.notes, options.actor ?? "operator");

          setData((prev) => ({
            ...prev,
            notes: result.notes,
            tasks: prev.tasks.map((t) =>
              result.tasks.find((updated) => updated.id === t.id) ?? t,
            ),
          }));

          return {
            workItem: result.workItem,
            artifact: result.artifact,
            vaultWritten: false,
          };
        }

        const result = await createTaskArtifactApi(taskId, options);
        await refresh();
        return {
          workItem: result.workItem,
          artifact: result.artifact,
          vaultWritten: result.vaultWritten,
        };
      } finally {
        setCreatingArtifactTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [data.notes, data.tasks, refresh],
  );

  const createMaintenanceNote = useCallback(
    async (taskId: string, options: { actor?: Persona } = {}) => {
      setCreatingMaintenanceNoteTaskIds((prev) => new Set(prev).add(taskId));

      try {
        if (!isLiveApiEnabled()) {
          throw new Error("Maintenance note creation requires the live API");
        }

        const result = await createMaintenanceNoteApi(taskId, options);
        await refresh();
        return {
          workItem: result.workItem,
          note: result.note,
          vaultWritten: result.vaultWritten,
        };
      } finally {
        setCreatingMaintenanceNoteTaskIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [refresh],
  );

  const isTaskUpdating = useCallback(
    (taskId: string) => updatingTaskIds.has(taskId),
    [updatingTaskIds],
  );

  const isArtifactCreating = useCallback(
    (taskId: string) => creatingArtifactTaskIds.has(taskId),
    [creatingArtifactTaskIds],
  );

  const isMaintenanceNoteCreating = useCallback(
    (taskId: string) => creatingMaintenanceNoteTaskIds.has(taskId),
    [creatingMaintenanceNoteTaskIds],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isLiveApiEnabled()) return undefined;

    const timer = window.setInterval(() => {
      void refresh({ soft: true });
    }, LIVE_DATA_POLL_MS);

    return () => window.clearInterval(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({
      data,
      tasks: data.tasks,
      loading,
      source,
      error,
      refresh,
      updateTaskStage,
      isTaskUpdating,
      getTaskArtifacts,
      createTaskArtifact,
      isArtifactCreating,
      getTaskMaintenanceNotes,
      createMaintenanceNote,
      isMaintenanceNoteCreating,
    }),
    [
      data,
      loading,
      source,
      error,
      refresh,
      updateTaskStage,
      isTaskUpdating,
      getTaskArtifacts,
      createTaskArtifact,
      isArtifactCreating,
      getTaskMaintenanceNotes,
      createMaintenanceNote,
      isMaintenanceNoteCreating,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export { ArtifactExistsError };
