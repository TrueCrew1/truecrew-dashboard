/**
 * Safe response JSON parsing for browser API clients.
 * Prevents raw `Unexpected token '<'` / TS-module parse throws from leaking
 * into UI and console when Vite serves HTML or .ts instead of JSON.
 */

export const MOCK_API_UNAVAILABLE_CODE = "mock-api-unavailable" as const;

export class ApiUnavailableError extends Error {
  readonly code: typeof MOCK_API_UNAVAILABLE_CODE | "non_json_response";
  readonly soft: boolean;

  constructor(
    message: string,
    options?: { code?: typeof MOCK_API_UNAVAILABLE_CODE | "non_json_response"; soft?: boolean },
  ) {
    super(message);
    this.name = "ApiUnavailableError";
    this.code = options?.code ?? "non_json_response";
    this.soft = options?.soft ?? false;
  }
}

/**
 * Soft-handle non-JSON API bodies in Vite/dev (SPA HTML, TS modules).
 * Production live mode still fails clearly, but never with raw JSON.parse text.
 */
export function softHandleNonJsonApiResponses(): boolean {
  if (import.meta.env.VITE_SOFT_API_ERRORS === "true") return true;
  if (import.meta.env.VITE_SOFT_API_ERRORS === "false") return false;
  return import.meta.env.DEV === true;
}

export function isLikelyNonJsonBody(text: string, contentType: string | null): boolean {
  const trimmed = text.trimStart();
  if (!trimmed) return true;
  if (contentType?.includes("text/html")) return true;
  if (contentType?.includes("text/css")) return true;
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    return true;
  }
  // Vite often serves transformed TS modules for missing /api routes in plain `vite` mode.
  if (/^(import |export |\/\*|\/\/)/.test(trimmed)) return true;
  return false;
}

export function humanizeNonJsonApiFailure(pathHint?: string): string {
  const where = pathHint ? ` (${pathHint})` : "";
  return softHandleNonJsonApiResponses()
    ? `Endpoint not wired in this dev mode${where}. Use vercel dev (or disable VITE_USE_LIVE_API) for live JSON APIs.`
    : `API returned non-JSON${where}.`;
}

/**
 * Read a Response body as JSON without letting JSON.parse throw Unexpected token.
 */
export async function readResponseJson<T>(
  response: Response,
  options?: { pathHint?: string },
): Promise<T> {
  const contentType = response.headers.get("content-type");
  const text = await response.text();
  const soft = softHandleNonJsonApiResponses();

  if (isLikelyNonJsonBody(text, contentType)) {
    throw new ApiUnavailableError(humanizeNonJsonApiFailure(options?.pathHint), {
      code: soft ? MOCK_API_UNAVAILABLE_CODE : "non_json_response",
      soft,
    });
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiUnavailableError(humanizeNonJsonApiFailure(options?.pathHint), {
      code: soft ? MOCK_API_UNAVAILABLE_CODE : "non_json_response",
      soft,
    });
  }
}

/** Map any thrown value to a UI-safe error string (no Unexpected token leakage). */
export function formatApiErrorForUi(err: unknown, fallback: string): string {
  if (err instanceof ApiUnavailableError) return err.message;
  if (err instanceof Error) {
    const msg = err.message;
    if (/Unexpected token|is not valid JSON|JSON\.parse/i.test(msg)) {
      return humanizeNonJsonApiFailure();
    }
    return msg || fallback;
  }
  return fallback;
}
