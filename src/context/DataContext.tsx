import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockData, type MockData } from "@/data/mockData";
import {
  advanceTaskStage as advanceTaskStageApi,
  fetchCommandCenterData,
  isLiveApiEnabled,
  mergeWithMockFallback,
} from "@/lib/api/client";
import type { WorkflowStage } from "@/types";

interface DataContextValue {
  data: MockData;
  tasks: MockData["tasks"];
  loading: boolean;
  source: "mock" | "supabase" | "mock-fallback";
  error: string | null;
  refresh: () => Promise<void>;
  advanceTaskStage: (taskId: string, stage: WorkflowStage) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MockData>(mockData);
  const [loading, setLoading] = useState(isLiveApiEnabled());
  const [source, setSource] = useState<DataContextValue["source"]>("mock");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
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
  };

  useEffect(() => {
    void refresh();
  }, []);

  const advanceTaskStage = async (taskId: string, stage: WorkflowStage) => {
    if (!isLiveApiEnabled()) {
      const updatedAt = new Date().toISOString();
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? { ...task, stage, updatedAt } : task,
        ),
        workflows: prev.workflows.map((workflow) =>
          workflow.linkedTaskIds.includes(taskId)
            ? { ...workflow, stage, updatedAt }
            : workflow,
        ),
      }));
      return;
    }

    await advanceTaskStageApi(taskId, stage);
    await refresh();
  };

  const value = useMemo(
    () => ({
      data,
      tasks: data.tasks,
      loading,
      source,
      error,
      refresh,
      advanceTaskStage,
    }),
    [data, loading, source, error],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
