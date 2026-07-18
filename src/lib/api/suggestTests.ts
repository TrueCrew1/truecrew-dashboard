/**
 * Client for the advisory Builder test-suggestion API.
 * Does not record approvals or trigger deploys.
 */

export interface SuggestTestsRequest {
  title: string;
  summary: string;
  recommendedAction?: string;
  riskNote?: string;
  checklistLabels?: string[];
}

export interface SuggestTestsResponse {
  text: string;
  suggestions: string[];
  lane: "builder";
  complexity: "medium";
  advisoryOnly: true;
}

function internalAuthHeaders(): HeadersInit {
  const key = import.meta.env.VITE_INTERNAL_KEY;
  return key ? { "x-internal-key": key } : {};
}

export async function fetchBuildTestSuggestions(
  input: SuggestTestsRequest,
): Promise<SuggestTestsResponse> {
  const response = await fetch("/api/llm/suggest-tests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...internalAuthHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let detail = `Suggest-tests API returned ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) detail = payload.error;
    } catch {
      // keep status message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<SuggestTestsResponse>;
}
