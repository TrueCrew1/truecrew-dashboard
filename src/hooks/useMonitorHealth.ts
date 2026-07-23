import { useEffect, useRef, useState } from "react";
import { apiFetch, isLiveApiEnabled } from "@/lib/api/client";
import type {
  PlatformHealthState,
  SupabaseMonitorResponse,
  VercelMonitorResponse,
} from "@/types/monitor";

const POLL_INTERVAL_MS = 45000; // 45 seconds

const AUTH_HINT =
  "Unauthorized — set VITE_INTERNAL_KEY to match INTERNAL_API_SECRET (see .env.example).";

/** Parse monitor JSON + HTTP status into card data/error (testable). */
export function resolveMonitorProbeResult<
  T extends { ok?: boolean; error?: string; message?: string },
>(response: { ok: boolean; status: number }, body: T, fallbackError: string): {
  data: T | null;
  error: string | null;
} {
  if (response.status === 401) {
    return { data: null, error: AUTH_HINT };
  }

  if (!response.ok) {
    return {
      data: null,
      error: body.error ?? body.message ?? `Monitor request failed (${response.status})`,
    };
  }

  if (body.ok === true) {
    return { data: body, error: null };
  }

  return {
    data: body,
    error: body.error ?? body.message ?? fallbackError,
  };
}

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
        const response = await apiFetch("/api/monitor?target=vercel");
        const data = (await response.json()) as VercelMonitorResponse;
        if (!mountedRef.current) return;
        const resolved = resolveMonitorProbeResult(response, data, "Unknown Vercel monitor error");
        setState((prev) => ({
          ...prev,
          vercel: {
            data: resolved.data,
            loading: false,
            error: resolved.error,
          },
        }));
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
        if (!mountedRef.current) return;
        const resolved = resolveMonitorProbeResult(
          response,
          data,
          "Unknown Supabase monitor error",
        );
        setState((prev) => ({
          ...prev,
          supabase: {
            data: resolved.data,
            loading: false,
            error: resolved.error,
          },
        }));
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
