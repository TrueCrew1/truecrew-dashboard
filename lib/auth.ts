import { createHash, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const HEADER_NAME = "x-internal-key";

function safeCompare(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

// TEMPORARY DIAGNOSTIC — hash-only, never logs raw values. Remove after debugging.
function diagHash(value: string | undefined): { present: boolean; length?: number; hash8?: string } {
  if (!value) return { present: false };
  return {
    present: true,
    length: value.length,
    hash8: createHash("sha256").update(value).digest("hex").slice(0, 8),
  };
}

/**
 * Guards internal API routes with a shared secret header.
 *
 * Fails closed: if INTERNAL_API_SECRET is not configured, all requests
 * are rejected with 401. Returns true when the request is authorized;
 * otherwise sends the 401 response and returns false.
 *
 * Not applied to /api/github/webhook, which authenticates via HMAC
 * signature verification instead.
 */
export function requireInternalAuth(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  const expected = process.env.INTERNAL_API_SECRET;
  console.log("[diag] expected:", diagHash(expected)); // TEMPORARY DIAGNOSTIC

  if (!expected) {
    console.error("INTERNAL_API_SECRET is not configured — rejecting request");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  const header = req.headers[HEADER_NAME];
  const provided = Array.isArray(header) ? header[0] : header;
  console.log("[diag] provided:", diagHash(provided)); // TEMPORARY DIAGNOSTIC

  if (!provided || !safeCompare(provided, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}
