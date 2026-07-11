import { todayWorkOrdersMock } from "@/data/todayWorkOrdersMock";
import { isLiveApiEnabled } from "@/lib/api/client";
import { parseTodayWorkOrdersResponse } from "@/lib/api/parseTodayWorkOrdersResponse";
import type { TodayWorkOrdersResponse } from "@/types/todayWorkOrders";

const TODAY_WORK_ORDERS_PATH = "/api/today/work-orders";

function readApiErrorMessage(body: unknown, status: number): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.length > 0) {
    return body.error;
  }
  if (isRecord(body) && typeof body.message === "string" && body.message.length > 0) {
    return body.message;
  }
  return `Today work orders API returned ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchTodayWorkOrdersFromApi(): Promise<TodayWorkOrdersResponse> {
  const response = await fetch(TODAY_WORK_ORDERS_PATH);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readApiErrorMessage(body, response.status));
  }

  return parseTodayWorkOrdersResponse(body);
}

/**
 * Page-level loader for the Today work-orders read model.
 *
 * Mock mode (`VITE_USE_LIVE_API` unset or not `"true"`): typed fixture.
 * Live mode: `GET /api/today/work-orders` with runtime response validation.
 */
export async function loadTodayWorkOrders(): Promise<TodayWorkOrdersResponse> {
  if (!isLiveApiEnabled()) {
    return todayWorkOrdersMock;
  }

  return fetchTodayWorkOrdersFromApi();
}
