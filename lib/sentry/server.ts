import * as Sentry from "@sentry/node";

let initialized = false;

function isServerSentryEnabled(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (process.env.VITEST === "true") return false;
  if (process.env.NODE_ENV !== "production") return false;
  return Boolean(process.env.SENTRY_DSN?.trim());
}

export function initServerSentry(): void {
  if (!isServerSentryEnabled() || initialized) return;

  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
  initialized = true;
}

export function captureTodayApiError(error: unknown, orgId?: string): void {
  if (!isServerSentryEnabled()) return;
  initServerSentry();
  Sentry.withScope((scope) => {
    scope.setTag("route", "today_work_orders");
    if (orgId) scope.setTag("org_id", orgId);
    Sentry.captureException(error);
  });
}
