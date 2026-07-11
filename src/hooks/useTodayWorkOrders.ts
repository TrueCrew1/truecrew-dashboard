import { useCallback, useEffect, useRef, useState } from "react";
import { captureTodayEvent, capturePostHogException } from "@/lib/analytics/posthog";
import { isLiveApiEnabled } from "@/lib/api/client";
import { loadTodayWorkOrders } from "@/lib/api/todayWorkOrders";
import { captureTodayClientError } from "@/lib/sentry/client";
import type { TodayWorkOrdersResponse } from "@/types/todayWorkOrders";

export type TodayWorkOrdersState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "empty"; data: TodayWorkOrdersResponse }
  | { status: "ready"; data: TodayWorkOrdersResponse };

export function isTodayWorkOrdersEmpty(data: TodayWorkOrdersResponse): boolean {
  if (data.meta.empty === true) return true;
  return (
    data.work_order_rows.length === 0 && data.needs_attention_items.length === 0
  );
}

function toPageState(data: TodayWorkOrdersResponse): TodayWorkOrdersState {
  return isTodayWorkOrdersEmpty(data)
    ? { status: "empty", data }
    : { status: "ready", data };
}

export function useTodayWorkOrders(): {
  state: TodayWorkOrdersState;
  retry: () => Promise<void>;
} {
  const [state, setState] = useState<TodayWorkOrdersState>({ status: "loading" });
  const mountedRef = useRef(true);

  const retry = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const data = await loadTodayWorkOrders();
      if (mountedRef.current) {
        setState(toPageState(data));
      }
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err instanceof Error ? err.message : "Failed to load today's work orders";
        setState({
          status: "error",
          error: message,
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void retry();
    return () => {
      mountedRef.current = false;
    };
  }, [retry]);

  useEffect(() => {
    if (state.status === "loading") return;

    if (state.status === "error") {
      captureTodayEvent("today_dashboard_error", {
        error_message: state.error,
        is_live_api: isLiveApiEnabled(),
      });
      capturePostHogException(new Error(state.error));
      captureTodayClientError(new Error(state.error), {
        message: state.error,
      });
      return;
    }

    const orgId = state.data.org_context.org_id;
    const isLiveApi = isLiveApiEnabled();

    captureTodayEvent("today_dashboard_loaded", {
      board_state: state.status,
      is_live_api: isLiveApi,
      org_id: orgId,
    });

    if (state.status === "empty") {
      captureTodayEvent("today_dashboard_empty_state", {
        is_live_api: isLiveApi,
        org_id: orgId,
      });
    }
  }, [state]);

  return { state, retry };
}
