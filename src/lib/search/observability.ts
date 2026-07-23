import type { SearchLogEvent } from "./types";

export function logSearchEvent(event: SearchLogEvent): void {
  const payload = {
    ...event,
    at: new Date().toISOString(),
  };

  if (event.event === "failure") {
    console.error("[command-search]", payload);
    return;
  }

  console.info("[command-search]", payload);
}
