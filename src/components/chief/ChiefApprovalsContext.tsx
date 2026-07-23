import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useData } from "@/context/DataContext";
import {
  ChiefApprovalConflictError,
  fetchChiefApprovalDecisions,
  isLiveApiEnabled,
  recordChiefApprovalDecision,
} from "@/lib/api/client";
import { getSeedApprovalCards } from "./chiefApprovalSeeds";
import { APPROVAL_ACTION_DELAY_MS, approvalActionToStatus } from "./chiefApproval";
import {
  emitApprovalDecisionRecorded,
  emitApprovalProposalCreated,
} from "./chiefGovernanceEvents";
import { loadSessionState, saveSessionState } from "./chiefSessionStorage";
import { buildChiefLiveContext, type ChiefLiveContext } from "./chiefLiveContext";
import { deriveApprovalCandidates, mergeApprovalSources } from "./chiefApprovalBoard";
import { deriveResearchStartApprovals } from "./researchStartApprovals";
import { useResearchRequests } from "@/context/ResearchRequestsContext";
import type {
  ApprovalAction,
  ApprovalDecision,
  ApprovalProposal,
  CommandHistoryEntry,
} from "./types";

interface ChiefApprovalsContextValue {
  liveContext: ChiefLiveContext;
  /** Fully merged, decision-applied approval queue — the one source both ChiefPanel and the homepage panel read. */
  approvals: ApprovalProposal[];
  pendingApprovalCount: number;
  proposalsById: Map<string, ApprovalProposal>;
  decisionsHydrated: boolean;
  /** Set when the last saved-decisions refresh failed; cleared on the next successful one. Approvals shown may not reflect current server state while this is set. */
  decisionsHydrationError: string | null;
  liveApi: boolean;
  addCommandApproval: (proposal: ApprovalProposal) => void;
  /** Shared command history — the one source both ChiefPanel's History tab and the homepage panel's intake write to. */
  history: CommandHistoryEntry[];
  addHistoryEntry: (entry: CommandHistoryEntry) => void;
  /**
   * Records an approve/reject/send-back decision against the shared
   * queue. Callers that render per-action UI feedback (loading/success/
   * error — e.g. ChiefPanel's approve/reject buttons) still own that
   * transient state locally; this only owns the decision record itself,
   * so every surface reading `approvals` sees the same thing.
   */
  recordDecision: (id: string, action: ApprovalAction) => Promise<ApprovalDecision>;
}

const ChiefApprovalsContext = createContext<ChiefApprovalsContextValue | null>(null);

/** Bump the suffix if the persisted decision shape ever changes incompatibly. */
const APPROVAL_DECISIONS_STORAGE_KEY = "chief.approvalDecisions.v1";

const APPROVAL_ACTION_VALUES: ReadonlySet<string> = new Set([
  "approved",
  "rejected",
  "sent_back",
]);

function isApprovalDecision(value: unknown): value is ApprovalDecision {
  if (!value || typeof value !== "object") return false;
  const decision = value as Record<string, unknown>;
  return (
    typeof decision.proposalId === "string" &&
    typeof decision.status === "string" &&
    APPROVAL_ACTION_VALUES.has(decision.status) &&
    typeof decision.decidedAt === "string" &&
    (decision.actor === null || typeof decision.actor === "string")
  );
}

function isApprovalDecisionRecord(value: unknown): value is Record<string, ApprovalDecision> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(isApprovalDecision)
  );
}

export function ChiefApprovalsProvider({ children }: { children: ReactNode }) {
  const { data, source } = useData();
  const { allRequests: researchRequests, updateRequestStatus } = useResearchRequests();
  const liveContext = useMemo(() => buildChiefLiveContext(data), [data]);
  // Derived dashboard signals only on the live Supabase rail — mock-rail
  // Acme/Billing demo ops must not surface as actionable approvals.
  const derivedApprovals = useMemo(
    () => (source === "supabase" ? deriveApprovalCandidates(data, liveContext) : []),
    [data, liveContext, source],
  );

  // One card per queued research request, on both rails — the research queue
  // is real on either (live DB rows, or adapter/session rows), unlike the
  // mock ops data gated above. Approving releases the row to in_progress.
  const researchStartApprovals = useMemo(
    () => deriveResearchStartApprovals(researchRequests),
    [researchRequests],
  );

  // Static demo seeds are intentionally empty (see chiefApprovalSeeds.ts).
  // Session proposals from Chief commands append via addCommandApproval.
  const [commandApprovals, setCommandApprovals] =
    useState<ApprovalProposal[]>(getSeedApprovalCards);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalDecision>>(
    () => loadSessionState(APPROVAL_DECISIONS_STORAGE_KEY, isApprovalDecisionRecord) ?? {},
  );
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  // Persist decisions so approved/rejected/sent-back outcomes (and the
  // pending counts derived from them) survive a reload. The live-API path
  // still wins on the next successful fetch below — this only bridges the
  // gap before that fetch resolves, and is the only state this restores.
  useEffect(() => {
    saveSessionState(APPROVAL_DECISIONS_STORAGE_KEY, approvalDecisions);
  }, [approvalDecisions]);

  const liveApi = isLiveApiEnabled();
  const [decisionsHydrated, setDecisionsHydrated] = useState(!liveApi);
  const [decisionsHydrationError, setDecisionsHydrationError] = useState<string | null>(null);

  useEffect(() => {
    if (!liveApi) return;

    let cancelled = false;
    setDecisionsHydrated(false);

    fetchChiefApprovalDecisions()
      .then((decisions) => {
        if (cancelled) return;
        setApprovalDecisions(
          Object.fromEntries(
            decisions.map((decision) => [
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
        setDecisionsHydrationError(null);
      })
      .catch((error: unknown) => {
        // Leave previously hydrated/optimistic decisions in place — a failed
        // refetch shouldn't erase decisions the operator already recorded.
        // Surface the failure so the operator knows the list may be stale
        // rather than silently trusting an unrefreshed queue.
        if (cancelled) return;
        setDecisionsHydrationError(
          error instanceof Error ? error.message : "Failed to refresh saved decisions",
        );
      })
      .finally(() => {
        if (!cancelled) setDecisionsHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [liveApi, source]);

  const applyDecision = useCallback((decision: ApprovalDecision) => {
    setApprovalDecisions((prev) => ({ ...prev, [decision.proposalId]: decision }));
  }, []);

  const approvals = useMemo(() => {
    const merged = mergeApprovalSources(derivedApprovals, researchStartApprovals, commandApprovals);
    return merged.map((proposal) => {
      const decision = approvalDecisions[proposal.id];
      if (!decision) return proposal;
      return {
        ...proposal,
        status: decision.status,
        decidedAt: decision.decidedAt,
        decidedBy: decision.actor ?? undefined,
      };
    });
  }, [derivedApprovals, researchStartApprovals, commandApprovals, approvalDecisions]);

  const pendingApprovalCount = useMemo(
    () => approvals.filter((proposal) => proposal.status === "pending").length,
    [approvals],
  );

  const proposalsById = useMemo(
    () => new Map(approvals.map((proposal) => [proposal.id, proposal])),
    [approvals],
  );

  const addCommandApproval = useCallback((proposal: ApprovalProposal) => {
    setCommandApprovals((prev) => [proposal, ...prev]);
    // ADR-001: observability-only emit; must not block enqueue.
    emitApprovalProposalCreated(proposal.id, proposal.createdAt);
  }, []);

  const addHistoryEntry = useCallback((entry: CommandHistoryEntry) => {
    setHistory((prev) => [entry, ...prev]);
  }, []);

  // Approval → research bridge (transition half; derivation half is
  // researchStartApprovals above). An approved card that carries a
  // researchRequestId releases its queue row to in_progress — the runner's
  // pickup signal. Failure to transition (already released, done, etc.) never
  // fails the decision itself: the queue row's real state wins.
  const releaseResearchRequest = useCallback(
    (proposalId: string) => {
      const requestId = proposalsById.get(proposalId)?.researchRequestId;
      if (!requestId) return;
      try {
        updateRequestStatus(requestId, "in_progress");
      } catch (error) {
        console.error("[research-rail] approval_release_failed", { requestId, error });
      }
    },
    [proposalsById, updateRequestStatus],
  );

  const recordDecision = useCallback(
    async (id: string, action: ApprovalAction): Promise<ApprovalDecision> => {
      const nextStatus = approvalActionToStatus(action);

      if (liveApi) {
        try {
          const decision = await recordChiefApprovalDecision(id, nextStatus);
          const applied: ApprovalDecision = {
            proposalId: decision.proposalId,
            status: decision.status,
            decidedAt: decision.decidedAt,
            actor: decision.actor,
          };
          applyDecision(applied);
          if (applied.status === "approved") releaseResearchRequest(id);
          // ADR-001: observability-only emit after decision persists.
          emitApprovalDecisionRecorded(
            applied.proposalId,
            applied.status,
            applied.actor,
            applied.decidedAt,
          );
          return applied;
        } catch (error) {
          if (error instanceof ChiefApprovalConflictError) {
            applyDecision(error.decision);
          }
          throw error;
        }
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, APPROVAL_ACTION_DELAY_MS);
      });
      const decision: ApprovalDecision = {
        proposalId: id,
        status: nextStatus,
        decidedAt: new Date().toISOString(),
        actor: null,
      };
      applyDecision(decision);
      if (decision.status === "approved") releaseResearchRequest(id);
      // ADR-001: observability-only emit after local decision applies.
      emitApprovalDecisionRecorded(
        decision.proposalId,
        decision.status,
        decision.actor,
        decision.decidedAt,
      );
      return decision;
    },
    [liveApi, applyDecision, releaseResearchRequest],
  );

  const value = useMemo<ChiefApprovalsContextValue>(
    () => ({
      liveContext,
      approvals,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
      decisionsHydrationError,
      liveApi,
      addCommandApproval,
      recordDecision,
      history,
      addHistoryEntry,
    }),
    [
      liveContext,
      approvals,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
      decisionsHydrationError,
      liveApi,
      addCommandApproval,
      recordDecision,
      history,
      addHistoryEntry,
    ],
  );

  return (
    <ChiefApprovalsContext.Provider value={value}>{children}</ChiefApprovalsContext.Provider>
  );
}

export function useChiefApprovals() {
  const ctx = useContext(ChiefApprovalsContext);
  if (!ctx) throw new Error("useChiefApprovals must be used within ChiefApprovalsProvider");
  return ctx;
}
