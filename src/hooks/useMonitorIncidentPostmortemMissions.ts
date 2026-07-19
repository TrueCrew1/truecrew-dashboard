import { useCallback, useEffect, useState } from "react";
import {
  fetchMonitorIncidentPostmortemMissions,
  type MonitorIncidentPostmortemMissionPayload,
} from "@/lib/api/researchPostmortemMission";
import { isLiveApiEnabled } from "@/lib/api/client";

interface UseMonitorIncidentPostmortemMissionsResult {
  missions: MonitorIncidentPostmortemMissionPayload[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMonitorIncidentPostmortemMissions(
  pollMs: number | null = 15_000,
): UseMonitorIncidentPostmortemMissionsResult {
  const liveApi = isLiveApiEnabled();
  const [missions, setMissions] = useState<MonitorIncidentPostmortemMissionPayload[]>([]);
  const [loading, setLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!liveApi) {
      setMissions([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchMonitorIncidentPostmortemMissions();
      setMissions(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load postmortem missions");
    } finally {
      setLoading(false);
    }
  }, [liveApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!liveApi || !pollMs) return undefined;

    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);

    return () => window.clearInterval(timer);
  }, [liveApi, pollMs, refresh]);

  return { missions, loading, error, refresh };
}

export function postmortemMissionsByProposalId(
  missions: MonitorIncidentPostmortemMissionPayload[],
): Map<string, MonitorIncidentPostmortemMissionPayload> {
  return new Map(missions.map((mission) => [mission.proposalId, mission]));
}
