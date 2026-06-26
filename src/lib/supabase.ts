import {
  createBrowserClient,
  createServerClient as createSupabaseServerClient,
} from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

function getSupabaseEnv(): { url: string; anonKey: string } {
  const url =
    (typeof import.meta !== "undefined" && import.meta.env?.SUPABASE_URL) ||
    process.env.SUPABASE_URL;
  const anonKey =
    (typeof import.meta !== "undefined" && import.meta.env?.SUPABASE_ANON_KEY) ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  }

  return { url, anonKey };
}

/** Browser Supabase client for auth and database access. */
export function createClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

/** Server Supabase client for auth and database access. */
export function createServerClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Pass Next.js cookie store here when wiring App Router middleware/routes.
      },
    },
  });
}

export const supabase = createClient();
