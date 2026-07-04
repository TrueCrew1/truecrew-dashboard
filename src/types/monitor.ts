/**
 * Types for platform health monitor endpoints
 */

// Vercel monitor response
export interface VercelDeploymentSummary {
  state: string;
  createdAt: string;
}

export interface VercelMonitorResponse {
  ok: boolean;
  latest?: {
    state: string;
    createdAt: string;
    url: string;
  };
  recent: VercelDeploymentSummary[];
  error?: string;
}

// Supabase monitor response
export interface SupabaseMonitorResponse {
  ok: boolean;
  db_reachable?: boolean;
  connection_count?: number;
  active_connections?: number;
  table_stats?: unknown;
  slow_queries?: null;
  error?: string;
  message?: string;
}

// Combined health state
export interface PlatformHealthState {
  vercel: {
    data: VercelMonitorResponse | null;
    loading: boolean;
    error: string | null;
  };
  supabase: {
    data: SupabaseMonitorResponse | null;
    loading: boolean;
    error: string | null;
  };
}
