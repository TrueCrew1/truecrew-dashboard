import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockData } from "@/data/mockData";
import { fetchTasksFromApi, isLiveApiEnabled } from "@/lib/api/client";
import type { Task } from "@/types";

interface DataContextValue {
  tasks: Task[];
  loading: boolean;
  source: "mock" | "supabase" | "mock-fallback";
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(mockData.tasks);
  const [loading, setLoading] = useState(isLiveApiEnabled());
  const [source, setSource] = useState<DataContextValue["source"]>("mock");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!isLiveApiEnabled()) {
      setTasks(mockData.tasks);
      setSource("mock");
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const liveTasks = await fetchTasksFromApi();
      setTasks(liveTasks.length > 0 ? liveTasks : mockData.tasks);
      setSource(liveTasks.length > 0 ? "supabase" : "mock-fallback");
      setError(null);
    } catch (err) {
      setTasks(mockData.tasks);
      setSource("mock-fallback");
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(
    () => ({ tasks, loading, source, error, refresh }),
    [tasks, loading, source, error],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
