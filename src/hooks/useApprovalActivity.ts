import { useCallback, useEffect, useMemo, useState } from "react";
import { useChiefApprovals } from "@/components/chief/ChiefApprovalsContext";
import { fetchApprovalActivity, isLiveApiEnabled } from "@/lib/api/client";
import {
  buildApprovalActivityItems,
  type ApprovalActivityItem,
} from "@/lib/approvals/approvalActivityView";
import type { ApprovalActivityRecord } from "../../lib/approvals/types";

interface UseApprovalActivityResult {
  items: ApprovalActivityItem[];
  loading: boolean;
  error: string | null;
  liveApi: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_POLL_MS = 30_000;

export function useApprovalActivity(pollMs: number | null = DEFAULT_POLL_MS): UseApprovalActivityResult {
  const liveApi = isLiveApiEnabled();
  const { approvals, sessionApprovalActivity } = useChiefApprovals();
  const [vaultRecords, setVaultRecords] = useState<ApprovalActivityRecord[]>([]);
  const [loading, setLoading] = useState(liveApi);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!liveApi) {
      setVaultRecords([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const payload = await fetchApprovalActivity();
      setVaultRecords(
        payload.activity.map((record) => ({
          proposalId: record.proposalId,
          title: record.title,
          summary: record.summary,
          decision: record.decision,
          decidedAt: record.decidedAt,
          actor: record.actor,
          source: record.source ?? undefined,
          category: record.category ?? undefined,
          missionKind: record.missionKind ?? undefined,
          recordedAt: record.recordedAt,
        })),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approval activity");
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

  const items = useMemo(
    () =>
      buildApprovalActivityItems({
        approvals,
        vaultRecords: liveApi ? vaultRecords : [],
        sessionRecords: sessionApprovalActivity,
      }),
    [approvals, liveApi, sessionApprovalActivity, vaultRecords],
  );

  return { items, loading, error, liveApi, refresh };
}
