/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POSTHOG_API_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_USE_LIVE_API?: string;
  readonly VITE_INTERNAL_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
