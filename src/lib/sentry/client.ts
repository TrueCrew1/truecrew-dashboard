import * as Sentry from "@sentry/react";

const TODAY_ROUTE_CONTEXT_KEY = "today_route";

let initialized = false;

function isSentryEnabled(): boolean {
  if (import.meta.env.MODE === "test") return false;
  if (import.meta.env.VITEST === "true") return false;
  if (!import.meta.env.PROD) return false;
  return Boolean(import.meta.env.VITE_SENTRY_DSN?.trim());
}

export function initClientSentry(): void {
  if (!isSentryEnabled() || initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });
  initialized = true;
}

export function setTodayRouteSentryContext(orgId?: string): void {
  if (!isSentryEnabled()) return;
  initClientSentry();
  Sentry.getCurrentScope().setContext(TODAY_ROUTE_CONTEXT_KEY, {
    route: "today_work_orders",
    ...(orgId ? { org_id: orgId } : {}),
  });
}

export function clearTodayRouteSentryContext(): void {
  if (!isSentryEnabled()) return;
  Sentry.getCurrentScope().setContext(TODAY_ROUTE_CONTEXT_KEY, null);
}

export function captureTodayClientError(
  error: unknown,
  context?: { orgId?: string; message?: string },
): void {
  if (!isSentryEnabled()) return;
  initClientSentry();
  Sentry.withScope((scope) => {
    scope.setTag("route", "today_work_orders");
    if (context?.orgId) scope.setTag("org_id", context.orgId);
    if (context?.message) scope.setExtra("message", context.message);
    Sentry.captureException(error);
  });
}
