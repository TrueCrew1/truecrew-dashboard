import { useCallback, useEffect, useState } from "react";
import {
  fetchProjectSummaryHandoffMissions,
  type ProjectSummaryHandoffMissionPayload,
} from "@/lib/api/researchMission";
import { isLiveApiEnabled } from "@/lib/api/client";

interface UseProjectSummaryHandoffMissionsResult {
  missions: ProjectSummaryHandoffMissionPayload[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjectSummaryHandoffMissions(
  pollMs: number | null = 15_000,
): UseProjectSummaryHandoffMissionsResult {
  const liveApi = isLiveApiEnabled();
  const [missions, setMissions] = useState<ProjectSummaryHandoffMissionPayload[]>([]);
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
      const next = await fetchProjectSummaryHandoffMissions();
      setMissions(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load missions");
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

export function missionForProject(
  missions: ProjectSummaryHandoffMissionPayload[],
  projectId: string,
): ProjectSummaryHandoffMissionPayload | undefined {
  return missions.find((mission) => mission.projectId === projectId);
}
