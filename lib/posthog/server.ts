import { PostHog } from "posthog-node";
import type { IncomingMessage } from "node:http";

const KEY = process.env.VITE_POSTHOG_API_KEY;
const HOST = process.env.VITE_POSTHOG_HOST;

export function createPostHogClient(): PostHog | null {
  if (!KEY || !HOST) return null;
  return new PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0 });
}

export function getPostHogContext(req: IncomingMessage): {
  distinctId: string | undefined;
  sessionId: string | undefined;
} {
  const distinctId =
    (Array.isArray(req.headers["x-posthog-distinct-id"])
      ? req.headers["x-posthog-distinct-id"][0]
      : req.headers["x-posthog-distinct-id"]) ?? undefined;
  const sessionId =
    (Array.isArray(req.headers["x-posthog-session-id"])
      ? req.headers["x-posthog-session-id"][0]
      : req.headers["x-posthog-session-id"]) ?? undefined;
  return { distinctId, sessionId };
}
