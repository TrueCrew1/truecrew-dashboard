import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockData, type MockData } from "@/data/mockData";
import {
  fetchCommandCenterData,
  isLiveApiEnabled,
  mergeWithMockFallback,
} from "@/lib/api/client";

interface DataContextValue {
  data: MockData;
  tasks: MockData["tasks"];
  loading: boolean;
  source: "mock" | "supabase" | "mock-fallback";
  error: string | null;
  refresh: () => Promise<void>;
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

  const value = useMemo(
    () => ({
      data,
      tasks: data.tasks,
      loading,
      source,
      error,
      refresh,
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
