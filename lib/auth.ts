import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const HEADER_NAME = "x-internal-key";

function safeCompare(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
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

  if (!expected) {
    console.error("INTERNAL_API_SECRET is not configured — rejecting request");
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  const header = req.headers[HEADER_NAME];
  const provided = Array.isArray(header) ? header[0] : header;

  if (!provided || !safeCompare(provided, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}
