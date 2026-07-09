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
import { selectTaskMaintenanceNote } from "../../lib/maintenance/select";
import type { Artifact, Note, Persona, WorkflowStage, WorkItem } from "@/types";

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

interface DataContextValue {
  data: MockData;
  tasks: MockData["tasks"];
  loading: boolean;
  source: "mock" | "supabase" | "mock-fallback";
  error: string | null;
  refresh: () => Promise<void>;
  updateTaskStage: (taskId: string, stage: WorkflowStage) => Promise<void>;
  isTaskUpdating: (taskId: string) => boolean;
  getTaskArtifacts: (taskId: string) => Artifact[];
  createTaskArtifact: (
    taskId: string,
    options?: { useAi?: boolean; actor?: Persona },
  ) => Promise<{ workItem: WorkItem; artifact: Artifact; vaultWritten: boolean }>;
  isArtifactCreating: (taskId: string) => boolean;
  createMaintenanceNote: (
    taskId: string,
    options?: { actor?: Persona },
  ) => Promise<{ workItem: WorkItem; note: Artifact; vaultWritten: boolean }>;
  isMaintenanceNoteCreating: (taskId: string) => boolean;
  getTaskMaintenanceNote: (taskId: string) => Note | null;
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

  const refresh = useCallback(async () => {
    if (!isLiveApiEnabled()) {
      setData(mockData);
      setSource("mock");
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const live = await fetchCommandCenterData();
      const hasLiveTasks = live.tasks.length > 0;
      setData(hasLiveTasks ? (live as MockData) : mergeWithMockFallback(live));
      setSource(hasLiveTasks ? "supabase" : "mock-fallback");
      setError(null);
    } catch (err) {
      setData(mockData);
      setSource("mock-fallback");
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
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

  const getTaskMaintenanceNote = useCallback(
    (taskId: string) => selectTaskMaintenanceNote(data.notes, taskId),
    [data.notes],
  );

  useEffect(() => {
    void refresh();
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
      createMaintenanceNote,
      isMaintenanceNoteCreating,
      getTaskMaintenanceNote,
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
      createMaintenanceNote,
      isMaintenanceNoteCreating,
      getTaskMaintenanceNote,
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
