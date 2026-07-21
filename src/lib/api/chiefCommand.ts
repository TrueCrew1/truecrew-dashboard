/**
 * Client for POST /api/chief/command
 */

import type {
  ChiefCommandRequestBody,
  ChiefCommandResult,
  ChiefCommandSource,
} from "../../../lib/chief/commandTypes";

export type { ChiefCommandResult, ChiefCommandSource };

export interface ChiefCommandApiResponse extends ChiefCommandResult {
  source: ChiefCommandSource | null;
  context: { page?: string; section?: string } | null;
}

function internalAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  return key ? { "x-internal-key": key } : {};
}

export async function fetchChiefCommand(
  body: ChiefCommandRequestBody,
): Promise<ChiefCommandApiResponse> {
  const response = await fetch("/api/chief/command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...internalAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = `Chief command API returned ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) detail = payload.error;
    } catch {
      // keep status message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<ChiefCommandApiResponse>;
}
