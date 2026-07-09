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
import { AGENT_APPROVAL_CARDS } from "./agentApprovalGates";
import { logChiefEvent } from "./chiefLog";
import { MOCK_PR_APPROVAL_CARDS } from "./chiefApprovalCardMocks";
import { REPO_CHANGE_APPROVAL_CARDS } from "./repoChangeApprovals";
import { APPROVAL_ACTION_DELAY_MS, approvalActionToStatus } from "./chiefApproval";
import {
  buildChiefLiveContext,
  deriveApprovalCandidates,
  mergeApprovalSources,
  type ChiefLiveContext,
} from "./chiefLiveContext";
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

export function ChiefApprovalsProvider({ children }: { children: ReactNode }) {
  const { data, source } = useData();
  const liveContext = useMemo(() => buildChiefLiveContext(data), [data]);
  const derivedApprovals = useMemo(
    () => deriveApprovalCandidates(data, liveContext),
    [data, liveContext],
  );

  // Seeded with demo PR cards (chiefApprovalCardMocks.ts), the one real
  // wired source (pending local repo changes, repoChangeApprovals.ts), and
  // one example request per agent (agentApprovalGates.ts) — so every
  // approval, from any source or surface, routes through this one shared
  // queue. See agentApprovalGates.ts's header and docs/AGENT_WORKFLOW.md
  // for the single-queue rule this preserves.
  const [commandApprovals, setCommandApprovals] = useState<ApprovalProposal[]>([
    ...MOCK_PR_APPROVAL_CARDS,
    ...REPO_CHANGE_APPROVAL_CARDS,
    ...AGENT_APPROVAL_CARDS,
  ]);
  const [approvalDecisions, setApprovalDecisions] = useState<Record<string, ApprovalDecision>>({});
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  const liveApi = isLiveApiEnabled();
  const [decisionsHydrated, setDecisionsHydrated] = useState(!liveApi);

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
      })
      .catch(() => {
        // Leave previously hydrated/optimistic decisions in place — a failed
        // refetch shouldn't erase decisions the operator already recorded.
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
    // Single choke point for every operator decision recorded via
    // recordDecision (live, mock, and conflict paths all land here).
    logChiefEvent({
      kind: "approval",
      phase: "decision",
      proposalId: decision.proposalId,
      action: decision.status,
    });
  }, []);

  const approvals = useMemo(() => {
    const merged = mergeApprovalSources(derivedApprovals, commandApprovals);
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
  }, [derivedApprovals, commandApprovals, approvalDecisions]);

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
  }, []);

  const addHistoryEntry = useCallback((entry: CommandHistoryEntry) => {
    setHistory((prev) => [entry, ...prev]);
  }, []);

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
      return decision;
    },
    [liveApi, applyDecision],
  );

  const value = useMemo<ChiefApprovalsContextValue>(
    () => ({
      liveContext,
      approvals,
      pendingApprovalCount,
      proposalsById,
      decisionsHydrated,
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
