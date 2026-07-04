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
  fetchCommandCenterData,
  isLiveApiEnabled,
  mergeWithMockFallback,
  patchTaskStage,
} from "@/lib/api/client";
import type { WorkflowStage } from "@/types";

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
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MockData>(mockData);
  const [loading, setLoading] = useState(isLiveApiEnabled());
  const [source, setSource] = useState<DataContextValue["source"]>("mock");
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());

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

  const isTaskUpdating = useCallback(
    (taskId: string) => updatingTaskIds.has(taskId),
    [updatingTaskIds],
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
    }),
    [data, loading, source, error, refresh, updateTaskStage, isTaskUpdating],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
