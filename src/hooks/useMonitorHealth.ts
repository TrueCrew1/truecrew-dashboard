import { useEffect, useRef, useState } from "react";
import { apiFetch, isLiveApiEnabled } from "@/lib/api/client";
import type {
  PlatformHealthState,
  SupabaseMonitorResponse,
  VercelMonitorResponse,
} from "@/types/monitor";

const POLL_INTERVAL_MS = 45000; // 45 seconds

function useMonitorHealth() {
  const [state, setState] = useState<PlatformHealthState>({
    vercel: { data: null, loading: true, error: null },
    supabase: { data: null, loading: true, error: null },
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchVercel() {
      try {
        const response = await fetch("/api/monitor?target=vercel");
        const data = (await response.json()) as VercelMonitorResponse;
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            vercel: { data, loading: false, error: data.ok ? null : data.error ?? "Unknown error" },
          }));
        }
      } catch (err) {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            vercel: {
              data: null,
              loading: false,
              error: err instanceof Error ? err.message : "Failed to fetch Vercel health",
            },
          }));
        }
      }
    }

    async function fetchSupabase() {
      try {
        const response = await apiFetch("/api/monitor?target=supabase");
        const data = (await response.json()) as SupabaseMonitorResponse;
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            supabase: {
              data,
              loading: false,
              error: data.ok ? null : data.error ?? data.message ?? "Unknown error",
            },
          }));
        }
      } catch (err) {
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            supabase: {
              data: null,
              loading: false,
              error: err instanceof Error ? err.message : "Failed to fetch Supabase health",
            },
          }));
        }
      }
    }

    // In mock mode, don't call live endpoints
    if (!isLiveApiEnabled()) {
      setState({
        vercel: { data: null, loading: false, error: null },
        supabase: { data: null, loading: false, error: null },
      });
      return;
    }

    // Initial fetch
    void fetchVercel();
    void fetchSupabase();

    // Poll every 30-60 seconds
    const interval = setInterval(() => {
      void fetchVercel();
      void fetchSupabase();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}

export { useMonitorHealth };
