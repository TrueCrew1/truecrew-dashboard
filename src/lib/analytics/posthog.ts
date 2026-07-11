import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY?.trim();
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim();
const IS_TEST =
  import.meta.env.MODE === "test" || import.meta.env.VITEST === "true";
const IS_ENABLED =
  import.meta.env.PROD &&
  !IS_TEST &&
  Boolean(POSTHOG_KEY) &&
  Boolean(POSTHOG_HOST);

let initialized = false;

export function initPostHog(): void {
  if (!IS_ENABLED || initialized || !POSTHOG_KEY || !POSTHOG_HOST) return;

  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: POSTHOG_HOST,
    defaults: "2026-01-30",
    capture_pageview: false,
    autocapture: true,
    persistence: "localStorage",
    __add_tracing_headers: [window.location.host, "localhost"],
  });

  initialized = true;
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function captureTodayEvent(event: string, props: EventProps = {}): void {
  if (!IS_ENABLED || !initialized) return;
  posthog.capture(event, props);
}

export function captureEvent(event: string, props: EventProps = {}): void {
  if (!IS_ENABLED || !initialized) return;
  posthog.capture(event, props);
}

export function capturePostHogException(error: unknown): void {
  if (!IS_ENABLED || !initialized) return;
  posthog.captureException(error);
}
