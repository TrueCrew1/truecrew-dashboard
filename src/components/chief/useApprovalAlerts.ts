import { useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { fetchChiefApprovalDecisions, isLiveApiEnabled } from "@/lib/api/client";
import { deriveApprovalAlerts, type ApprovalAlert } from "./approvalAlerts";
import { subscribeApprovalDecisionRecorded } from "./approvalDecisionEvents";
import { buildChiefLiveContext, deriveApprovalCandidates } from "./chiefLiveContext";
import type { ApprovalDecision, ApprovalProposal } from "./types";

export interface UseApprovalAlertsResult {
  alerts: ApprovalAlert[];
  loading: boolean;
  error: string | null;
  refreshAlerts: () => void;
}

export function useApprovalAlerts(): UseApprovalAlertsResult {
  const { data } = useData();
  const liveApi = isLiveApiEnabled();

  const liveContext = useMemo(() => buildChiefLiveContext(data), [data]);
  const derivedApprovals = useMemo(
    () => deriveApprovalCandidates(data, liveContext),
    [data, liveContext],
  );

  const [decisions, setDecisions] = useState<Record<string, ApprovalDecision>>({});
  const [loading, setLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshAlerts = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  // Mock mode must never hit the live API — guarded here, same as ChiefPanel.
  useEffect(() => {
    if (!liveApi) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchChiefApprovalDecisions()
      .then((fetched) => {
        if (cancelled) return;
        setDecisions(
          Object.fromEntries(
            fetched.map((decision) => [
              decision.proposalId,
              {
                proposalId: decision.proposalId,
                status: decision.status,
                decidedAt: decision.decidedAt,
                actor: decision.actor,
              },
            ]),
          ),
        );
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load approval alerts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [liveApi, refreshToken]);

  useEffect(() => {
    if (!liveApi) return undefined;
    return subscribeApprovalDecisionRecorded(refreshAlerts);
  }, [liveApi, refreshAlerts]);

  const approvals = useMemo<ApprovalProposal[]>(() => {
    if (!liveApi) return derivedApprovals;
    return derivedApprovals.map((proposal) => {
      const decision = decisions[proposal.id];
      if (!decision) return proposal;
      return {
        ...proposal,
        status: decision.status,
        decidedAt: decision.decidedAt,
        decidedBy: decision.actor ?? undefined,
      };
    });
  }, [derivedApprovals, decisions, liveApi]);

  const alerts = useMemo(() => deriveApprovalAlerts(approvals), [approvals]);

  return { alerts, loading, error, refreshAlerts };
}
