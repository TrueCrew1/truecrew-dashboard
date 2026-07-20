export interface DailyTurnoverHealthSnapshot {
  vault: string;
  supabase: string;
  slackWebhook: string;
  githubWebhook: string;
  repoHealth: string;
}

export interface DailyTurnoverCounts {
  approvedActivity24h: number;
  failedOrBlocked24h: number;
  pendingApprovals: number | null;
  pendingApprovalsNote: string;
  queuedMissions: number;
}

export interface DailyTurnoverSnapshot {
  generatedAt: string;
  windowHours: number;
  counts: DailyTurnoverCounts;
  health: DailyTurnoverHealthSnapshot;
  dataNotes: string[];
}

export interface DailyTurnoverSlackStatus {
  configured: boolean;
  attempted: boolean;
}

export interface DailyTurnoverApiResponse {
  ok: boolean;
  generatedAt: string;
  summary: DailyTurnoverSnapshot;
  message: string;
  slack: DailyTurnoverSlackStatus;
}

export interface DailyTurnoverHistoryEntry {
  generatedAt: string;
  message: string;
  slack: DailyTurnoverSlackStatus;
  counts: DailyTurnoverCounts;
  summary: DailyTurnoverSnapshot;
  triggeredAt: string;
}
